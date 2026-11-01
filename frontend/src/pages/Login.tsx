/**
 * [前端 · 页面] 路由 `/login` — 管理端登录。
 *
 * 登录成功后跳到 state.from（被守卫拦下的原地址），没有则去 /admin/posts。
 * 已登录时访问本页会直接跳走。
 *
 * 后端关联：POST /api/auth/login { username, password }
 *   → 200 { username } 并 Set-Cookie: tp_admin（httpOnly）；
 *   口令错误返回 401，此处内联展示错误文案。
 */
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { errorMessage } from '@/lib/api'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ErrorBanner } from '@/components/error-banner'

interface LocationState {
  from?: string
}

export default function Login() {
  const { username, ready, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from ?? '/admin/posts'

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 已登录就别停在登录页
  useEffect(() => {
    if (ready && username) navigate(from, { replace: true })
  }, [ready, username, from, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(name.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(errorMessage(err, '登录失败'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-13.5rem)] items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-border p-8"
      >
        <div>
          <h1 className="m-0 text-xl font-bold tracking-tight">管理端登录</h1>
          <p className="mt-1 text-sm text-muted-foreground">登录后可写作与发布文章</p>
        </div>

        <ErrorBanner message={error} />

        <div className="space-y-1.5">
          <Label htmlFor="username">用户名</Label>
          <Input
            id="username"
            autoComplete="username"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          <LogIn className="size-4" />
          {submitting ? '登录中...' : '登录'}
        </Button>
      </form>
    </div>
  )
}