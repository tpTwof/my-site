import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _generate_uuid() -> str:
    return str(uuid.uuid4())


# ──────────────────────────────────────────────
# 数据库表
# ──────────────────────────────────────────────
class Post(SQLModel, table=True):
    __tablename__ = "posts"

    id: str = Field(default_factory=_generate_uuid, primary_key=True)
    slug: str = Field(unique=True, max_length=255, index=True)
    title: str = Field(max_length=500)
    content_markdown: str = Field(default="")
    status: str = Field(default="draft")  # draft | published
    created_at: str = Field(default_factory=_utcnow, index=True)
    updated_at: str = Field(default_factory=_utcnow)


# ──────────────────────────────────────────────
# API Schemas
# ──────────────────────────────────────────────
class PostCreate(SQLModel):
    """POST /api/admin/posts 请求体"""
    title: str
    slug: str | None = None
    content_markdown: str = ""
    status: str = "draft"


class PostUpdate(SQLModel):
    """PUT /api/admin/posts/{id} 请求体（所有字段可选）"""
    title: str | None = None
    slug: str | None = None
    content_markdown: str | None = None
    status: str | None = None


class PostResponse(SQLModel):
    """GET 接口响应体"""
    id: str
    slug: str
    title: str
    content_markdown: str | None = None
    status: str
    created_at: str
    updated_at: str


class PostListResponse(SQLModel):
    """列表接口响应体（游标分页）"""
    items: list[PostResponse]
    next_cursor: str | None = None
