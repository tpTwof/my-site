"""可维护的日常路程；公开读取，写入沿用管理员登录态。"""
import re
from base64 import b64decode
from datetime import datetime, timezone
from urllib.parse import unquote_to_bytes
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import case, literal
from sqlmodel import Field, Session, SQLModel, select

from database import get_session
from routers.auth import require_auth


class JourneyInput(SQLModel):
    text: str = Field(min_length=1, max_length=3000)
    date: str = Field(default='', max_length=40)
    image: str | None = Field(default=None, max_length=3000000)


class JourneyEntry(JourneyInput, table=True):
    id: str = Field(default_factory=lambda: str(uuid4()), primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


def validate(body: JourneyInput):
    if not body.text.strip():
        raise HTTPException(422, '请填写路程文字')
    if body.image and not re.match(r'^(https?://|/[^/]|data:image/(png|jpeg|webp|gif);base64,)', body.image):
        raise HTTPException(422, '图片须为 PNG、JPEG、WebP、GIF 或 http(s) 图片地址')


router = APIRouter(tags=['journey'])


@router.get('/api/journey', response_model=list[JourneyEntry])
def list_journey(session: Session = Depends(get_session), inline_images: bool = True):
    order = (JourneyEntry.created_at, JourneyEntry.id)
    if inline_images:
        return session.exec(select(JourneyEntry).order_by(*order)).all()

    # 在数据库中替换内嵌照片，列表查询无需把 Base64 内容传给应用。
    image = case(
        (JourneyEntry.image.startswith('data:image/'), literal('/api/journey/') + JourneyEntry.id + '/image'),
        else_=JourneyEntry.image,
    ).label('image')
    rows = session.exec(select(JourneyEntry.id, JourneyEntry.text, JourneyEntry.date, image, JourneyEntry.created_at).order_by(*order))
    return [dict(row._mapping) for row in rows]


@router.get('/api/journey/{entry_id}/image', response_class=Response)
def get_journey_image(entry_id: str, session: Session = Depends(get_session)):
    image = session.exec(select(JourneyEntry.image).where(JourneyEntry.id == entry_id)).first()
    match = re.match(r'^data:(image/(?:png|jpeg|webp|gif));base64,', image or '')
    if not match:
        raise HTTPException(404, '路程图片不存在')
    try:
        payload = b''.join(unquote_to_bytes(image[match.end():]).split())
        content = b64decode(payload + b'=' * (-len(payload) % 4), validate=True)
    except ValueError:
        raise HTTPException(404, '路程图片无法读取') from None
    return Response(content, media_type=match[1], headers={'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff'})


@router.post('/api/admin/journey', response_model=JourneyEntry, status_code=201, dependencies=[Depends(require_auth)])
def create_journey(body: JourneyInput, session: Session = Depends(get_session)):
    validate(body)
    entry = JourneyEntry(**body.model_dump())
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.put('/api/admin/journey/{entry_id}', response_model=JourneyEntry, dependencies=[Depends(require_auth)])
def update_journey(entry_id: str, body: JourneyInput, session: Session = Depends(get_session), keep_image: bool = False):
    validate(body)
    entry = session.get(JourneyEntry, entry_id)
    if not entry:
        raise HTTPException(404, '路程不存在')
    for key, value in body.model_dump(exclude={'image'} if keep_image else None).items():
        setattr(entry, key, value)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.delete('/api/admin/journey/{entry_id}', status_code=204, dependencies=[Depends(require_auth)])
def delete_journey(entry_id: str, session: Session = Depends(get_session)):
    entry = session.get(JourneyEntry, entry_id)
    if not entry:
        raise HTTPException(404, '路程不存在')
    session.delete(entry)
    session.commit()
