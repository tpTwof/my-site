# Works 与内容工作台

状态：已实施；方案先于代码编写（2026-11-15），2026-11-16 同步用户最新 UI。

## 决策

沿用 React 19、TypeScript、Vite、Tailwind、React Router、FastAPI、SQLModel 与 SQLite，不引入第二套 CMS 或托管服务。Works 从占位页升级为作品目录，交互讲解作为作品类型，另支持实验 / 项目分类。独立详情路由 `/works/:slug`，支持搜索、分类和推荐作品。

后台入口 `/admin`，登录默认进入总览。桌面固定侧栏、移动端横向导航，统一提供总览、文章、作品讲解以及返回网站入口。保留现有 Markdown 编辑器和登录会话，文章列表补齐分页。作品支持标题、稳定 slug、简介、分类、标签、推荐、草稿 / 发布、HTML 上传、预览、替换与删除。

## 内容与上传

作品元数据与静态文件均存 SQLite，数据库备份包含上传内容；新增表，不修改已有文章数据。上传支持 UTF-8 单 HTML，以及包含 index.html、相对路径 CSS / JS / 图片的 ZIP。ZIP 可带一层目录。上传大小最多 10 MiB，解压最多 25 MiB、200 个文件；拒绝路径穿越、重复路径、软链接、加密文件和非静态扩展名。校验全部成功后事务替换旧文件，失败保留原版本。发布必须有有效入口。

首个 ReAct 内容作为可审阅的内置资源包随仓库交付，首次启动一次性导入；管理员后续编辑、下架或删除不会被启动逻辑覆盖或复活。在线版本保留全部交互与真实日志，移除只在原本地目录有效的源码链接。

## 隔离与权限

所有管理接口使用现有 httpOnly Cookie 会话。公开列表、详情和资源仅暴露已发布内容。浏览器沙箱内的子资源无法依赖 SameSite Cookie，因此后台先经鉴权签发 30 分钟的随机预览凭证，数据库仅存哈希，限定单个作品只读，并在每次访问时检查原登录会话是否有效。凭证不能访问其他作品或管理写接口，登出立即失效；预览链接不用于分享。上传要求自定义请求头并限制请求体，避免跨站表单触发上传。

上传 HTML 作为独立文档嵌入 `sandbox="allow-scripts"` iframe，不允许 same-origin、弹窗、表单或顶层导航。资源响应同时设置 CSP sandbox、禁止网络连接 / 子框架 / 对象 / 表单、nosniff 与 no-store，防止绕过 iframe 直接打开上传 HTML 获取主站权限。包内传统 JS 与 CSS、内联脚本可用；不支持需后端、联网 API、外部 CDN 或依赖同源存储的页面。上传说明明确此边界。

## 接口

- `GET /api/works`：公开元数据列表；`GET /api/works/{slug}`：已发布详情。
- `GET /api/works/{slug}/files/{path}`：已发布资源。
- `GET/POST /api/admin/works`：管理列表 / 创建草稿。
- `GET/PUT/DELETE /api/admin/works/{id}`：详情 / 保存元数据 / 删除。
- `PUT /api/admin/works/{id}/package?filename=...`：原始文件上传，需 `X-Upload-Intent: work-package`。
- `GET /api/admin/works/{id}/files/{path}`：鉴权预览。
- `POST /api/admin/works/{id}/preview`：鉴权签发限时预览 URL。
- `GET /api/work-preview/{token}/{path}`：沙箱内子资源通过限时、限定作品凭证读取。
- `GET /api/admin/overview`：文章 / 作品发布与草稿计数。

## 验收

运行现有后端回归和新增作品测试，覆盖未登录、草稿隔离、上传替换、非法 ZIP、发布、删除、重复 slug、初始化幂等与安全响应头。前端执行 TypeScript + 生产构建，条件允许时浏览器验证 Works、ReAct 交互、后台上传发布、窄屏布局。部署沿用现有 nginx + systemd；无需新增存储目录，nginx 请求体上限需容纳 10 MiB 文件。

## 最新 UI 决策

遵循用户的白蓝主题调整：白色背景、蓝色主色、深蓝灰正文、红色交互反馈。Works 使用简洁中文标题与文字卡片，移除装饰图与英文口号。后台继承同一套语义配色。时间长廊彻底删除自动流星代码和样式，保留手动拖动、图片、加载反馈和首页开场。

沙箱依据：[MDN CSP sandbox](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/sandbox)。

## 验证结果（2026-11-16）

- 后端：85 项 pytest 测试通过，包含原有回归与作品生命周期、限时预览、文件校验、初始化幂等测试。Windows 沙箱无法加载 Python SSL / WMI DLL，使用同一虚拟环境在获准的沙箱外执行测试；未改动应用来绕过该环境问题。
- 前端：最新白蓝 UI 与流星删除后的 TypeScript 检查、Vite 生产构建通过；保留已有的大 bundle 提示，未将本次改动扩展为构建拆包。
- 浏览器：已验证公开 ReAct 回放与帮助面板、后台 ZIP 上传与草稿保存、隔离预览脚本、单 HTML 交互、发布、保存草稿下架、登录默认进入总览。
- 响应式：桌面 1366px、手机 390px 检查通过，手机作品集与后台无横向溢出。首页 DOM 不再生成流星图层，手动拖动命中路径保留。
- 所有验收写操作均使用独立 QA 数据库；未部署到线上服务器。
