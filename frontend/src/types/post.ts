/** 与后端 PostResponse 对应 */
export interface Post {
  id: string
  slug: string
  title: string
  content_markdown: string | null
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

/** 与后端 PostListResponse 对应 */
export interface PostListResponse {
  items: Post[]
  next_cursor: string | null
}

/** 与后端 PostCreate 对应 */
export interface PostCreate {
  title: string
  slug?: string
  content_markdown?: string
  status?: 'draft' | 'published'
}

/** 与后端 PostUpdate 对应 */
export interface PostUpdate {
  title?: string
  slug?: string
  content_markdown?: string
  status?: 'draft' | 'published'
}
