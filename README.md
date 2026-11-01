# tpTwo

个人网站。目前完成博客功能：公开文章列表与详情、管理端写作与发布、单管理员登录。

之后会陆续加入其它模块。

---

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui（base-ui 版） |
| 动画 | `motion/react` |
| 后端 | FastAPI + SQLModel + SQLite |
| 部署 | 阿里云 Ubuntu + nginx + systemd + certbot |

---

## 目录结构

```
tpTwo/
├── backend/
│   ├── main.py              FastAPI 应用入口，挂载路由
│   ├── config.py            配置读取（.env / 环境变量）
│   ├── database.py          SQLite 引擎与会话
│   ├── models/              表结构 + 请求/响应 schema
│   │   ├── post.py          Post、PostSummary、PostDetail、PostCreate/Update
│   │   └── admin_session.py 登录会话
│   ├── crud/                所有数据库读写
│   │   ├── post.py          文章 CRUD、slug 生成
│   │   ├── auth.py          口令校验、会话签发/校验/吊销
│   │   └── pagination.py    游标分页
│   ├── routers/             只处理 HTTP：参数、状态码、异常映射
│   │   ├── posts.py         公开接口
│   │   ├── admin.py         管理接口（需登录）
│   │   └── auth.py          登录 / 登出 / 当前用户
│   └── tests/               pytest
├── frontend/
│   └── src/
│       ├── pages/           页面
│       ├── components/      通用组件
│       │   └── ui/          基础组件（shadcn + 自定义动效）
│       ├── lib/             请求封装、工具函数
│       └── types/           与后端 schema 对应的类型
└── docs/
    ├── API-SPEC.md          接口契约
    ├── UI-SPEC.md           路由表、页面结构、配色
    ├── DEPLOY.md            部署、改密码、备份
    └── design/              各组件设计参考
```

分层约定：**router 不碰数据库，crud 不碰 HTTP**。

---

## 路由

| 路由 | 页面 | 是否需要登录 |
|---|---|---|
| `/` | 入口页（全屏欢迎） | — |
| `/home` | 首页导航 | — |
| `/posts` | 文章列表（无限滚动） | — |
| `/posts/:slug` | 文章详情 | — |
| `/login` | 管理端登录 | — |
| `/admin/posts` | 文章管理列表 | ✅ |
| `/admin/posts/new` | 新建文章 | ✅ |
| `/admin/posts/:id/edit` | 编辑文章 | ✅ |

---

## 本地开发

### 1. 准备后端

```powershell
cd backend

# 首次：建虚拟环境并装依赖
python -m venv .venv
.venv\Scripts\pip.exe install -r requirements-dev.txt

# 配置管理员口令
copy .env.example .env
```

生成口令哈希（`getpass` 会提示输入，密码里的 `@` `$` `!` 不会被 shell 解析）：

```powershell
.venv\Scripts\python.exe -c "import hashlib,getpass;print(hashlib.sha256(getpass.getpass('密码: ').encode()).hexdigest())"
```

把输出的 64 位十六进制粘进 `.env` 的 `ADMIN_PASSWORD_HASH=`。

### 2. 启动

```powershell
# 终端一：后端
cd backend
.venv\Scripts\uvicorn.exe main:app --reload

# 终端二：前端
cd frontend
npm install
npm run dev
```

浏览器打开 **http://localhost:5173**，管理端用 `.env` 里的账号口令登录。

启动时后端会打印一行配置摘要，确认进程读到了什么：

```
[config] 来源=文件 ...\backend\.env（已覆盖同名环境变量） | ADMIN_USERNAME=tptwo | ADMIN_PASSWORD_HASH=已设置(64 位) | ...
```

### 为什么前端不用配后端地址

前端一律请求相对路径 `/api/...`，开发时由 Vite 的 `server.proxy` 转发到
`127.0.0.1:8000`，生产时由 nginx 反代。页面与 API 始终同源，登录 Cookie
不会因 host 不一致而丢失，两套环境也走同一条代码路径。

---

## 测试

```powershell
cd backend
.venv\Scripts\python.exe -m pytest tests/ -q
```

| 文件 | 覆盖 |
|---|---|
| `test_auth.py` | 登录、Cookie 属性、越权 401、登出吊销、伪造令牌、过期清理 |
| `test_slug.py` | slug 冲突 409、自动生成加后缀、清空重生成 |
| `test_config.py` | `.env` 优先级、缺失口令拒绝启动 |

---

## 部署

完整步骤见 [docs/DEPLOY.md](docs/DEPLOY.md)：systemd 单元、nginx 配置、
certbot 签发证书、发版流程、改密码、数据库备份。

---

## 需要注意

**配置来源是二选一。** `backend/.env` 存在时以它为准，并**覆盖**同名环境变量；
不存在时环境变量原样生效（生产由 systemd 的 `EnvironmentFile` 注入）。

因此 **服务器上不要放 `.env`**，否则它会盖掉 `/etc/tptwo/env` 里的凭据。
启动摘要里会明确标注当前用的是哪一个。

**口令哈希缺失时后端拒绝启动。** 这是刻意的——否则服务能起来，但所有登录
都返回 401，很难联想到是配置问题。

**管理接口需要登录。** `/api/admin/*` 全部挂在 `require_auth` 依赖上，会话
存在 `admin_sessions` 表（只存令牌的 sha256 摘要），令牌放在 httpOnly Cookie。

---

## 已知限制

- 游标分页只带 `created_at`，同一时刻创建的文章可能漏读。HTTP 创建精确到
  微秒不会撞；批量导入需要改成 `(created_at, id)` 复合游标。
- 登录接口没有速率限制。
- 管理列表一次最多拉 50 篇。