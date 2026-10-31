/**
 * [前端 · 页面] 路由 `/` — 站点入口页（Gate）。
 *
 * 全屏欢迎屏，无导航栏；点击 Enter 后进入 /home 首页导航。
 * 目的：让第一屏是品牌表达而非内容列表。
 *
 * 后端关联：不请求接口。
 */
import { useNavigate } from 'react-router-dom'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold tracking-tight text-foreground lg:text-5xl">
        Welcome to tpTwo
      </h1>
      <InteractiveHoverButton
        text="Enter"
        className="w-40 p-3 text-lg"
        onClick={() => navigate('/home')}
      />
    </div>
  )
}