from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from database import get_session
from models.post import Post, PostListResponse, PostResponse

router = APIRouter(prefix="/api/posts", tags=["public-posts"])


@router.get("", response_model=PostListResponse)
def list_posts(
    cursor: str | None = Query(None, description="上一页最后一条的 created_at"),
    limit: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session),
):
    """获取已发布文章列表（游标分页，无限滚动）"""
    stmt = (
        select(Post)
        .where(Post.status == "published")
        .order_by(Post.created_at.desc())
        .limit(limit + 1)  # 多取一条用于判断是否有下一页
    )
    if cursor:
        stmt = stmt.where(Post.created_at < cursor)

    posts = session.exec(stmt).all()

    has_more = len(posts) > limit
    items = posts[:limit]
    next_cursor = items[-1].created_at if has_more and items else None

    return PostListResponse(
        items=[PostResponse.model_validate(p) for p in items],
        next_cursor=next_cursor,
    )


@router.get("/{slug}", response_model=PostResponse)
def get_post(slug: str, session: Session = Depends(get_session)):
    """获取已发布文章详情"""
    post = session.exec(
        select(Post).where(Post.slug == slug, Post.status == "published")
    ).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return PostResponse.model_validate(post)
