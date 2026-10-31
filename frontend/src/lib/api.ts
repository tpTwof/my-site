/**
 * [前端 · 数据层] 全部后端请求集中于此，页面不直接 fetch。
 *
 * 后端地址由 VITE_API_BASE 指定，默认 http://127.0.0.1:8000。
 * 接口契约见 docs/API-SPEC.md。
 *
 * 后端关联：公开接口 /api/posts、/api/posts/{slug}；
 *   管理接口 /api/admin/posts（CRUD）。管理端当前无鉴权。
 */
import type {
  PostCreate,
  PostDetail,
  PostStatus,
  PostSummaryList,
  PostUpdate,
} from '@/types/post'

const BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000'

/** 从 FastAPI 错误体里取出可读信息，无法解析时用回退文案 */
function messageFrom(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return detail
  // 422 校验错误：detail 是 [{ loc, msg, type }, ...]
  if (Array.isArray(detail)) {
    for (const item of detail) {
      if (typeof item === 'object' && item !== null && 'msg' in item) {
        const { msg } = item as { msg: unknown }
        if (typeof msg === 'string') return msg
      }
    }
  }
  return fallback
}

/** 把任意 catch 到的错误转成可展示文案，避免各处重复同一段判断 */
export function errorMessage(err: unknown, fallback = '请求失败'): string {
  return err instanceof Error && err.message ? err.message : fallback
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null)
    const detail =
      typeof body === 'object' && body !== null && 'detail' in body
        ? (body as { detail: unknown }).detail
        : undefined
    throw new Error(messageFrom(detail, `HTTP ${res.status}`))
  }
  // 204 无响应体；此处返回类型由调用方声明，且仅 deletePost 使用
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
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