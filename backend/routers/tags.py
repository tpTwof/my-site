"""
[后端 · 路由] 标签接口 —— `/api/tags`。

- GET /api/tags                 所有标签 + 各自已发布文章数
- GET /api/tags/{slug}/posts    单个标签下的文章（结构同 /api/posts）

只暴露已发布文章，草稿不参与标签统计。
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from crud import post as post_crud
from crud import tag as tag_crud
from database import get_session
from models.post import PostSummaryList
from models.tag import TagList

router = APIRouter(prefix="/api/tags", tags=["tags"])


@router.get("", response_model=TagList)
def list_tags(session: Session = Depends(get_session)):
    """标签列表，按已发布文章数降序。"""
    return tag_crud.tag_with_counts(session)


@router.get("/{slug}/posts", response_model=PostSummaryList)
def list_posts_by_tag(
    slug: str,
    cursor: str | None = Query(None, description="上一页最后一条的 created_at"),
    limit: int = Query(10, ge=1, le=50),
    session: Session = Depends(get_session),
):
    """某个标签下的已发布文章。标签不存在时 404。"""
    if tag_crud.get_by_slug(session, slug) is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return post_crud.list_published(
        session, cursor=cursor, limit=limit, tag_slug=slug
    )