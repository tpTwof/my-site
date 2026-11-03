"""标签与文章↔标签关联。

为什么独立建表而不是在 posts 上存逗号字符串：
- 改标签名只改一处
- 「每个标签下多少篇」一条 GROUP BY 搞定
- 筛选走索引
- 以后能加颜色、描述等字段
"""

import re
import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel

# 默认标签：文章不填标签时自动归入这里
DEFAULT_TAG = "其他"

# 标签名长度上限（与前端输入框保持一致）
TAG_MAX_LENGTH = 20


def tag_slug(name: str) -> str:
    """标签 slug：小写、空白转连字符、保留 Unicode 字母（含中文）。

    与文章 slug 不同——文章 slug 进 URL **路径**，必须 ASCII 安全；
    标签只作为 `?tag=` 查询参数出现，保留可读性更重要。
    """
    s = name.strip().lower()
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"[^\w\-]", "", s, flags=re.UNICODE)
    return s[:64] or "other"


def normalize_tag_name(raw: str) -> str:
    """清理单个标签名：去首尾空格，压缩内部空白，截断到上限。"""
    name = re.sub(r"\s+", " ", raw.strip())
    return name[:TAG_MAX_LENGTH]


class Tag(SQLModel, table=True):
    __tablename__ = "tags"

    id: str = Field(primary_key=True)
    # 展示名，保留创建时的写法
    name: str = Field(max_length=TAG_MAX_LENGTH)
    # 归一化键，用于去重与筛选
    slug: str = Field(max_length=64, index=True, unique=True)


class PostTag(SQLModel, table=True):
    """文章 ↔ 标签关联。"""

    __tablename__ = "post_tags"

    post_id: str = Field(foreign_key="posts.id", primary_key=True)
    tag_id: str = Field(foreign_key="tags.id", primary_key=True)


# ──────────────────────────────────────────────
# 响应 schema
# ──────────────────────────────────────────────
class TagCount(SQLModel):
    """标签 + 该标签下的已发布文章数。"""

    slug: str
    name: str
    count: int


class TagList(SQLModel):
    """GET /api/tags 的响应。"""

    items: list[TagCount]
    # 已发布文章总数，供「All」使用
    total: int


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_tag_id() -> str:
    return str(uuid.uuid4())