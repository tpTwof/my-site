from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from crud import post as crud
from database import get_session
from models.post import PostDetail, PostSummaryList

router = APIRouter(prefix="/api/posts", tags=["public-posts"])


@router.get("", response_model=PostSummaryList)
def list_posts(
    cursor: str | None = Query(None, description="上一页最后一条的 created_at"),
    limit: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session),
):
    """获取已发布文章列表（游标分页，不含正文）"""
    return crud.list_published(session, cursor=cursor, limit=limit)


@router.get("/{slug}", response_model=PostDetail)
def get_post(slug: str, session: Session = Depends(get_session)):
    """获取已发布文章详情"""
    post = crud.get_published_by_slug(session, slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return crud.to_detail(post)