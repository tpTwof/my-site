/**
 * [前端 · 类型] 文章与标签的 TypeScript 类型，与后端 schema 一一对应。
 *
 * PostSummary ← backend/models/post.py::PostSummary（列表项，无正文）
 * PostDetail  ← backend/models/post.py::PostDetail（详情，含 content_markdown）
 * TagRef      ← backend/models/post.py::TagRef（挂在文章上的标签）
 * TagCount    ← backend/models/tag.py::TagCount（标签 + 文章数）
 * TagList     ← backend/models/tag.py::TagList（GET /api/tags 响应）
 *
 * 改后端 schema 时，这里必须同步，否则类型与运行时数据会脱节。
 */

/** 文章状态 */
export type PostStatus = 'draft' | 'published'

/** 挂在文章上的标签 —— 对应后端 TagRef */
export interface TagRef {
  slug: string
  name: string
}

/** 标签 + 该标签下的已发布文章数 —— 对应后端 TagCount */
export interface TagCount extends TagRef {
  count: number
}

/** GET /api/tags 响应 —— total 是已发布文章总数 */
export interface TagList {
  items: TagCount[]
  total: number
}

/** 列表项 —— 对应后端 PostSummary，不含正文 */
export interface PostSummary {
  id: string
  slug: string
  title: string
  summary: string
  status: PostStatus
  created_at: string
  updated_at: string
  tags: TagRef[]
}

/** 详情 —— 对应后端 PostDetail，含完整 Markdown 正文 */
export interface PostDetail {
  id: string
  slug: string
  title: string
  content_markdown: string
  status: PostStatus
  created_at: string
  updated_at: string
  tags: TagRef[]
}

/** 相邻文章 —— 对应后端 PostNeighbour，只有定位信息 */
export interface PostNeighbour {
  slug: string
  title: string
}

/**
 * 公开详情 —— 对应后端 PublicPostDetail。
 * 在 PostDetail 基础上多出上一篇/下一篇，首篇或末篇时为 null。
 */
export interface PublicPostDetail extends PostDetail {
  previous: PostNeighbour | null
  next: PostNeighbour | null
}

/** 列表响应 —— 对应后端 PostSummaryList */
export interface PostSummaryList {
  items: PostSummary[]
  next_cursor: string | null
}

/** 对应后端 PostCreate */
export interface PostCreate {
  title: string
  slug?: string
  content_markdown?: string
  status?: PostStatus
  /** 标签名数组。不传或空数组 → 后端回落到「其他」 */
  tags?: string[]
}

/** 对应后端 PostUpdate */
export interface PostUpdate {
  title?: string
  slug?: string
  content_markdown?: string
  status?: PostStatus
  /** 不传 = 不改动标签；传 [] = 回落到「其他」 */
  tags?: string[]
}