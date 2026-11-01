"""管理端登录会话。

只存 token 的**哈希**，不存明文：数据库泄漏时攻击者无法直接拿去登录。
"""

from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AdminSession(SQLModel, table=True):
    __tablename__ = "admin_sessions"

    # token 的 sha256 十六进制摘要，作为主键
    token_hash: str = Field(primary_key=True, max_length=64)
    created_at: datetime = Field(default_factory=utcnow)
    expires_at: datetime = Field(index=True)