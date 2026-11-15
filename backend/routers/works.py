from pathlib import PurePosixPath
import hashlib
import secrets
from datetime import timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import delete, func
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from database import get_session
from models.post import Post, utcnow
from models.work import Work, WorkFile, WorkInput, WorkView, WorkPreview
from models.admin_session import AdminSession
from routers.auth import require_auth, COOKIE_NAME
from work_packages import MAX_UPLOAD, MIME, parse_package, safe_path

router = APIRouter(prefix='/api/works', tags=['works'])
admin_router = APIRouter(prefix='/api/admin', tags=['admin-works'], dependencies=[Depends(require_auth)])
preview_router = APIRouter(prefix='/api/work-preview', tags=['work-preview'])


def require_work(session: Session, work_id: str) -> Work:
    work = session.get(Work, work_id)
    if not work:
        raise HTTPException(404, '作品不存在')
    return work


def published_work(session: Session, slug: str) -> Work:
    work = session.exec(select(Work).where(Work.slug == slug, Work.status == 'published')).first()
    if not work:
        raise HTTPException(404, '作品不存在或未发布')
    return work


def commit_work(session: Session, work: Work) -> Work:
    session.add(work)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise HTTPException(409, '这个访问路径已经存在，请更换 slug') from exc
    session.refresh(work)
    return work


@router.get('', response_model=list[WorkView])
def list_public(session: Session = Depends(get_session)):
    return session.exec(select(Work).where(Work.status == 'published').order_by(Work.featured.desc(), Work.created_at.desc())).all()


@router.get('/{slug}', response_model=WorkView)
def get_public(slug: str, session: Session = Depends(get_session)):
    return published_work(session, slug)


def file_response(session: Session, work: Work, path: str) -> Response:
    try:
        safe_path(path)
    except ValueError as exc:
        raise HTTPException(404, '资源不存在') from exc
    item = session.get(WorkFile, (work.id, path))
    if not item:
        raise HTTPException(404, '资源不存在')
    return Response(item.content, media_type=MIME[PurePosixPath(path).suffix.lower()], headers={
        'Content-Security-Policy': "sandbox allow-scripts; default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'",
        'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
    })


@router.get('/{slug}/files/{path:path}')
def public_file(slug: str, path: str, session: Session = Depends(get_session)):
    return file_response(session, published_work(session, slug), path)


@admin_router.get('/overview')
def overview(session: Session = Depends(get_session)):
    def counts(model):
        return {status: session.exec(select(func.count()).select_from(model).where(model.status == status)).one()
                for status in ('draft', 'published')}
    return {'posts': counts(Post), 'works': counts(Work)}


@admin_router.get('/works', response_model=list[WorkView])
def list_admin(session: Session = Depends(get_session)):
    return session.exec(select(Work).order_by(Work.updated_at.desc())).all()


@admin_router.post('/works', response_model=WorkView, status_code=201)
def create(body: WorkInput, session: Session = Depends(get_session)):
    if body.status == 'published':
        raise HTTPException(422, '请先保存草稿并上传 HTML，再发布')
    return commit_work(session, Work(**body.model_dump()))


@admin_router.get('/works/{work_id}', response_model=WorkView)
def get_admin(work_id: str, session: Session = Depends(get_session)):
    return require_work(session, work_id)


@admin_router.put('/works/{work_id}', response_model=WorkView)
def update(work_id: str, body: WorkInput, session: Session = Depends(get_session)):
    work = require_work(session, work_id)
    if body.status == 'published' and not work.file_count:
        raise HTTPException(422, '请先上传 HTML 或 ZIP 再发布')
    for key, value in body.model_dump().items():
        setattr(work, key, value)
    work.updated_at = utcnow()
    return commit_work(session, work)


@admin_router.put('/works/{work_id}/package', response_model=WorkView)
async def upload(work_id: str, request: Request, filename: str, session: Session = Depends(get_session)):
    work = require_work(session, work_id)
    if request.headers.get('x-upload-intent') != 'work-package':
        raise HTTPException(400, '缺少上传标识')
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > MAX_UPLOAD:
            raise HTTPException(413, '上传文件不能超过 10 MiB')
    try:
        files = parse_package(bytes(data), filename)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    session.exec(delete(WorkFile).where(WorkFile.work_id == work.id))
    for path, content in files.items():
        session.add(WorkFile(work_id=work.id, path=path, content=content))
    work.file_count = len(files)
    work.package_size = sum(map(len, files.values()))
    work.updated_at = utcnow()
    return commit_work(session, work)


@admin_router.get('/works/{work_id}/files/{path:path}')
def preview_file(work_id: str, path: str, session: Session = Depends(get_session)):
    return file_response(session, require_work(session, work_id), path)


@admin_router.post('/works/{work_id}/preview')
def create_preview(work_id: str, request: Request, response: Response, session: Session = Depends(get_session)):
    work = require_work(session, work_id)
    if not work.file_count:
        raise HTTPException(422, '请先上传页面文件')
    now = utcnow()
    session.exec(delete(WorkPreview).where(WorkPreview.expires_at <= now))
    token = secrets.token_urlsafe(32)
    session.add(WorkPreview(
        token_hash=hashlib.sha256(token.encode()).hexdigest(), work_id=work_id,
        session_hash=hashlib.sha256(request.cookies.get(COOKIE_NAME, '').encode()).hexdigest(),
        expires_at=now + timedelta(minutes=30),
    ))
    session.commit()
    response.headers['Cache-Control'] = 'no-store'
    return {'url': f'/api/work-preview/{token}/index.html'}


@preview_router.get('/{token}/{path:path}')
def preview_asset(token: str, path: str, session: Session = Depends(get_session)):
    # A scoped capability is necessary: sandboxed subresources cannot send SameSite cookies.
    # It grants read-only access to one work and dies with the login session or after 30 minutes.
    ticket = session.get(WorkPreview, hashlib.sha256(token.encode()).hexdigest())
    now = utcnow()
    if not ticket or ticket.expires_at.replace(tzinfo=timezone.utc) <= now:
        raise HTTPException(404, '预览已过期，请重新载入')
    login_session = session.get(AdminSession, ticket.session_hash)
    if not login_session or login_session.expires_at.replace(tzinfo=timezone.utc) <= now:
        raise HTTPException(404, '预览已过期，请重新登录')
    return file_response(session, require_work(session, ticket.work_id), path)


@admin_router.delete('/works/{work_id}', status_code=204)
def remove(work_id: str, session: Session = Depends(get_session)):
    work = require_work(session, work_id)
    session.exec(delete(WorkFile).where(WorkFile.work_id == work_id))
    session.exec(delete(WorkPreview).where(WorkPreview.work_id == work_id))
    session.delete(work)
    session.commit()
