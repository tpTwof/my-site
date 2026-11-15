# tpTwo

个人博客。用 FastAPI + React 写的。

---

## 本地开发

```powershell
# 后端
cd backend
copy .env.example .env          # 填上 ADMIN_PASSWORD_HASH
.venv\Scripts\uvicorn.exe main:app --reload

# 前端
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173 ，管理端在 `/admin`（登录入口 `/login`）。

`/` 自动进入 `/home`，保留原有欢迎动画、个人介绍和时间长廊。文章在 `/posts`，作品在 `/works`，联系入口在 `/contact`。
全站以白蓝为主色，红色用于悬停、选中和焦点反馈。

时间长廊支持管理员添加、编辑、删除文字与可选图片。保留路径拖拽和悬停图片，已删除流星动画；首页保留开场动画和标题拖拽交互。

## 检查

```powershell
# frontend 目录：类型检查、生产构建与 lint
npm run build
npm run lint

# backend 目录：使用隔离测试数据库，不读取本地 .env
.venv\Scripts\python.exe -m pytest tests -q
```

---

## 文档

接口见 [docs/API-SPEC.md](docs/API-SPEC.md)，页面见 [docs/UI-SPEC.md](docs/UI-SPEC.md)，
部署见 [docs/DEPLOY.md](docs/DEPLOY.md)。

## 作品与内容工作台

Works 支持多个交互讲解、实验与项目，首个 ReAct 讲解在后端首次启动时自动导入，后续编辑或删除不会被重启覆盖。
后台可上传单 HTML 或包含 index.html 的 ZIP，保存草稿、隔离预览、发布、下架和替换页面。文章继续使用原 Markdown 编辑器。

方案与上传说明见 [docs/CONTENT-STUDIO.md](docs/CONTENT-STUDIO.md)，当前白蓝 UI 及时间长廊行为见 [docs/UI-SPEC.md](docs/UI-SPEC.md)。
