# Handoff: tpTwo 个人博客网站

**日期**: 2026-10-31  
**项目路径**: `F:\GIthub\mybolg\tptwoweb`  
**阶段**: 初始搭建完成，博客功能可用

---

## 项目概述

tpTwo 是一个个人动态网站，当前阶段仅实现博客（Posts）功能。前端 React + 后端 FastAPI，monorepo 结构。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui |
| 后端 | FastAPI + SQLModel + SQLite |
| ORM | SQLModel（SQLAlchemy + Pydantic 融合） |
| 动画 | motion/react (Framer Motion) |
| Markdown | react-markdown + remark-gfm + rehype-highlight |

## 关键文档（不要重复阅读，直接引用）

| 文档 | 路径 |
|------|------|
| API 接口规范 | `docs/API-SPEC.md` |
| UI 展示规范 | `docs/UI-SPEC.md` |
| 交互式悬停列表设计 | `docs/design/交互式悬停列表.md` |
| TextRoll 组件设计 | `docs/design/随机字母交换导航.md` |
| 交互式悬停按钮设计 | `docs/design/交互式悬停按钮.md` |
| 博客首页卡片列表设计 | `docs/design/博客首页文章卡片列表.md` |

## 已完成的工作

### 后端 (`backend/`)

- [x] FastAPI + SQLModel + SQLite 骨架
- [x] CORS 中间件（允许 localhost:5173）
- [x] 7 个博客 CRUD 接口（公开 + 管理）
- [x] `GET /api/home` 接口（返回 site_name, description）
- [x] 启动自动建表（`create_all`，IF NOT EXISTS 语义）
- [x] venv 虚拟环境（`backend/.venv/`）
- [ ] 用户认证（明确延后）
- [ ] 标签/分类（明确延后）

**启动方式**: `cd backend && .venv\Scripts\activate && uvicorn main:app --reload`

### 前端 (`frontend/`)

- [x] Vite + React + TypeScript 项目初始化
- [x] Tailwind CSS v4 + shadcn/ui 配置
- [x] 暗色模式（ThemeProvider + 自动跟随系统 + 手动切换按钮）
- [x] 导航栏（TextRoll 站名动画 + Posts 链接 + 暗色切换）
- [x] Landing 入口页（Welcome to tpTwo + InteractiveHoverButton）
- [x] HomePage（/home，暂空白占位）
- [x] Posts 文章列表页（InteractiveHoverList + 无限滚动 + API 对接）
- [x] PostDetail 文章详情页（Markdown 渲染 + GFM + 代码高亮）
- [x] API 请求封装（`src/lib/api.ts`）
- [x] TypeScript 类型定义（`src/types/post.ts`）

**启动方式**: `cd frontend && npm run dev`

### 路由结构

| 路由 | 页面 | 导航栏 |
|------|------|--------|
| `/` | Landing 入口页 | ❌ 无 |
| `/home` | tpTwo 主页（暂空白） | ✅ 有 |
| `/posts` | 博客文章列表 | ✅ 有 |
| `/posts/:slug` | 文章详情 | ✅ 有 |

### 已删除/放弃的功能

- ~~波浪字母碰撞动画~~ — 用户测试后不满意，已删除
- ~~文章封面图~~ — 用户决定舍弃
- ~~`/blog` 路由~~ — 命名错误，已改为 `/posts`

## 待处理事项

2. **代码块样式** — 用户要求保留 prose + highlight.js 原始的粗黑边框样式（CSS 覆盖已撤回）
3. **HomePage 内容** — `/home` 页面暂空白，用户说"暂时不要东西"
4. **管理后台页面** — 创建/编辑文章的 UI 尚未实现
5. **测试数据** — `backend/blog.db` 中有 4 篇测试文章（通过 API 创建的），如需清空删掉 db 文件重启即可

## 重要约定

- **数据库**: SQLite，Base64 存图片的方案已讨论但封面图功能已舍弃
- **Slug 生成**: 纯 ASCII，中文标题回退到 UUID 短码（8位）
- **分页**: 游标分页，公开列表用 `created_at` 做游标，管理列表用 `id` 做游标
- **布局宽度**: `max-w-5xl` (1024px)
- **文件组织**: 扁平按功能类型分（`models/`, `routers/`），不按领域分层
- **schemas**: 嵌入 model 文件，不单独建 `schemas/` 目录
- **utils/**: 按需创建，不预留空目录

## 用户偏好

- 初学者，需要解释技术概念
- 喜欢先写设计文档到 `docs/design/`，再写独立 demo 样例，满意后才集成到主站
- 对命名一致性敏感（前后端路由名要对应）
- 不喜欢过度工程化，倾向 YAGNI
- 中文沟通

## Suggested Skills

- `grilling` — 继续深挖下一阶段的设计决策（如管理后台、用户认证）
- `tdd` — 如果要为后端接口写测试
- `code-review` — 审查当前代码质量
- `diagnosing-bugs` — 如果遇到运行时问题
