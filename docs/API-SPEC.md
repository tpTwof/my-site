# tpTwo 站点接口规范

> **当前阶段范围**: 站点入口 + 博客文章 CRUD
> **明确排除**: 用户认证、标签/分类、评论、统计、搜索、媒体上传

---

## 基础约定

| 项目 | 约定 |
|------|------|
| 站点接口前缀 | `/api` |
| 公开博客接口前缀 | `/api/posts` |
| 管理博客接口前缀 | `/api/admin/posts` |
| 数据格式 | JSON, UTF-8 |
| 分页方式 | 游标分页 (Cursor-based)，游标为 base64url 不透明字符串 |
| 正文格式 | 原始 Markdown 存取，前端渲染 |
| 文章状态 | `draft` / `published`（请求体校验，非法值返回 422） |
| URL 标识 | 自定义 Slug（公开接口）/ UUID（管理接口） |
| 数据库 | SQLite |
| ORM | SQLModel（查询/写入统一收敛在 `backend/crud/`） |

### 错误响应约定

| 状态码 | 含义 |
|--------|------|
| 400 | 游标非法 |
| 404 | 资源不存在（或文章未发布时通过公开接口访问） |
| 409 | Slug 已被占用 |
| 422 | 请求体校验失败（如非法 `status`） |

错误体统一为 `{"detail": "..."}`（422 时为 FastAPI 校验错误数组）。

---

## 站点接口

### GET /api/home

站点主页数据。当前返回站点基本信息。

**Response 200:**

```json
{
  "site_name": "tpTwo",
  "description": "Personal website"
}
```

> 后续会扩展为「个人介绍 / 精选内容 / 各板块入口」等。博客文章不在此接口返回。

---

## 博客 · 公开接口（无需认证）

### GET /api/posts

获取已发布文章列表（无限滚动）。**不返回正文**，只返回摘要。

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cursor | string | 否 | 上一页返回的 `next_cursor`，首次请求不传 |
| limit | integer | 否 | 每页条数，默认 10，最大 50 |

**Response 200:**

```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "my-first-post",
      "title": "我的第一篇文章",
      "summary": "从正文自动提取的纯文本摘要，超过 200 字截断并以 … 结尾",
      "status": "published",
      "created_at": "2024-01-15T08:30:00Z",
      "updated_at": "2024-01-16T10:00:00Z"
    }
  ],
  "next_cursor": "MjAyNC0wMS0xNFQxMjowMDowMCswMDowMA"
}
```

- `next_cursor` 为 `null` 时表示无更多数据
- 仅返回 `status = "published"` 的文章
- 按 `created_at DESC` 排序
- 列表项**不含** `content_markdown`，避免列表接口携带全文
- `summary` 由 `models.post.excerpt()` 生成：剥离代码块/图片/链接语法/Markdown 记号后
  取纯文本前 200 字符；超过 200 字符时末尾追加 `…`，未超过则保持原样

---

### GET /api/posts/{slug}

获取已发布文章详情。**含完整正文。**

**Path Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| slug | string | 文章自定义 slug |

**Response 200:**

```json
{
  "id": "uuid",
  "slug": "my-first-post",
  "title": "我的第一篇文章",
  "content_markdown": "# Hello\n\n这是正文...",
  "status": "published",
  "created_at": "2024-01-15T08:30:00Z",
  "updated_at": "2024-01-16T10:00:00Z"
}
```

**Response 404:** slug 不存在，或文章状态不是 `published`

---

## 博客 · 管理接口（未来加认证，当前暂不鉴权）

### POST /api/admin/posts

创建新文章。

**Request Body:**

```json
{
  "title": "新文章标题",
  "slug": "new-post-slug",
  "content_markdown": "# 正文...",
  "status": "draft"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 文章标题，最长 500 |
| slug | string | 否 | 自定义 slug，最长 255；未提供时从 title 自动生成 |
| content_markdown | string | 否 | Markdown 正文，默认空字符串 |
| status | string | 否 | `draft`（默认）或 `published` |

**Slug 生成规则**：
- 仅保留 ASCII 字母数字与连字符
- 标题含非 ASCII 字符（如中文）时回退为 8 位 UUID 短码
- 自动生成的 slug 撞车时追加 6 位随机后缀；用户显式指定的 slug 撞车返回 409

**Response 201:** 完整文章对象（含正文）

---

### GET /api/admin/posts

获取所有文章列表（含草稿）。**不返回正文**。

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cursor | string | 否 | 上一页返回的 `next_cursor` |
| limit | integer | 否 | 每页条数，默认 10，最大 50 |
| status | string | 否 | 过滤状态：`draft` / `published`，不传返回全部 |

**Response 200:** 同公开列表结构，但包含所有状态的文章

> 排序与公开列表一致，按 `created_at DESC`。游标即最后一条的 `created_at`，
> 不依赖 UUID 字典序（UUID v4 与创建时间无关，不能用作排序键）。

---

### GET /api/admin/posts/{id}

获取文章详情（含草稿，含正文）。

**Path Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 文章 ID |

**Response 200:** 完整文章对象（同公开详情结构）

**Response 404:** ID 不存在

---

### PUT /api/admin/posts/{id}

更新文章。部分更新语义，仅更新请求体中出现的字段。

**Request Body（所有字段可选）:**

```json
{
  "title": "更新后的标题",
  "slug": "updated-slug",
  "content_markdown": "# 新正文...",
  "status": "published"
}
```

- `status` 从 `draft` → `published` 即为发布动作
- `updated_at` 自动更新
- 修改 slug 时若与其他文章冲突，返回 409

**Response 200:** 完整文章对象

---

### DELETE /api/admin/posts/{id}

删除文章。

**Response 204:** No Content

**Response 404:** ID 不存在

---

## 数据库表结构

```sql
CREATE TABLE posts (
    id               TEXT PRIMARY KEY,       -- UUID as TEXT (SQLite)
    slug             VARCHAR(255) UNIQUE NOT NULL,
    title            VARCHAR(500) NOT NULL,
    content_markdown TEXT NOT NULL DEFAULT '',
    status           VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at       TIMESTAMP NOT NULL,
    updated_at       TIMESTAMP NOT NULL
);

CREATE INDEX idx_posts_status_created ON posts (status, created_at);
CREATE INDEX idx_posts_created        ON posts (created_at);
CREATE UNIQUE INDEX ix_posts_slug     ON posts (slug);
```

> `status` 的取值由应用层 `Literal["draft", "published"]` 校验（SQLModel 不支持
> `Literal` 作为列类型，故未使用 SQL `CHECK` 约束）。

---

## 代码分层约定

```
backend/
├── models/post.py     # 表定义 + 请求/响应 schema + 纯领域函数（slugify/excerpt）
├── crud/
│   ├── pagination.py  # 通用游标分页（base64url 游标 + limit+1 探测）
│   └── post.py        # Post 的全部读写操作 + ORM→schema 映射
└── routers/           # 仅 HTTP 层：参数解析、状态码、错误映射
```

- **router 不直接写 SQL/select**：一律通过 `crud.` 调用
- **列表与详情用不同 schema**：`PostSummary`（无正文）/ `PostDetail`（含正文）

---

## 后续阶段（明确排除在当前范围外）

- 🔒 用户认证 / JWT / Session
- 🏷️ 标签 / 分类系统
- 💬 评论系统
- 📊 访问量统计
- 🔍 全文搜索
- 🖼️ 图片上传 / 媒体管理（封面图已确认不做）