import re
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import get_session
from models.post import Post, PostCreate, PostListResponse, PostResponse, PostUpdate

router = APIRouter(prefix="/api/admin/posts", tags=["admin-posts"])


def _slugify(title: str) -> str:
    """从标题生成 ASCII-only URL-safe slug。

    仅保留英文字母、数字、连字符；含非 ASCII 字符（如中文）时
    回退到 UUID 短码，避免 URL 编码问题。
    """
    slug = title.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    slug = slug.strip("-")
    if not slug:
        return uuid.uuid4().hex[:8]
    return slug


@router.post("", response_model=PostResponse, status_code=201)
def create_post(body: PostCreate, session: Session = Depends(get_session)):
    """创建新文章"""
    slug = body.slug or _slugify(body.title)

    # 检查 slug 唯一性
    existing = session.exec(select(Post).where(Post.slug == slug)).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Slug '{slug}' already exists")

    now = datetime.now(timezone.utc).isoformat()
    post = Post(
        slug=slug,
        title=body.title,
        content_markdown=body.content_markdown,
        status=body.status,
        created_at=now,
        updated_at=now,
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    return PostResponse.model_validate(post)


@router.get("", response_model=PostListResponse)
def list_posts_admin(
    cursor: str | None = Query(None, description="上一页最后一条的 id"),
    limit: int = Query(10, ge=1, le=50),
    status: str | None = Query(None, description="过滤状态: draft / published"),
    session: Session = Depends(get_session),
):
    """获取所有文章列表（含草稿），按 id 游标分页"""
    stmt = select(Post).order_by(Post.id.desc()).limit(limit + 1)

    if cursor:
        stmt = stmt.where(Post.id < cursor)
    if status:
        stmt = stmt.where(Post.status == status)

    posts = session.exec(stmt).all()

    has_more = len(posts) > limit
    items = posts[:limit]
    next_cursor = items[-1].id if has_more and items else None

    return PostListResponse(
        items=[PostResponse.model_validate(p) for p in items],
        next_cursor=next_cursor,
    )


@router.get("/{post_id}", response_model=PostResponse)
def get_post_admin(post_id: str, session: Session = Depends(get_session)):
    """获取文章详情（含草稿）"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return PostResponse.model_validate(post)


@router.put("/{post_id}", response_model=PostResponse)
def update_post(
    post_id: str, body: PostUpdate, session: Session = Depends(get_session)
):
    """更新文章"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    update_data = body.model_dump(exclude_unset=True)

    # 如果更新了 slug，检查唯一性
    if "slug" in update_data and update_data["slug"] != post.slug:
        existing = session.exec(
            select(Post).where(Post.slug == update_data["slug"])
        ).first()
        if existing:
            raise HTTPException(
                status_code=409, detail=f"Slug '{update_data['slug']}' already exists"
            )

    for key, value in update_data.items():
        setattr(post, key, value)

    post.updated_at = datetime.now(timezone.utc).isoformat()
    session.add(post)
    session.commit()
    session.refresh(post)
    return PostResponse.model_validate(post)


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: str, session: Session = Depends(get_session)):
    """删除文章"""
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    session.delete(post)
    session.commit()
