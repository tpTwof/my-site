from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from routers import admin, posts


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动时自动建表"""
    init_db()
    yield


app = FastAPI(
    title="个人博客 API",
    description="博客文章 CRUD 接口",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(posts.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {"message": "Blog API is running. Visit /docs for interactive docs."}


@app.get("/api/home")
def home():
    """tpTwo 主页数据（暂返回基本信息，后续扩展）"""
    return {
        "site_name": "tpTwo",
        "description": "Personal website",
    }
