"""可维护的日常路程；公开读取，写入沿用管理员登录态。"""
import re
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
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
def list_journey(session: Session = Depends(get_session)):
    return session.exec(select(JourneyEntry).order_by(JourneyEntry.created_at, JourneyEntry.id)).all()


@router.post('/api/admin/journey', response_model=JourneyEntry, status_code=201, dependencies=[Depends(require_auth)])
def create_journey(body: JourneyInput, session: Session = Depends(get_session)):
    validate(body)
    entry = JourneyEntry(**body.model_dump())
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.put('/api/admin/journey/{entry_id}', response_model=JourneyEntry, dependencies=[Depends(require_auth)])
def update_journey(entry_id: str, body: JourneyInput, session: Session = Depends(get_session)):
    validate(body)
    entry = session.get(JourneyEntry, entry_id)
    if not entry:
        raise HTTPException(404, '路程不存在')
    for key, value in body.model_dump().items():
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
