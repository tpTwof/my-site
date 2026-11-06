/**
 * [前端 · 展示组件] 紧凑菜单：左侧竖排中文，右侧英文标题。
 * 保留悬停变色与逐字错位动效，不显示副标题、分隔线或箭头。
 * 后端关联：不请求接口。
 */
import { motion } from 'motion/react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface HoverLink {
  heading: string
  label: string
  href: string
}

interface InteractiveHoverLinksProps {
  links: HoverLink[]
  className?: string
  onNavigate?: () => void
}

export function InteractiveHoverLinks({ links, className, onNavigate }: InteractiveHoverLinksProps) {
  const { pathname } = useLocation()

  return (
    <ul className={cn('m-0 w-fit list-none p-0', className)}>
      {links.map(({ heading, label, href }) => (
        <motion.li key={href} initial="initial" whileHover="whileHover" className="group">
          <Link
            to={href}
            onClick={onNavigate}
            aria-label={`${heading} · ${label}`}
            aria-current={pathname === href ? 'page' : undefined}
            className="flex w-fit items-center gap-3 py-1.5 text-muted-foreground transition-colors duration-500 hover:text-primary focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:gap-4"
          >
            <span aria-hidden="true" className="flex w-3 shrink-0 flex-col items-center gap-0.5 text-[10px] leading-none">
              <span>{label[0]}</span>
              <span className="text-[8px]">×</span>
              <span>{label[1]}</span>
            </span>
            <motion.span
              aria-hidden="true"
              variants={{
                initial: { x: 0 },
                whileHover: { x: -16 },
              }}
              transition={{ type: 'spring', staggerChildren: 0.075, delayChildren: 0.25 }}
              className="block text-[40px] leading-[1.1] font-medium tracking-[-0.04em] sm:text-5xl"
            >
              {heading.split('').map((char, i) => (
                <motion.span
                  key={i}
                  variants={{
                    initial: { x: 0 },
                    whileHover: { x: 16 },
                  }}
                  transition={{ type: 'spring' }}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              ))}
            </motion.span>
          </Link>
        </motion.li>
      ))}
    </ul>
  )
}
