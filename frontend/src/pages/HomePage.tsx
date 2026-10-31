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