# tpTwo 前端

Vite + React + TypeScript + Tailwind + shadcn/ui。

```powershell
npm install
npm run dev
```

打开 http://localhost:5173 ，需要后端已在 8000 端口运行。

请求统一走 `src/lib/api.ts`，接口由 `vite.config.ts` 代理到后端。
项目整体说明见[根目录 README](../README.md)。