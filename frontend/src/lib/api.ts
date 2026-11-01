/**
 * [前端 · 数据层] 全部后端请求集中于此，页面不直接 fetch。
 *
 * 后端地址由 VITE_API_BASE 指定；留空则走同源（生产环境由 nginx 把
 * /api 反代到后端），本地开发默认 http://127.0.0.1:8000。
 *
 * 鉴权：会话令牌在 httpOnly Cookie 里，JS 读不到，因此所有请求都要
 * `credentials: 'include'`。收到 401 时派发 `auth:unauthorized` 事件，
 * 由 AuthProvider 统一跳转登录页，页面不必各自处理。
 *
 * 接口契约见 docs/API-SPEC.md。
 */
import type {
  PostCreate,
  PostDetail,
  PostStatus,
  PostSummaryList,
  PostUpdate,
} from '@/types/post'

const BASE = import.meta.env.VITE_API_BASE ?? 'http://127.0.0.1:8000'

/** 未登录或会话过期时触发，AuthProvider 监听此事件 */
export const UNAUTHORIZED_EVENT = 'auth:unauthorized'

export class UnauthorizedError extends Error {
  constructor(message = '未登录或登录已过期') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

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

interface RequestOptions extends RequestInit {
  /** 登录接口本身的 401 不应触发全局跳转 */
  skipAuthRedirect?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuthRedirect, ...init } = options
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (res.status === 401 && !skipAuthRedirect) {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    throw new UnauthorizedError()
  }

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

// ─── 鉴权 ───────────────────────────────────
export interface Me {
  username: string
}

export function login(username: string, password: string): Promise<Me> {
  return request<Me>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    skipAuthRedirect: true, // 口令错误是本地错误，不该触发全局跳转
  })
}

export function logout(): Promise<void> {
  return request<void>('/api/auth/logout', { method: 'POST', skipAuthRedirect: true })
}

export function getMe(): Promise<Me> {
  return request<Me>('/api/auth/me', { skipAuthRedirect: true })
}

// ─── 公开接口 ───────────────────────────────
export function getPosts(cursor?: string, limit = 10): Promise<PostSummaryList> {
  return request<PostSummaryList>(`/api/posts?${pagedQuery(cursor, limit)}`)
}

export function getPost(slug: string): Promise<PostDetail> {
  return request<PostDetail>(`/api/posts/${encodeURIComponent(slug)}`)
}

// ─── 管理接口（需登录）───────────────────────
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