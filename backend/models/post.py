import re
import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import Index
from sqlmodel import Field, SQLModel

PostStatus = Literal["draft", "published"]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    return str(uuid.uuid4())


def slugify(title: str) -> str:
    """从标题生成 ASCII-only 的 URL-safe slug。

    仅保留英文字母、数字、连字符；含非 ASCII 字符（如中文）时
    回退到 UUID 短码，避免 URL 编码问题。
    """
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    return slug or uuid.uuid4().hex[:8]


def excerpt(markdown: str, length: int = 200) -> str:
    """从 Markdown 正文提取纯文本摘要，超长截断并加省略号。

    长度按**非空白字符**计数：第 ``length`` 位若恰好是空格，
    不会因为这个空格被 ``rstrip`` 掉而导致摘要少一个字。
    """
    plain = re.sub(r"```.*?```", " ", markdown, flags=re.S)   # 代码块
    plain = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", plain)       # 图片
    plain = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", plain)    # 链接保留文字
    plain = re.sub(r"[#>*_`~-]+", " ", plain)                 # Markdown 记号
    plain = " ".join(plain.split())
    if len(plain) <= length:
        return plain

    cut = len(plain)
    counted = 0
    for i, ch in enumerate(plain):
        if not ch.isspace():
            counted += 1
        if counted > length:
            cut = i
            break
    return plain[:cut].rstrip() + "…"


# ──────────────────────────────────────────────
# 数据库表
# ──────────────────────────────────────────────
class Post(SQLModel, table=True):
    __tablename__ = "posts"
    __table_args__ = (
        Index("idx_posts_status_created", "status", "created_at"),
        Index("idx_posts_created", "created_at"),
    )

    id: str = Field(default_factory=generate_uuid, primary_key=True)
    slug: str = Field(unique=True, max_length=255, index=True)
    title: str = Field(max_length=500)
    content_markdown: str = Field(default="")
    # SQLModel 不支持 Literal 作为列类型，DB 层存 str，
    # 合法值由 PostCreate/PostUpdate 的 PostStatus 校验保证
    status: str = Field(default="draft", max_length=20)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


# ──────────────────────────────────────────────
# API Schemas
# ──────────────────────────────────────────────
class PostCreate(SQLModel):
    """POST /api/admin/posts 请求体"""
    title: str = Field(max_length=500)
    slug: str | None = Field(default=None, max_length=255)
    content_markdown: str = ""
    status: PostStatus = "draft"


class PostUpdate(SQLModel):
    """PUT /api/admin/posts/{id} 请求体（所有字段可选）"""
    title: str | None = Field(default=None, max_length=500)
    slug: str | None = Field(default=None, max_length=255)
    content_markdown: str | None = None
    status: PostStatus | None = None


class PostSummary(SQLModel):
    """列表项：不含正文，仅摘要"""
    id: str
    slug: str
    title: str
    summary: str
    status: PostStatus
    created_at: datetime
    updated_at: datetime


class PostDetail(SQLModel):
    """详情：含完整 Markdown 正文"""
    id: str
    slug: str
    title: str
    content_markdown: str
    status: PostStatus
    created_at: datetime
    updated_at: datetime


class PostSummaryList(SQLModel):
    """列表接口响应体（游标分页）"""
    items: list[PostSummary]
    next_cursor: str | None = None