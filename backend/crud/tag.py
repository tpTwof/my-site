"""标签的读写。

约定：
- 所有文章**一定至少有一个标签**。不填时归入 DEFAULT_TAG（「其他」）。
- 标签名忽略大小写去重：`Java` 与 `java` 是同一个标签，展示用第一次创建时的写法。
"""

from sqlmodel import Session, func, select

from models.post import Post, TagRef
from models.tag import (
    DEFAULT_TAG,
    PostTag,
    Tag,
    TagCount,
    TagList,
    new_tag_id,
    normalize_tag_name,
    tag_slug,
)


def get_by_slug(session: Session, slug: str) -> Tag | None:
    return session.exec(select(Tag).where(Tag.slug == slug)).first()


def ensure_tag(session: Session, raw_name: str) -> Tag:
    """按名取标签，不存在就创建。

    用 slug 判重，所以 `Java` / `java` / ` JAVA ` 会落到同一个标签上，
    并沿用第一次创建时的展示名。
    """
    name = normalize_tag_name(raw_name) or DEFAULT_TAG
    slug = tag_slug(name)

    existing = get_by_slug(session, slug)
    if existing:
        return existing

    tag = Tag(id=new_tag_id(), name=name, slug=slug)
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return tag


def parse_tag_names(raw: list[str] | None) -> list[str]:
    """清洗用户提交的标签数组：去空、去重（按 slug）、保序。

    空数组或 None 一律回落到默认标签——保证文章始终有标签。
    """
    if not raw:
        return [DEFAULT_TAG]

    seen: set[str] = set()
    result: list[str] = []
    for item in raw:
        name = normalize_tag_name(item)
        if not name:
            continue
        slug = tag_slug(name)
        if slug in seen:
            continue
        seen.add(slug)
        result.append(name)

    return result or [DEFAULT_TAG]


def set_post_tags(session: Session, post_id: str, raw_names: list[str] | None) -> None:
    """覆盖文章的标签关联（先删后建）。不提交事务，由调用方统一 commit。"""
    names = parse_tag_names(raw_names)

    # 先删旧的
    old = session.exec(select(PostTag).where(PostTag.post_id == post_id)).all()
    for link in old:
        session.delete(link)
    session.flush()

    # 再建新的
    for name in names:
        tag = ensure_tag(session, name)
        session.add(PostTag(post_id=post_id, tag_id=tag.id))


def tags_for_posts(
    session: Session, post_ids: list[str]
) -> dict[str, list[TagRef]]:
    """一次查出多篇文章的标签，避免 N+1。"""
    if not post_ids:
        return {}

    rows = session.exec(
        select(PostTag.post_id, Tag.slug, Tag.name)
        .join(Tag, Tag.id == PostTag.tag_id)
        .where(PostTag.post_id.in_(post_ids))
        .order_by(Tag.name)
    ).all()

    grouped: dict[str, list[TagRef]] = {}
    for post_id, slug, name in rows:
        grouped.setdefault(post_id, []).append(TagRef(slug=slug, name=name))
    return grouped


def tags_for_post(session: Session, post_id: str) -> list[TagRef]:
    return tags_for_posts(session, [post_id]).get(post_id, [])


def tag_with_counts(session: Session) -> TagList:
    """每个标签下的已发布文章数，外加已发布文章总数。

    INNER JOIN 天然过滤掉「没有任何已发布文章」的标签，
    否则点进去会是空白页。
    """
    published = Post.status == "published"

    rows = session.exec(
        select(Tag.slug, Tag.name, func.count(Post.id).label("count"))
        .join(PostTag, PostTag.tag_id == Tag.id)
        .join(Post, Post.id == PostTag.post_id)
        .where(published)
        .group_by(Tag.id)
        .order_by(func.count(Post.id).desc(), Tag.name.asc())
    ).all()

    total = session.exec(
        select(func.count()).select_from(Post).where(published)
    ).one()

    return TagList(
        items=[TagCount(slug=s, name=n, count=c) for s, n, c in rows],
        total=total,
    )