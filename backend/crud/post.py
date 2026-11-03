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
    PostNeighbour,
    PostStatus,
    PostSummary,
    PostSummaryList,
    PostUpdate,
    PublicPostDetail,
    TagRef,
    excerpt,
    slugify,
    utcnow,
)
from models.tag import PostTag, Tag


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
    session: Session,
    *,
    cursor: str | None,
    limit: int,
    tag_slug: str | None = None,
) -> PostSummaryList:
    """公开列表：仅已发布，按 created_at 倒序。

    `tag_slug` 不为空时只返回带该标签的文章。这个条件必须进入每一次
    游标查询，否则翻页会漏数据。
    """
    conditions = [Post.status == "published"]

    if tag_slug:
        # 子查询选出该标签下的 post_id，避免 JOIN 破坏分页的 ORDER BY
        tagged = (
            select(PostTag.post_id)
            .join(Tag, Tag.id == PostTag.tag_id)
            .where(Tag.slug == tag_slug)
        )
        conditions.append(Post.id.in_(tagged))

    rows, next_cursor = paginate(
        session,
        Post,
        order_col=Post.created_at,
        cursor=cursor,
        limit=limit,
        as_datetime=True,
        conditions=conditions,
    )
    return PostSummaryList(
        items=to_summaries(session, rows), next_cursor=next_cursor
    )


def neighbours(session: Session, post: Post) -> tuple[Post | None, Post | None]:
    """返回 (上一篇, 下一篇)，顺序与公开列表一致（created_at 倒序）。

    「上一篇」是在列表里排在它上面的那篇，即 created_at 更晚的；
    「下一篇」是排在它下面的，即 created_at 更早的。
    只考虑已发布文章。
    """
    published = Post.status == "published"

    previous = session.exec(
        select(Post)
        .where(published, Post.created_at > post.created_at, Post.id != post.id)
        .order_by(Post.created_at.asc())
        .limit(1)
    ).first()

    following = session.exec(
        select(Post)
        .where(published, Post.created_at < post.created_at, Post.id != post.id)
        .order_by(Post.created_at.desc())
        .limit(1)
    ).first()

    return previous, following


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
        items=to_summaries(session, rows), next_cursor=next_cursor
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

    # 标签不是 Post 表的列，单独写关联表。
    # 空数组/None 会回落到默认标签「其他」。
    from crud.tag import set_post_tags  # 延迟导入，避开循环依赖

    set_post_tags(session, post.id, payload.tags)
    session.commit()

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

    tags 不传 = 不改动；传数组（含 []）= 覆盖，空数组回落到「其他」。
    """
    changes = payload.model_dump(exclude_unset=True)

    # tags 不属于 Post 表，先摘出来单独处理，否则 setattr 会报错
    tags_provided = "tags" in changes
    changes.pop("tags", None)

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

    if tags_provided:
        from crud.tag import set_post_tags  # 延迟导入，避开循环依赖

        set_post_tags(session, post.id, payload.tags)

    session.commit()
    session.refresh(post)
    return post


def delete(session: Session, post: Post) -> None:
    session.delete(post)
    session.commit()


# ──────────────────────────────────────────────
# 映射
# ──────────────────────────────────────────────
def to_summary(post: Post, tags: list[TagRef] | None = None) -> PostSummary:
    """单篇映射。批量场景请用 to_summaries，避免 N+1。"""
    return PostSummary(
        id=post.id,
        slug=post.slug,
        title=post.title,
        summary=excerpt(post.content_markdown),
        status=post.status,
        created_at=post.created_at,
        updated_at=post.updated_at,
        tags=tags or [],
    )


def to_summaries(session: Session, posts: list[Post]) -> list[PostSummary]:
    """批量映射，标签一次查完。"""
    from crud.tag import tags_for_posts  # 延迟导入，避开循环依赖

    grouped = tags_for_posts(session, [p.id for p in posts])
    return [to_summary(p, grouped.get(p.id, [])) for p in posts]


def to_detail(post: Post, tags: list[TagRef] | None = None) -> PostDetail:
    detail = PostDetail.model_validate(post)
    if tags is not None:
        detail.tags = tags
    return detail


def to_public_detail(
    post: Post,
    previous: Post | None,
    following: Post | None,
    tags: list[TagRef] | None = None,
) -> PublicPostDetail:
    """拼装公开详情，附带相邻文章与标签。"""
    detail = PublicPostDetail.model_validate(post)
    detail.tags = tags or []
    detail.previous = (
        PostNeighbour(slug=previous.slug, title=previous.title) if previous else None
    )
    detail.next = (
        PostNeighbour(slug=following.slug, title=following.title) if following else None
    )
    return detail