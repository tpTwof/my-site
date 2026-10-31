/**
 * [前端 · 展示组件] 胶囊式单选筛选器，当前用于 `/admin/posts` 的
 * 「全部 / 已发布 / 草稿」状态筛选。
 *
 * 受控组件：父组件持有选中值。带跟随鼠标的弹簧滑块。
 *
 * 后端关联：不请求接口。选中值由父页面转成 `?status=` 传给
 *   GET /api/admin/posts（'all' 表示不传 status）。
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface NavTabItem<T extends string> {
  value: T
  label: string
}

interface NavTabsProps<T extends string> {
  items: NavTabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** 无障碍名称，默认「筛选」 */
  label?: string
  className?: string
}

/**
 * 胶囊式单选筛选器，带跟随鼠标的滑块。
 *
 * 语义上这是**筛选器**而非标签页，所以用 `role="group"` + `aria-pressed`
 * 的按钮组，而不是 `role="tablist"`：tab 角色承诺「切换独立面板」，
 * 这里换的是同一个列表的过滤条件，用 tab 会让读屏软件播报错误的层级。
 *
 * 视觉与 tab 版完全一致：滑块 `bg-foreground`，被覆盖的按钮切到
 * `text-background`（亮色黑底白字 / 暗色白底黑字）。无悬停时滑块停在
 * 当前选中项，而不是消失——否则选中项的文字会落在同色背景上。
 */
export function NavTabs<T extends string>({
  items,
  value,
  onChange,
  label = '筛选',
  className,
}: NavTabsProps<T>) {
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [hoveredValue, setHoveredValue] = useState<T | null>(null)
  const [cursor, setCursor] = useState({ left: 0, width: 0 })

  const activeValue = hoveredValue ?? value

  useLayoutEffect(() => {
    const el = tabRefs.current[activeValue]
    if (!el) return
    setCursor({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeValue])

  return (
    <div className={cn('flex justify-center', className)}>
      <div
        role="group"
        aria-label={label}
        className="relative flex w-fit rounded-full border-2 border-foreground bg-background p-1"
        onMouseLeave={() => setHoveredValue(null)}
      >
        {items.map((item) => (
          <button
            key={item.value}
            ref={(node) => {
              tabRefs.current[item.value] = node
            }}
            type="button"
            aria-pressed={item.value === value}
            onMouseEnter={() => setHoveredValue(item.value)}
            onClick={() => onChange(item.value)}
            className={cn(
              // 重置 button 默认样式，保证外观与纯文本胶囊一致
              'relative z-10 cursor-pointer appearance-none rounded-full border-0 bg-transparent',
              'px-3 py-1.5 text-xs transition-colors md:px-5 md:py-2.5 md:text-sm',
              'font-[inherit] leading-[inherit]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              activeValue === item.value ? 'text-background' : 'text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
        <motion.div
          aria-hidden
          initial={false}
          animate={{ left: cursor.left, width: cursor.width }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="pointer-events-none absolute top-1 bottom-1 z-0 rounded-full bg-foreground"
        />
      </div>
    </div>
  )
}