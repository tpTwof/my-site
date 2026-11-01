/**
 * [前端 · 布局组件] 全站顶部导航栏，除 `/` 入口页外所有页面共用。
 *
 * 左：站名 tpTwo（TextRoll 悬停动画），点击回 /home。
 * 中：暂时留空，预留给每日一句 / 名人名言。
 * 右：已登录时显示「登出」，以及明暗主题切换。
 *
 * 后端关联：登出调用 POST /api/auth/logout（见 AuthProvider）。
 */
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import TextRoll from '@/components/ui/text-roll'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider'

export function Navbar() {
  const { username, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    toast.success('已登出')
    navigate('/home')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-28 max-w-5xl items-center justify-between px-6">
        <Link to="/home" className="text-3xl font-bold tracking-tight">
          <TextRoll center>tpTwo</TextRoll>
        </Link>

        {/* 中间暂留空，后续可放每日一句/名言 */}
        <div className="flex items-center gap-2">
          {username && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              title={`已登录：${username}`}
            >
              <LogOut className="size-4" />
              登出
            </Button>
          )}
          <ThemeToggle className="size-10" iconClassName="size-5" />
        </div>
      </div>
    </header>
  )
}