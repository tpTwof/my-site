import type {
  PostCreate,
  PostDetail,
  PostStatus,
  PostSummaryList,
  PostUpdate,
} from '@/types/post'

const BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000'

/** 后端错误体：``{"detail": "..."}`` 或 FastAPI 校验错误数组 */
function messageFrom(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string }
    return first?.msg ?? fallback
  }
  return fallback
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(messageFrom(body?.detail, `HTTP ${res.status}`))
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function pagedQuery(cursor?: string, limit = 10, extra?: Record<string, string>) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value)
  return params.toString()
}

// ─── 公开接口 ───────────────────────────────
export function getPosts(cursor?: string, limit = 10): Promise<PostSummaryList> {
  return request<PostSummaryList>(`/api/posts?${pagedQuery(cursor, limit)}`)
}

export function getPost(slug: string): Promise<PostDetail> {
  return request<PostDetail>(`/api/posts/${encodeURIComponent(slug)}`)
}

// ─── 管理接口 ───────────────────────────────
export function getAdminPosts(
  cursor?: string,
  limit = 10,
  status?: PostStatus,
): Promise<PostSummaryList> {
  return request<PostSummaryList>(
    `/api/admin/posts?${pagedQuery(cursor, limit, status ? { status } : undefined)}`,
  )
}

export function getAdminPost(id: string): Promise<PostDetail> {
  return request<PostDetail>(`/api/admin/posts/${id}`)
}

export function createPost(body: PostCreate): Promise<PostDetail> {
  return request<PostDetail>('/api/admin/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updatePost(id: string, body: PostUpdate): Promise<PostDetail> {
  return request<PostDetail>(`/api/admin/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export function deletePost(id: string): Promise<void> {
  return request<void>(`/api/admin/posts/${id}`, { method: 'DELETE' })
}