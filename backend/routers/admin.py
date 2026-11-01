"""
[后端 · 路由] 管理端文章 CRUD —— `/api/admin/posts`。

整组路由挂在 `require_auth` 依赖上：未登录一律 401。
会话来源见 routers/auth.py（httpOnly Cookie）。
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from crud import post as crud
from crud.post import SlugTaken
from database import get_session
from models.post import (
    PostCreate,
    PostDetail,
    PostStatus,
    PostSummaryList,
    PostUpdate,
)
from routers.auth import require_auth

# 整个 router 统一要求登录，避免逐个端点漏挂
router = APIRouter(
    prefix="/api/admin/posts",
    tags=["admin-posts"],
    dependencies=[Depends(require_auth)],
)


def _ensure_slug_available(
    session: Session, slug: str, *, ignore_id: str | None = None
) -> None:
    existing = crud.get_by_slug(session, slug)
    if existing and existing.id != ignore_id:
        raise HTTPException(status_code=409, detail=f"Slug '{slug}' already exists")


def _require_post(session: Session, post_id: str):
    post = crud.get_by_id(session, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("", response_model=PostDetail, status_code=201)
def create_post(body: PostCreate, session: Session = Depends(get_session)):
    """创建新文章。

    slug 冲突语义由 crud 层决定：显式 slug 撞车抛 SlugTaken → 409；
    自动生成的 slug 撞车则追加后缀，仍然成功。
    """
    try:
        return crud.to_detail(crud.create(session, body))
    except SlugTaken as exc:
        raise HTTPException(
            status_code=409, detail=f"Slug '{exc.args[0]}' already exists"
        ) from exc


@router.get("", response_model=PostSummaryList)
def list_posts_admin(
    cursor: str | None = Query(None, description="上一页最后一条的 created_at"),
    limit: int = Query(10, ge=1, le=50),
    status: PostStatus | None = Query(None, description="过滤状态: draft / published"),
    session: Session = Depends(get_session),
):
    """获取所有文章列表（含草稿，不含正文）"""
    return crud.list_admin(session, cursor=cursor, limit=limit, status=status)


@router.get("/{post_id}", response_model=PostDetail)
def get_post_admin(post_id: str, session: Session = Depends(get_session)):
    """获取文章详情（含草稿）"""
    return crud.to_detail(_require_post(session, post_id))


@router.put("/{post_id}", response_model=PostDetail)
def update_post(
    post_id: str, body: PostUpdate, session: Session = Depends(get_session)
):
    """更新文章"""
    post = _require_post(session, post_id)
    if body.slug and body.slug != post.slug:
        _ensure_slug_available(session, body.slug, ignore_id=post.id)
    return crud.to_detail(crud.update(session, post, body))


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: str, session: Session = Depends(get_session)):
    """删除文章"""
    crud.delete(session, _require_post(session, post_id))