# 博客功能接口规范 v1

> **当前阶段范围**: 仅博客文章 CRUD  
> **明确排除**: 用户认证、标签/分类、评论、统计、搜索、媒体上传

---

## 基础约定

| 项目 | 约定 |
|------|------|
| 公开接口前缀 | `/api/posts` |
| 管理接口前缀 | `/api/admin/posts` |
| 数据格式 | JSON, UTF-8 |
| 分页方式 | 游标分页 (Cursor-based) |
| 正文格式 | 原始 Markdown 存取，前端渲染 |
| 文章状态 | `draft` / `published` |
| URL 标识 | 自定义 Slug（公开接口）/ UUID（管理接口） |
| 数据库 | SQLite |
| ORM | SQLModel |

---

## 公开接口（无需认证）

### GET /api/posts

获取已发布文章列表（无限滚动）。

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cursor | string | 否 | 上一页最后一条的 `created_at` ISO 字符串，首次请求不传 |
| limit | integer | 否 | 每页条数，默认 10，最大 50 |

**Response 200:**

```json
{
  "items": [
    {
      "id": "uuid",
      "slug": "my-first-post",
      "title": "我的第一篇文章",
      "summary": "摘要文本",
      "status": "published",
      "created_at": "2024-01-15T08:30:00Z",
      "updated_at": "2024-01-16T10:00:00Z"
    }
  ],
  "next_cursor": "2024-01-14T12:00:00Z"
}
```

- `next_cursor` 为 `null` 时表示无更多数据
- 仅返回 `status = "published"` 的文章
- 按 `created_at DESC` 排序

---

### GET /api/posts/{slug}

获取已发布文章详情。

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

**Response 404:** slug 不存在或 `status != "published"`

---

## 管理接口（未来加认证，当前暂不鉴权）

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
| title | string | 是 | 文章标题 |
| slug | string | 否 | 自定义 slug，未提供时从 title 自动生成 |
| content_markdown | string | 否 | Markdown 正文，默认空字符串 |
| status | string | 否 | `draft`（默认）或 `published` |

**Response 201:** 完整文章对象

---

### GET /api/admin/posts

获取所有文章列表（含草稿），游标分页。

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| cursor | string | 否 | 上一页最后一条的 `id`，首次请求不传 |
| limit | integer | 否 | 每页条数，默认 10，最大 50 |
| status | string | 否 | 过滤状态：`draft` / `published`，不传返回全部 |

**Response 200:** 同公开列表结构，但包含所有状态的文章

> 注意：管理列表使用 `id` 作为游标（而非 `created_at`），避免同时间戳导致的分页问题。

---

### GET /api/admin/posts/{id}

获取文章详情（含草稿）。

**Path Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| id | string (UUID) | 文章 ID |

**Response 200:** 完整文章对象（同公开详情结构）

**Response 404:** ID 不存在

---

### PUT /api/admin/posts/{id}

更新文章。

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
    status           VARCHAR(20) NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'published')),
    created_at       TEXT NOT NULL,          -- ISO 8601 timestamp
    updated_at       TEXT NOT NULL           -- ISO 8601 timestamp
);

CREATE INDEX idx_posts_status_created ON posts(status, created_at DESC);
CREATE INDEX idx_posts_slug ON posts(slug);
```

---

## 后续阶段（明确排除在当前范围外）

- 🔒 用户认证 / JWT / Session
- 🏷️ 标签 / 分类系统
- 💬 评论系统
- 📊 访问量统计
- 🔍 全文搜索
- 🖼️ 图片上传 / 媒体管理
