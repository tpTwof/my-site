from base64 import b64encode

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine
from database import get_session
from routers.auth import require_auth
from routers.journey import router

@pytest.fixture
def client():
    engine = create_engine('sqlite://', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(engine)
    app = FastAPI()
    app.include_router(router)
    def session():
        with Session(engine) as db:
            yield db
    app.dependency_overrides[get_session] = session
    with TestClient(app) as client:
        yield client
    engine.dispose()

def test_anonymous_read_only(client):
    assert client.get('/api/journey').json() == []
    assert client.post('/api/admin/journey', json={'text': 'hello'}).status_code == 401
    assert client.put('/api/admin/journey/x', json={'text': 'hello'}).status_code == 401
    assert client.delete('/api/admin/journey/x').status_code == 401

def test_round_trip(client):
    client.app.dependency_overrides[require_auth] = lambda: 'admin'
    image = 'data:image/png;base64,aGVsbG8='
    response = client.post('/api/admin/journey', json={'text': '日常\n寄语', 'image': image, 'date': '2026.11.07'})
    assert response.status_code == 201
    entry = response.json()
    assert client.get('/api/journey').json()[0]['image'] == image
    response = client.put('/api/admin/journey/' + entry['id'], json={'text': '更新', 'image': None})
    assert response.status_code == 200
    assert response.json()['image'] is None
    assert client.get('/api/journey').json()[0]['text'] == '更新'
    assert client.delete('/api/admin/journey/' + entry['id']).status_code == 204
    assert client.get('/api/journey').json() == []
    assert client.put('/api/admin/journey/x', json={'text': 'hello'}).status_code == 404


def test_compact_journey_does_not_transfer_inline_images(client):
    client.app.dependency_overrides[require_auth] = lambda: 'admin'
    photo = b'\x89PNG\r\n\x1a\n' + b'x' * (1024 * 1024)
    image = 'data:image/png;base64,' + b64encode(photo).decode('ascii')
    entry = client.post('/api/admin/journey', json={'text': 'with photo', 'image': image}).json()
    external = 'https://example.com/photo.jpg'
    client.post('/api/admin/journey', json={'text': 'external', 'image': external})
    client.post('/api/admin/journey', json={'text': 'no photo'})

    listing = client.get('/api/journey?inline_images=false')
    assert len(listing.content) < 1024
    photo_url = f"/api/journey/{entry['id']}/image"
    assert [row['image'] for row in listing.json()] == [photo_url, external, None]

    edit_url = f"/api/admin/journey/{entry['id']}"
    assert client.put(edit_url + '?keep_image=true', json={'text': 'updated'}).status_code == 200
    response = client.get(photo_url)
    assert response.headers['content-type'] == 'image/png'
    assert response.content == photo
    assert client.put(edit_url, json={'text': 'updated', 'image': None}).status_code == 200
    assert client.get(photo_url).status_code == 404

@pytest.mark.parametrize('body', [{'text': '  '}, {'text': 'x', 'image': 'javascript:alert(1)'}, {'text': 'x', 'image': 'data:image/svg+xml;base64,abc'}])
def test_rejects_bad_input(client, body):
    client.app.dependency_overrides[require_auth] = lambda: 'admin'
    assert client.post('/api/admin/journey', json=body).status_code == 422
