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

`/` 自动进入 `/home`：首次直接进入或刷新首页播放 Welcome，结束后显示 About me；站内返回首页不重播。
文章在 `/posts`，作品与联系入口分别为 `/works`、`/contact`（目前仅前端页面）。
全站使用黑白绿红配色，仅欢迎开场为白底。

首页 MY JOURNEY 支持管理员添加、编辑、删除日常文字与可选图片；登录后在首页操作，记录保存到后端数据库。

## 首页互动

- 拖动 `About me.` 的绿色句点：A 固定，其余字母拉开；句点与 e 保持间隔并一起移动，句点自身随牵引惯性横向拉长，松手后波浪回弹归位。
- 在路程节点或连线上按住鼠标左键拖动，圆点沿折线跟随鼠标；松开后沿原路线返回顶部第一个节点并消失。
- 普通悬停节点显示一圈，到达节点的移动圆点触发两圈同心环；实际最后一个节点及圆环为红色，移动圆点在最后一段路线上由绿渐变为红，返程时反向渐变。
- 支持减少动态效果偏好；标题句点也支持按住左右方向键操作。路程沿线拖动仅响应鼠标左键，节点图片仍支持键盘聚焦与触屏点按。

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
