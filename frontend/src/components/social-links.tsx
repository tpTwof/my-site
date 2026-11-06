/**
 * [前端 · 展示组件] 导航栏右侧的外链图标按钮。
 *
 * 图标与地址集中在本文件的 SOCIAL_LINKS 里，加一个只需加一条。
 *
 * GitHub 用一个内联 SVG：lucide 已移除品牌图标（商标图形）。
 *
 * 后端关联：不请求接口。
 */
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface SocialLink {
  label: string
  href: string
  icon: React.ReactNode
}

/** GitHub 品牌图形，取自 Simple Icons（CC0） */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

/** 外链配置。加一项即自动渲染。 */
const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/tpTwof',
    icon: <GithubIcon className="size-6" />,
  },
]

function SocialLinkButton({ label, href, icon }: SocialLink) {
  const [turns, setTurns] = useState(0)
  const reducedMotion = useReducedMotion()

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch') setTurns((value) => value + 1)
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(':focus-visible')) setTurns((value) => value + 1)
      }}
      className="group/social inline-flex size-11 shrink-0 items-center justify-center text-inherit focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:size-12"
    >
      <span className="inline-flex scale-100 transition-transform duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/social:scale-125 group-focus-visible/social:scale-125 motion-reduce:transition-none">
        <motion.span
          className="inline-flex"
          animate={{ rotate: reducedMotion ? 0 : turns * 360 }}
          transition={{ duration: reducedMotion ? 0 : 0.75, ease: [0.22, 1, 0.36, 1] }}
        >
          {icon}
        </motion.span>
      </span>
    </a>
  )
}

export function SocialLinks() {
  return (
    <>
      {SOCIAL_LINKS.map((link) => <SocialLinkButton key={link.href} {...link} />)}
    </>
  )
}
