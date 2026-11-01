"""Post 的数据库读写操作。

所有涉及 posts 表的查询/写入都集中在这里，router 只负责 HTTP 层。
"""

from datetime import datetime
import uuid

from sqlmodel import Session, select

from crud.pagination import paginate
from models.post import (
    Post,
    PostCreate,
    PostDetail,
    PostStatus,
    PostSummary,
    PostSummaryList,
    PostUpdate,
    excerpt,
    slugify,
    utcnow,
)


# ──────────────────────────────────────────────
# 读取
# ──────────────────────────────────────────────
def get_by_id(session: Session, post_id: str) -> Post | None:
    return session.get(Post, post_id)


def get_published_by_slug(session: Session, slug: str) -> Post | None:
    return session.exec(
        select(Post).where(Post.slug == slug, Post.status == "published")
    ).first()


def get_by_slug(session: Session, slug: str) -> Post | None:
    return session.exec(select(Post).where(Post.slug == slug)).first()


def list_published(
    session: Session, *, cursor: str | None, limit: int
) -> PostSummaryList:
    """公开列表：仅已发布，按 created_at 倒序。"""
    rows, next_cursor = paginate(
        session,
        Post,
        order_col=Post.created_at,
        cursor=cursor,
        limit=limit,
        as_datetime=True,
        conditions=[Post.status == "published"],
    )
    return PostSummaryList(
        items=[to_summary(row) for row in rows], next_cursor=next_cursor
    )


def list_admin(
    session: Session,
    *,
    cursor: str | None,
    limit: int,
    status: PostStatus | None = None,
) -> PostSummaryList:
    """管理列表：含草稿，按 created_at 倒序。

    NOTE: 游标只有 created_at，没有次级排序键。若两篇文章 created_at 完全
    相同，翻页时会一起被 ``created_at < cursor`` 跳过而漏掉。当前通过 HTTP
    接口创建时时间戳精确到微秒，实际不会撞；批量导入等场景需要改成
    (created_at, id) 复合游标。
    """
    rows, next_cursor = paginate(
        session,
        Post,
        order_col=Post.created_at,
        cursor=cursor,
        limit=limit,
        as_datetime=True,
        conditions=[Post.status == status] if status else None,
    )
    return PostSummaryList(
        items=[to_summary(row) for row in rows], next_cursor=next_cursor
    )


# ──────────────────────────────────────────────
# 写入
# ──────────────────────────────────────────────
class SlugTaken(Exception):
    """用户显式指定的 slug 已被占用。由 router 映射为 409。"""


def create(session: Session, payload: PostCreate) -> Post:
    """创建文章。

    slug 撞车时的行为按来源区分（与 API-SPEC 一致）：
    - 用户显式指定 → 抛 SlugTaken，router 转 409，绝不静默改名
    - 由标题自动生成 → 追加随机后缀，保证写入成功
    """
    if payload.slug:
        if get_by_slug(session, payload.slug):
            raise SlugTaken(payload.slug)
        slug = payload.slug
    else:
        slug = _auto_slug(session, payload.title)

    now = utcnow()
    post = Post(
        slug=slug,
        title=payload.title,
        content_markdown=payload.content_markdown,
        status=payload.status,
        created_at=now,
        updated_at=now,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return post


def _auto_slug(session: Session, title: str, *, exclude_id: str | None = None) -> str:
    """由标题生成 slug；撞车时追加随机后缀。

    仅用于**自动生成**场景。用户显式指定的 slug 撞车必须抛 SlugTaken，
    不走这里——否则 409 契约会被静默绕过。

    ``exclude_id``：更新时传入当前文章 id。重新生成的 slug 可能与它自己
    原有的 slug 相同，那不是冲突。
    """
    base = slugify(title)
    existing = get_by_slug(session, base)
    if existing is None or existing.id == exclude_id:
        return base
    return f"{base}-{uuid.uuid4().hex[:6]}"


def update(session: Session, post: Post, payload: PostUpdate) -> Post:
    """部分更新。

    slug 传空串表示「按标题重新生成」，与其他路径保持一致：
    重新生成后若仍撞车，由 _auto_slug 加后缀（用户已经放弃指定具体 slug）。
    """
    changes = payload.model_dump(exclude_unset=True)

    if "slug" in changes and not (changes["slug"] or "").strip():
        changes["slug"] = _auto_slug(
            session,
            changes.get("title") or post.title,
            exclude_id=post.id,
        )

    for field, value in changes.items():
        setattr(post, field, value)
    post.updated_at = utcnow()
    session.add(post)
    session.commit()
    session.refresh(post)
    return post


def delete(session: Session, post: Post) -> None:
    session.delete(post)
    session.commit()


# ──────────────────────────────────────────────
# 映射
# ──────────────────────────────────────────────
def to_summary(post: Post) -> PostSummary:
    return PostSummary(
        id=post.id,
        slug=post.slug,
        title=post.title,
        summary=excerpt(post.content_markdown),
        status=post.status,
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


def to_detail(post: Post) -> PostDetail:
    return PostDetail.model_validate(post)