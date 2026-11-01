# tpTwo 前端

Vite + React + TypeScript + Tailwind CSS v4 + shadcn/ui（base-ui 版）。
项目整体说明见[根目录 README](../README.md)。

## 启动

```powershell
npm install
npm run dev
```

打开 http://localhost:5173 。**需要后端已在 8000 端口运行**，接口由
`vite.config.ts` 的 `server.proxy` 转发。

## 目录

```
src/
├── pages/           页面（每个路由一个）
│   └── admin/       管理端页面
├── components/      通用组件
│   └── ui/          基础组件：shadcn 生成的 + 自定义动效组件
├── lib/
│   ├── api.ts       所有后端请求（页面不直接 fetch）
│   ├── utils.ts     cn、日期格式化
│   ├── motion.ts    共用动画参数
│   └── post-display.ts  状态文案映射
└── types/           与后端 schema 对应的类型
```

## 约定

**请求全部走 `lib/api.ts`**，不要在页面里直接 `fetch`。它统一处理
`credentials: 'include'` 和 401 跳转。

**类型必须与后端同步。** `src/types/post.ts` 对应
`backend/models/post.py`，改后端 schema 时要一起改。

**每个文件开头有块注释**，说明它是什么、在哪用、关联哪些接口。

**配色走 CSS 变量。** 文章列表用 `--post-*`，定义在 `src/index.css`，
暗色模式在 `.dark` 下覆盖。

## 构建

```powershell
npm run build      # 产物在 dist/
npm run lint
```

## 开发代理

前端一律请求相对路径 `/api/...`，因此**不要**给 API 配绝对地址。开发时
`vite.config.ts` 把 `/api` 代理到 `http://127.0.0.1:8000`，生产由 nginx 反代。

这样 `localhost:5173` 和 `127.0.0.1:5173` 都能正常登录——若直连绝对地址，
页面 host 与 API host 不一致会被浏览器视为跨站，`SameSite=Lax` 的登录
Cookie 不会发送。