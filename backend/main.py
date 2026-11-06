from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session

from config import ConfigError, admin_password_hash, cors_origins, summary
from crud import auth as auth_crud
from database import engine, init_db
from routers import admin, auth, posts, tags, journey


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动时校验配置、建表、清理过期会话，并打印配置摘要便于排查。"""
    print(summary(), flush=True)
    # 口令哈希缺失时直接拒绝启动：否则服务能起来，但所有登录都失败，
    # 排查时看到的只是一个 401，很难联想到配置。
    try:
        admin_password_hash()
    except ConfigError as exc:
        raise RuntimeError(f"启动中止：{exc}") from exc

    init_db()
    with Session(engine) as session:
        purged = auth_crud.purge_expired(session)
    if purged:
        print(f"[auth] 清理过期会话 {purged} 条", flush=True)
    yield


app = FastAPI(
    title="个人博客 API",
    description="博客文章 CRUD 接口（管理端需登录）",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(tags.router)
app.include_router(admin.router)
app.include_router(journey.router)


@app.get("/api/home")
def home():
    """tpTwo 主页数据（暂返回基本信息，后续扩展）"""
    return {
        "site_name": "tpTwo",
        "description": "Personal website",
    }


@app.get("/")
def root():
    return {"message": "Blog API is running. Visit /docs for interactive docs."}
