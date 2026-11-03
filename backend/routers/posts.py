from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from crud import post as crud
from crud import tag as tag_crud
from database import get_session
from models.post import PostSummaryList, PublicPostDetail

router = APIRouter(prefix="/api/posts", tags=["public-posts"])


@router.get("", response_model=PostSummaryList)
def list_posts(
    cursor: str | None = Query(None, description="上一页最后一条的 created_at"),
    limit: int = Query(10, ge=1, le=50),
    tag: str | None = Query(None, description="按标签 slug 筛选"),
    session: Session = Depends(get_session),
):
    """获取已发布文章列表（游标分页，不含正文）。"""
    return crud.list_published(session, cursor=cursor, limit=limit, tag_slug=tag)


@router.get("/{slug}", response_model=PublicPostDetail)
def get_post(slug: str, session: Session = Depends(get_session)):
    """获取已发布文章详情，附带上一篇/下一篇（顺序与列表一致）与标签。"""
    post = crud.get_published_by_slug(session, slug)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    previous, following = crud.neighbours(session, post)
    tags = tag_crud.tags_for_post(session, post.id)
    return crud.to_public_detail(post, previous, following, tags)