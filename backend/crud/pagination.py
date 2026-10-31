"""通用游标分页。

游标是 base64url 编码的不透明字符串，可安全放进 URL query
（避免 ``+``、``:`` 等字符被服务端/代理改写）。
调用方只关心「每页条数」和「下一页游标」，不关心底层排序字段。
"""

import base64
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import Column
from sqlmodel import Session, SQLModel, select

Page = tuple[list, str | None]


def _encode_raw(raw: str) -> str:
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def _decode_raw(token: str) -> str:
    padded = token + "=" * (-len(token) % 4)
    try:
        return base64.urlsafe_b64decode(padded).decode()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid cursor") from exc


def encode_cursor(value: str | datetime) -> str:
    return _encode_raw(value.isoformat() if isinstance(value, datetime) else value)


def decode_cursor(cursor: str, *, as_datetime: bool) -> str | datetime:
    raw = _decode_raw(cursor)
    if not as_datetime:
        return raw
    try:
        return datetime.fromisoformat(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid cursor") from exc


def paginate(
    session: Session,
    model: type[SQLModel],
    *,
    order_col: Column,
    cursor: str | None = None,
    limit: int = 10,
    descending: bool = True,
    as_datetime: bool = False,
    conditions: list | None = None,
) -> Page:
    """按 ``order_col`` 做游标分页。

    多取一条来判断是否还有下一页，避免额外的 COUNT 查询。
    """
    stmt = select(model)

    if conditions:
        stmt = stmt.where(*conditions)

    if cursor:
        cursor_value = decode_cursor(cursor, as_datetime=as_datetime)
        stmt = stmt.where(order_col < cursor_value if descending else order_col > cursor_value)

    direction = order_col.desc() if descending else order_col.asc()
    stmt = stmt.order_by(direction).limit(limit + 1)

    rows = session.exec(stmt).all()
    has_more = len(rows) > limit
    items = list(rows[:limit])
    next_cursor = (
        encode_cursor(getattr(items[-1], order_col.key))
        if has_more and items
        else None
    )
    return items, next_cursor