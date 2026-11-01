/**
 * [前端 · 全局上下文] 管理端登录状态，包裹整个应用。
 *
 * 启动时调 GET /api/auth/me 判断是否已登录（令牌在 httpOnly Cookie 里，
 * JS 读不到，只能问后端）。监听 api.ts 派发的 `auth:unauthorized` 事件，
 * 任何请求收到 401 都会把状态清空，路由守卫随即跳转到登录页。
 *
 * 后端关联：POST /api/auth/login、POST /api/auth/logout、GET /api/auth/me。
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { UNAUTHORIZED_EVENT, getMe, login as apiLogin, logout as apiLogout } from '@/lib/api'
import { errorMessage } from '@/lib/api'

interface AuthContextValue {
  /** 已登录用户名；未登录为 null */
  username: string | null
  /** 首次探测是否已完成（避免刷新时闪一下登录页） */
  ready: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    getMe()
      .then((me) => {
        if (!cancelled) setUsername(me.username)
      })
      .catch(() => {
        // 401 属正常情况（未登录），不需要报错
        if (!cancelled) setUsername(null)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onUnauthorized = () => setUsername(null)
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [])

  const login = useCallback(async (name: string, password: string) => {
    const me = await apiLogin(name, password)
    setUsername(me.username)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch (err) {
      // 即便后端失败，本地也要登出，避免卡在“看着已登录但用不了”的状态
      console.warn('logout failed:', errorMessage(err))
    }
    setUsername(null)
  }, [])

  return (
    <AuthContext.Provider value={{ username, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}