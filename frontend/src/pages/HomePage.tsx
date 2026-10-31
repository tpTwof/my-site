/**
 * [前端 · 页面] 路由 `/home` — 站点首页导航页。
 *
 * 全屏大标题导航（Posts / Admin），带逐字位移与箭头滑入动效。
 * 导航项在下方 HOME_LINKS 配置，加一项即自动渲染。
 *
 * 后端关联：不请求接口。未来若要展示站点简介，可接 GET /api/home。
 */
import { InteractiveHoverLinks } from '@/components/ui/interactive-hover-links'
import type { HoverLink } from '@/components/ui/interactive-hover-links'

/**
 * 首页导航项。加一项就在这里加一条，无需改动组件。
 * 未来会有 About / Resume 等。
 */
const HOME_LINKS: HoverLink[] = [
  { heading: 'Posts', subheading: 'Read the writing', href: '/posts' },
  { heading: 'Admin', subheading: 'Write and manage', href: '/admin/posts' },
]

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-13.5rem)] flex-col justify-center">
      <InteractiveHoverLinks links={HOME_LINKS} />
    </div>
  )
}