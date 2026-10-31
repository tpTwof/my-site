import type { Post, PostCreate, PostListResponse, PostUpdate } from '@/types/post'

const BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(detail.detail ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── 公开接口 ───────────────────────────────
export async function getPosts(cursor?: string, limit = 10): Promise<PostListResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  return request<PostListResponse>(`/api/posts?${params}`)
}

export async function getPost(slug: string): Promise<Post> {
  return request<Post>(`/api/posts/${encodeURIComponent(slug)}`)
}

// ─── 管理接口 ───────────────────────────────
export async function getAdminPosts(
  cursor?: string,
  limit = 10,
  status?: string,
): Promise<PostListResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  if (status) params.set('status', status)
  return request<PostListResponse>(`/api/admin/posts?${params}`)
}

export async function getAdminPost(id: string): Promise<Post> {
  return request<Post>(`/api/admin/posts/${id}`)
}

export async function createPost(body: PostCreate): Promise<Post> {
  return request<Post>('/api/admin/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updatePost(id: string, body: PostUpdate): Promise<Post> {
  return request<Post>(`/api/admin/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

export async function deletePost(id: string): Promise<void> {
  return request<void>(`/api/admin/posts/${id}`, { method: 'DELETE' })
}
