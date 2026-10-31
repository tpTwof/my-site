/**
 * [前端 · 展示组件] 全屏大标题导航列表，用于 `/home` 首页导航页。
 *
 * 悬停时整行左移、每个字母再右移（逐字错位），底边由 muted 变 foreground，
 * 右侧箭头滑出。链接项由父组件通过 links 传入。
 *
 * 后端关联：不请求接口。href 均为站内路由（如 /posts、/admin/posts）。
 */
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface HoverLink {
  heading: string
  subheading: string
  href: string
}

interface InteractiveHoverLinksProps {
  links: HoverLink[]
  className?: string
}

/**
 * 全屏导航页的大标题链接列表。
 *
 * 悬停效果：
 * - 整行文字容器左移，内部每个字母再右移，形成「拉长」的错位感
 * - 底边由 muted 过渡到 foreground
 * - 右侧箭头从遮罩中滑出
 *
 * 原组件的图片浮动效果已移除（不需要图片）。
 * 字母 stagger 依赖 framer-motion 的 variants 继承：父级设
 * staggerChildren/delayChildren，子级只需声明自己的 variants。
 */
export function InteractiveHoverLinks({ links, className }: InteractiveHoverLinksProps) {
  return (
    <section className={cn('w-full', className)}>
      <div className="w-full">
        {links.map((link) => (
          <HoverLinkRow key={link.href} {...link} />
        ))}
      </div>
    </section>
  )
}

function HoverLinkRow({ heading, subheading, href }: HoverLink) {
  return (
    <motion.div initial="initial" whileHover="whileHover" className="group">
      <Link
        to={href}
        className="relative flex items-center justify-between border-b-2 border-muted py-6 transition-colors duration-500 hover:border-foreground md:py-8"
      >
        <div className="min-w-0">
          <motion.span
            variants={{
              initial: { x: 0 },
              whileHover: { x: -16 },
            }}
            transition={{
              type: 'spring',
              staggerChildren: 0.075,
              delayChildren: 0.25,
            }}
            className="relative z-10 block text-4xl font-bold tracking-tight text-muted-foreground transition-colors duration-500 group-hover:text-foreground md:text-6xl"
          >
            {heading.split('').map((char, i) => (
              <motion.span
                variants={{
                  initial: { x: 0 },
                  whileHover: { x: 16 },
                }}
                transition={{ type: 'spring' }}
                className="inline-block"
                key={i}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </motion.span>
          <span className="relative z-10 mt-2 block text-base text-muted-foreground transition-colors duration-500 group-hover:text-foreground">
            {subheading}
          </span>
        </div>

        <div className="overflow-hidden">
          <motion.div
            variants={{
              initial: { x: '100%', opacity: 0 },
              whileHover: { x: '0%', opacity: 1 },
            }}
            transition={{ type: 'spring', bounce: 0.25 }}
            className="relative z-10 shrink-0 p-4"
          >
            <ArrowRight className="size-8 text-foreground md:size-12" />
          </motion.div>
        </div>
      </Link>
    </motion.div>
  )
}