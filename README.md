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

打开 http://localhost:5173 ，管理端在 `/admin/posts`。

---

## 文档

接口见 [docs/API-SPEC.md](docs/API-SPEC.md)，页面见 [docs/UI-SPEC.md](docs/UI-SPEC.md)，
部署见 [docs/DEPLOY.md](docs/DEPLOY.md)。