# tpTwo

个人网站。当前包含博客功能：公开文章列表与详情、管理端写作与发布、单管理员登录。

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui |
| 后端 | FastAPI + SQLModel + SQLite |
| 部署 | nginx（静态文件 + `/api` 反代）+ systemd |

## 本地开发

```powershell
# 后端
cd backend
.venv\Scripts\uvicorn.exe main:app --reload

# 前端
cd frontend
npm run dev
```

浏览器打开 `http://localhost:5173`。前端一律请求相对路径 `/api/...`，
由 Vite 代理转发到 `127.0.0.1:8000`，因此开发与生产走同一条代码路径。

首次运行需要配置管理员口令，见 [docs/DEPLOY.md](../docs/DEPLOY.md)。

## 文档

| 文件 | 内容 |
|---|---|
| [API-SPEC](../docs/API-SPEC.md) | 接口契约、错误码、游标分页、slug 规则 |
| [UI-SPEC](../docs/UI-SPEC.md) | 路由表、页面结构、组件行为、配色变量 |
| [DEPLOY](../docs/DEPLOY.md) | 本地启动、生产部署、改密码、备份 |
| [design](../docs/design/) | 各组件的设计参考 |

## 测试

```powershell
cd backend
.venv\Scripts\python.exe -m pytest tests/ -q
```

## 注意

- `/api/admin/*` 需要登录，会话在 httpOnly Cookie 中。
- `backend/.env` 是配置的唯一真相来源；存在时会覆盖同名环境变量。
  服务器上不要放这个文件，否则会盖掉 systemd 注入的凭据。