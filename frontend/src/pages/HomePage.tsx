/**
 * [前端 · 页面] 路由 `/home` — 站点首页导航页。
 *
 * 全屏大标题导航，带逐字位移与箭头滑入动效。导航项在下方 HOME_LINKS 配置，
 * 加一项即自动渲染；href 以 https:// 或 mailto: 开头时按外链处理。
 *
 * 后端关联：不请求接口。未来若要展示站点简介，可接 GET /api/home。
 */
import { InteractiveHoverLinks } from '@/components/ui/interactive-hover-links'
import type { HoverLink } from '@/components/ui/interactive-hover-links'

/** 首页导航项。加一项就在这里加一条，无需改动组件。 */
const HOME_LINKS: HoverLink[] = [
  { heading: 'Posts', subheading: 'Read the writing', href: '/posts' },
  { heading: 'Admin', subheading: 'Write and manage', href: '/admin/posts' },
  { heading: 'GitHub', subheading: 'Code and forks', href: 'https://github.com/tpTwof' },
  { heading: 'Email', subheading: 'Say hello', href: 'mailto:1377567112@qq.com' },
]

export default function HomePage() {
  return (
    <div className="flex min-h-[calc(100vh-13.5rem)] flex-col justify-center">
      <InteractiveHoverLinks links={HOME_LINKS} />
    </div>
  )
}