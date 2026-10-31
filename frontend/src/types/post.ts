/** 文章状态 */
export type PostStatus = 'draft' | 'published'

/** 列表项 —— 对应后端 PostSummary，不含正文 */
export interface PostSummary {
  id: string
  slug: string
  title: string
  summary: string
  status: PostStatus
  created_at: string
  updated_at: string
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
}

/** 对应后端 PostUpdate */
export interface PostUpdate {
  title?: string
  slug?: string
  content_markdown?: string
  status?: PostStatus
}