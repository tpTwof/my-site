/**
 * [前端 · 页面] 路由 `/home` — 站点首页导航页。
 *
 * 全屏大标题导航，带逐字位移与箭头滑入动效。导航项在下方配置，
 * 加一项即自动渲染；href 以 https:// 或 mailto: 开头时按外链处理。
 *
 * Admin 一项只在已登录时出现——访客看不到管理入口，也就不必点进去
 * 才发现要登录。
 *
 * 后端关联：不请求接口。登录态来自 AuthProvider（见 GET /api/auth/me）。
 */
import { InteractiveHoverLinks } from '@/components/ui/interactive-hover-links'
import type { HoverLink } from '@/components/ui/interactive-hover-links'
import { useAuth } from '@/components/auth-provider'

/**
 * 首页导航项。加一项就在这里加一条，无需改动组件。
 *
 * `adminOnly: true` 的项只有登录后才会渲染。
 */
interface HomeLink extends HoverLink {
  adminOnly?: boolean
}

const HOME_LINKS: HomeLink[] = [
  { heading: 'Posts', subheading: 'Read the writing', href: '/posts' },
  {
    heading: 'Admin',
    subheading: 'Write and manage',
    href: '/admin/posts',
    adminOnly: true,
  },
  {
    heading: 'GitHub',
    subheading: 'Code and forks',
    href: 'https://github.com/tpTwof',
  },
]

export default function HomePage() {
  const { username } = useAuth()
  const links = HOME_LINKS.filter((link) => !link.adminOnly || username)

  return (
    <div className="flex min-h-[calc(100vh-13.5rem)] flex-col justify-center">
      <InteractiveHoverLinks links={links} />
    </div>
  )
}