/**
 * [前端 · 布局组件] 全站顶部导航栏，除 `/` 入口页外所有页面共用。
 *
 * 左：站名 tpTwo（TextRoll 悬停动画），点击回 /home。
 * 中：暂时留空，预留给每日一句 / 名人名言。
 * 右：明暗主题切换。
 *
 * 后端关联：不请求接口。
 */
import { Link } from 'react-router-dom'
import TextRoll from '@/components/ui/text-roll'
import { ThemeToggle } from '@/components/theme-toggle'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-28 max-w-5xl items-center justify-between px-6">
        <Link to="/home" className="text-3xl font-bold tracking-tight">
          <TextRoll center>tpTwo</TextRoll>
        </Link>

        {/* 中间暂留空，后续可放每日一句/名言 */}
        <ThemeToggle className="size-10" iconClassName="size-5" />
      </div>
    </header>
  )
}