from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from crud import post as crud
from database import get_session
from models.post import PostSummaryList, PublicPostDetail

router = APIRouter(prefix="/api/posts", tags=["public-posts"])


@router.get("", response_model=PostSummaryList)
def list_posts(
    cursor: str | None = Query(None, description="上一页最后一条的 created_at"),
    limit: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session),
):
    """获取已发布文章列表（游标分页，不含正文）"""
    return crud.list_published(session, cursor=cursor, limit=limit)


@router.get("/{slug}", response_model=PublicPostDetail)
def get_post(slug: str, session: Session = Depends(get_session)):
    """获取已发布文章详情，附带上一篇/下一篇（顺序与列表一致）。"""
    post = crud.get_published_by_slug(session, slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    previous, following = crud.neighbours(session, post)
    return crud.to_public_detail(post, previous, following)