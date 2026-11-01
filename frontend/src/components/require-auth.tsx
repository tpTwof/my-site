/**
 * [前端 · 路由守卫] 要求登录才能访问的包装组件，用于 /admin/**。
 *
 * 三种状态：
 *   - 还在探测登录态 → 显示占位，避免闪一下登录页
 *   - 未登录 → 重定向到 /login，并记住原地址供登录后跳回
 *   - 已登录 → 渲染子内容
 *
 * 后端关联：登录态来自 GET /api/auth/me（见 AuthProvider）。
 */
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/components/auth-provider'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { username, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return <p className="py-24 text-center text-sm text-muted-foreground">检查登录状态…</p>
  }

  if (!username) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}