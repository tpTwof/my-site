# tpTwo 前端展示规范

## 视觉风格

- **整体风格**: 极简文字优先，大量留白，聚焦内容
- **配色**: 浅色为主（白底黑字）+ 自动暗色模式（跟随系统 `prefers-color-scheme`）+ 手动切换按钮
- **布局宽度**: `max-w-5xl` (1024px)，水平居中
- **组件库**: shadcn/ui + Tailwind CSS v4
- **技术栈**: Vite + React + TypeScript

---

## 路由结构

| 路由 | 页面 | 导航栏 | 说明 |
|------|------|--------|------|
| `/` | 入口页（Gate） | ❌ 无 | 全屏欢迎页，前置引导，点击 Enter 进入站点 |
| `/home` | 站点主页 | ✅ 有 | tpTwo 主页（暂为占位，后续放个人介绍/板块入口） |
| `/posts` | 博客列表 | ✅ 有 | 已发布文章列表，无限滚动 |
| `/posts/:slug` | 文章详情 | ✅ 有 | Markdown 渲染 |
| `/admin/posts` | 文章管理列表 | ✅ 有 | 含草稿，可过滤/编辑/删除 |
| `/admin/posts/new` | 新建文章 | ✅ 有 | 分栏编辑器 |
| `/admin/posts/:id/edit` | 编辑文章 | ✅ 有 | 分栏编辑器 |

> **入口页的语义**：`/` 是站点的「前置欢迎屏」，不是主页。用户必须点击
> Enter 按钮才进入正文站点（`/home`）。这样首页第一屏是品牌表达而非内容列表。
>
> **新增页面时**：默认都有导航栏；只有 `/` 例外（由 `AppLayout` 中的
> `isLanding` 判断控制）。

### 页面宽度

由 `AppLayout` 按路由分配，页面自己不再重复写宽度类：

| 路由 | 宽度 |
|------|------|
| `/` | 无约束（Landing 自行全屏居中） |
| `/admin/posts/{id}/edit`、`/admin/posts/new` | `max-w-[1400px]`（分栏编辑器需要宽度） |
| 其余 | `max-w-5xl` (1024px) |

---

## 管理端 (`/admin/posts`)

> ⚠️ **当前无鉴权**。部署到公网前必须加上身份验证，否则任何人可增删文章。

### 文章列表 (`/admin/posts`)

- 顶部：标题「文章管理」+ 总数 + 「新建文章」按钮
- 过滤按钮组：全部 / 已发布 / 草稿（对应 `?status=` 参数）
- 每条显示：标题、状态徽章、`/posts/{slug}`、创建日期、编辑/删除按钮
- 删除前 `confirm()` 二次确认
- 一次拉取上限 50 篇（个人博客量级够用）；超过后需改成分页

### 新建 / 编辑 (`/admin/posts/new`、`/admin/posts/:id/edit`)

- 顶部操作栏：返回、标题、状态提示、「查看」、保存草稿、发布
- 表单：标题（必填）、Slug（留空自动生成，placeholder 显示自动结果）
- 正文：**SplitEditor 组件**（`src/components/split-editor.tsx`）
  - 左：Markdown 源码（`<textarea>`，等宽字体）
  - 右：实时预览（复用 `react-markdown` + `remark-gfm` + `rehype-highlight`）
  - 滚动按**比例**双向同步（rAF 节流，防止两边 scroll 事件互相触发）
- 「保存草稿」→ `status: "draft"`；「发布」→ `status: "published"`
- 新建成功后自动切到 `/admin/posts/{id}/edit`（replace），后续保存走 PUT
- 有未保存改动时，关闭/刷新页面触发 `beforeunload` 拦截
- 错误（如 slug 冲突 409）以红色提示条 + toast 展示

### 操作反馈（Toast）

使用 `sonner`（`src/components/ui/sonner.tsx`），已从 `next-themes` 改为读取本项目的 `ThemeProvider`。
挂载在 `App` 内部（`<Toaster position="bottom-right" richColors closeButton />`）。

| 场景 | 提示 |
|------|------|
| 保存草稿 | 「草稿已保存」+ 说明「只有你能看到，发布后才会出现在文章列表」 |
| 发布 | 「已发布」+ 文章路径，附「查看」按钮（新标签页打开） |
| 删除 | 「已删除」+ 文章标题 |
| 保存/删除失败 | 「保存失败」/「删除失败」+ 后端返回的具体原因 |
| 标题为空 | 「标题不能为空」 |

> 保存后**停留在编辑页**（不跳回列表），因为发布后常需回头微调；
> 反馈由 toast 承担，而非通过页面跳转暗示成功。

---

## 入口页 (`/`)

- 无导航栏，全屏居中
- 大标题 `Welcome to tpTwo`
- **InteractiveHoverButton** 组件（参考 `docs/design/交互式悬停按钮.md`）：
  文字 "Enter"，悬停时文字左移淡出、箭头从右侧滑入、背景色块从一点扩散铺满
- 点击 → 跳转 `/home`

---

## 导航栏

- **左侧站名**: "tpTwo"，使用 TextRoll 组件（悬停时字母依次上下滑动动画），点击跳转 `/home`
  - TextRoll 依赖 `motion/react`（Framer Motion）
  - 注意 `lineHeight` 需 ≥ 1.1，否则 `overflow-hidden` 会裁掉 p/g/y 等字母的下伸部分
- **右侧**:
  - `Posts` 链接 → `/posts`
  - `Admin` 链接 → `/admin/posts`
  - 暗色模式切换按钮（🌙/☀️ 图标）
  - 当前页面的链接以 `text-foreground font-medium` 高亮（`NavLink` 的 `isActive`）
- **预留**: 未来扩展导航项（关于、简历等）的空间

---

## 博客列表页 (`/posts`)

- 使用 **InteractiveHoverList** 组件（参考 `docs/design/交互式悬停列表.md`）
- 每项显示：大号粗体标题 + 发布日期（副标题位置）
- **静态**: 浅灰标题、细灰分隔线、低对比度
- **悬停效果**:
  1. 卡片浮起（白底 + 圆角 + 阴影 + 上浮 2px）
  2. 分隔线淡出
  3. 文字由浅灰变纯黑
  4. 箭头从右侧滑入并左移 70px
- **分页**: 无限滚动（游标分页），滚动到底部自动加载更多
- **数据**: 仅展示 `status = "published"`，列表项不含正文（用 `summary` 字段）
- 点击条目 → 跳转 `/posts/:slug`

---

## 文章详情页 (`/posts/:slug`)

- Markdown 渲染: `react-markdown` + `remark-gfm` + `rehype-highlight`
- 支持 GFM 语法（表格、任务列表、删除线）
- 代码块语法高亮（highlight.js `github.css` 主题，与 `prose` 样式叠加）
- 显示：标题、发布日期、正文
- 加载失败或文章不存在 → 重定向回 `/posts`

---

## 数据层约定

- 类型定义集中在 `src/types/post.ts`，与后端 schema 一一对应：
  - `PostSummary` ← 列表项（无正文）
  - `PostDetail` ← 详情（含 `content_markdown`）
  - `PostStatus` = `'draft' | 'published'`（联合字面量，不用裸 `string`）
- API 调用集中在 `src/lib/api.ts`，页面不直接 `fetch`
- 通用工具（`cn`、`formatDate`）放 `src/lib/utils.ts`，不在页面间复制

---

## 待后续实现

- 🔒 **管理端鉴权**（上线前必须完成）：单账号登录 + token 校验，保护 `/api/admin/*`
- 站点主页 `/home` 的实际内容
- 关于页 / 简历页
- 更多导航项
- 标签 / 分类筛选
- 大 chunk 拆分（`highlight.js` 目前被打进主包）