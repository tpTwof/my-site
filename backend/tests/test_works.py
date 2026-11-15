import io
import zipfile

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from database import get_session
from models.work import Work, WorkFile
from routers.auth import require_auth
from routers.works import router, admin_router, preview_router
from crud.auth import create_session, revoke_session
from models.work import WorkPreview
from datetime import timedelta
from models.post import utcnow
from seed_works import seed_works
from work_packages import parse_package, safe_path

HTML = b'<!doctype html><html><body><h1>Hello</h1><script src="app.js"></script></body></html>'
BODY = {'title': 'Demo', 'slug': 'demo', 'description': 'interactive example'}


def archive(files):
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as zip_file:
        for path, content in files.items():
            zip_file.writestr(path, content)
    return output.getvalue()


@pytest.fixture
def client():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = FastAPI()
    app.include_router(router)
    app.include_router(admin_router)
    app.include_router(preview_router)
    def session():
        with Session(engine) as db:
            yield db
    app.dependency_overrides[get_session] = session
    with TestClient(app) as client:
        yield client
    engine.dispose()


def auth(client):
    client.app.dependency_overrides[require_auth] = lambda: 'admin'


def upload(client, work_id, data=HTML, filename='demo.html'):
    return client.put(f'/api/admin/works/{work_id}/package', params={'filename': filename}, content=data,
                      headers={'X-Upload-Intent': 'work-package'})


def test_auth_on_every_management_route(client):
    for method, path in [('get', '/api/admin/works'), ('post', '/api/admin/works'),
                         ('get', '/api/admin/works/x'), ('put', '/api/admin/works/x'),
                         ('delete', '/api/admin/works/x'), ('put', '/api/admin/works/x/package?filename=x.html'),
                         ('get', '/api/admin/works/x/files/index.html'), ('get', '/api/admin/overview'),
                         ('post', '/api/admin/works/x/preview')]:
        assert getattr(client, method)(path).status_code == 401


def test_sandbox_preview_capability_is_scoped_expiring_and_revocable(client):
    auth(client)
    work_id = client.post('/api/admin/works', json=BODY).json()['id']
    other_id = client.post('/api/admin/works', json={**BODY, 'slug': 'other'}).json()['id']
    upload(client, work_id, archive({'index.html': HTML, 'app.js': b'window.demo=1'}), 'page.zip')
    upload(client, other_id, archive({'index.html': HTML, 'private.js': b'secret'}), 'other.zip')
    with next(client.app.dependency_overrides[get_session]()) as db:
        token, _ = create_session(db)
    client.cookies.set('tp_admin', token)
    preview = client.post(f'/api/admin/works/{work_id}/preview')
    assert preview.status_code == 200
    url = preview.json()['url']
    client.cookies.clear()
    assert client.get(url).content == HTML
    assert client.get(url.replace('index.html', 'app.js')).content == b'window.demo=1'
    assert client.get(url.replace('index.html', 'private.js')).status_code == 404
    assert client.get('/api/works/demo/files/index.html').status_code == 404
    with next(client.app.dependency_overrides[get_session]()) as db:
        revoke_session(db, token)
    assert client.get(url).status_code == 404
    with next(client.app.dependency_overrides[get_session]()) as db:
        token, _ = create_session(db)
    client.cookies.set('tp_admin', token)
    url = client.post(f'/api/admin/works/{work_id}/preview').json()['url']
    with next(client.app.dependency_overrides[get_session]()) as db:
        for ticket in db.exec(select(WorkPreview)).all():
            ticket.expires_at = utcnow() - timedelta(seconds=1)
            db.add(ticket)
        db.commit()
    assert client.get(url).status_code == 404
    assert client.get('/api/work-preview/forged/index.html').status_code == 404


def test_full_editorial_lifecycle_and_atomic_replacement(client):
    auth(client)
    created = client.post('/api/admin/works', json=BODY)
    assert created.status_code == 201
    work_id = created.json()['id']
    admin_url = f'/api/admin/works/{work_id}'
    assert client.put(admin_url, json={**BODY, 'status': 'published'}).status_code == 422
    assert upload(client, work_id, archive({'folder/index.html': HTML, 'folder/app.js': b'window.demo=1'}), 'demo.zip').status_code == 200
    assert client.get('/api/works').json() == []
    assert client.get('/api/works/demo').status_code == 404
    assert client.get('/api/works/demo/files/index.html').status_code == 404
    assert client.get(admin_url + '/files/index.html').content == HTML
    assert client.put(admin_url, json={**BODY, 'status': 'published'}).status_code == 200
    assert len(client.get('/api/works').json()) == 1
    response = client.get('/api/works/demo/files/index.html')
    assert response.content == HTML
    assert 'sandbox allow-scripts;' in response.headers['content-security-policy']
    assert 'allow-same-origin' not in response.headers['content-security-policy']
    assert response.headers['x-content-type-options'] == 'nosniff'
    assert response.headers['cache-control'] == 'no-store'
    assert upload(client, work_id, b'invalid', 'bad.zip').status_code == 422
    assert client.get('/api/works/demo/files/index.html').content == HTML
    assert upload(client, work_id, b'<html>replacement</html>').status_code == 200
    assert client.get('/api/works/demo/files/app.js').status_code == 404
    assert client.get('/api/works/demo/files/index.html').content == b'<html>replacement</html>'
    assert client.get('/api/admin/overview').json()['works'] == {'published': 1, 'draft': 0}
    assert client.put(admin_url, json=BODY).status_code == 200
    assert client.get('/api/works/demo/files/index.html').status_code == 404
    assert client.delete(admin_url).status_code == 204
    assert client.get(admin_url + '/files/index.html').status_code == 404


def test_validation_and_duplicate_slugs(client):
    auth(client)
    assert client.post('/api/admin/works', json={**BODY, 'title': '  '}).status_code == 422
    assert client.post('/api/admin/works', json={**BODY, 'slug': '../bad'}).status_code == 422
    assert client.post('/api/admin/works', json={**BODY, 'status': 'published'}).status_code == 422
    work_id = client.post('/api/admin/works', json=BODY).json()['id']
    assert client.post('/api/admin/works', json=BODY).status_code == 409
    assert client.put(f'/api/admin/works/{work_id}/package?filename=x.html', content=HTML).status_code == 400
    assert upload(client, work_id, b'x' * (10 * 1024 * 1024 + 1)).status_code == 413
    client.app.dependency_overrides.pop(require_auth)
    assert client.get(f'/api/admin/works/{work_id}/files/index.html').status_code == 401


@pytest.mark.parametrize('files', [
    {'../index.html': HTML}, {'/index.html': HTML},
    {'index.html': HTML, 'bad.py': b'print(1)'}, {'x.html': HTML},
    {'index.html': b'\xff'}, {'index.html': b'not an html page'},
    {'index.html': HTML, '%2e%2e/x.js': b'x'},
    {'index.html': HTML, **{f'f{i}.js': b'x' for i in range(200)}},
])
def test_reject_invalid_bundles(files):
    with pytest.raises(ValueError):
        parse_package(archive(files), 'demo.zip')


def test_backslash_paths_are_rejected_before_normalization():
    # Python's ZIP writer normalizes Windows backslashes; validate the raw input directly.
    with pytest.raises(ValueError):
        safe_path('x\\index.html')


def test_reject_symlink_and_expansion_bomb():
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w') as z:
        z.writestr('index.html', HTML)
        link = zipfile.ZipInfo('link.js')
        link.create_system = 3
        link.external_attr = 0o120777 << 16
        z.writestr(link, 'index.html')
    with pytest.raises(ValueError, match='软链接'):
        parse_package(output.getvalue(), 'demo.zip')
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr('index.html', HTML)
        z.writestr('big.js', b'x' * (25 * 1024 * 1024))
    with pytest.raises(ValueError, match='25 MiB'):
        parse_package(output.getvalue(), 'demo.zip')


def test_seed_once_preserves_edits_and_deletion():
    engine = create_engine('sqlite://')
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        seed_works(session)
        work = session.exec(select(Work)).one()
        assert work.slug == 'react-explained'
        assert len(session.exec(select(WorkFile)).all()) == 5
        work.title = 'My edited title'
        work.status = 'draft'
        session.add(work)
        session.commit()
        seed_works(session)
        assert session.exec(select(Work)).one().title == 'My edited title'
        for item in session.exec(select(WorkFile)).all():
            session.delete(item)
        session.delete(work)
        session.commit()
        seed_works(session)
        assert session.exec(select(Work)).all() == []
    engine.dispose()
