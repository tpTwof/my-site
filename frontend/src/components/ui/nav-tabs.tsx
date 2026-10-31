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
  className?: string
}

interface CursorState {
  left: number
  width: number
}

/**
 * 胶囊式标签导航，带跟随鼠标的滑块。
 *
 * 与参考实现的差异：
 * - 受控组件（value/onChange），不写死 Tab
 * - `motion/react` 而非 `framer-motion`（项目已装前者）
 * - 不用 `mix-blend-difference`：滑块 `bg-foreground`，被覆盖的 Tab 文字切到
 *   `text-background`。亮色下是黑底白字，暗色下是白底黑字，主题自洽。
 * - 无悬停项时滑块停在**当前选中项**上，而不是消失——否则选中项的白字会
 *   落在白底上不可见。
 */
export function NavTabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: NavTabsProps<T>) {
  const listRef = useRef<HTMLUListElement>(null)
  const tabRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const [hoveredValue, setHoveredValue] = useState<T | null>(null)
  const [cursor, setCursor] = useState<CursorState>({ left: 0, width: 0 })

  const activeValue = hoveredValue ?? value

  useLayoutEffect(() => {
    const el = tabRefs.current[activeValue]
    if (!el) return
    setCursor({ left: el.offsetLeft, width: el.offsetWidth })
  }, [activeValue])

  return (
    <div className={cn('flex justify-center', className)}>
      <ul
        ref={listRef}
        role="tablist"
        className="relative m-0 flex w-fit list-none rounded-full border-2 border-foreground bg-background p-1"
        onMouseLeave={() => setHoveredValue(null)}
      >
        {items.map((item) => (
          <li
            key={item.value}
            ref={(node) => {
              tabRefs.current[item.value] = node
            }}
            role="tab"
            aria-selected={item.value === value}
            tabIndex={0}
            onMouseEnter={() => setHoveredValue(item.value)}
            onClick={() => onChange(item.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onChange(item.value)
              }
            }}
            className={cn(
              'relative z-10 block cursor-pointer rounded-full px-3 py-1.5 text-xs transition-colors md:px-5 md:py-2.5 md:text-sm',
              // 仅当前滑块覆盖的 Tab 反相
              activeValue === item.value ? 'text-background' : 'text-foreground',
            )}
          >
            {item.label}
          </li>
        ))}
        <motion.li
          aria-hidden
          initial={false}
          animate={{ left: cursor.left, width: cursor.width }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          className="pointer-events-none absolute top-1 bottom-1 z-0 rounded-full bg-foreground"
        />
      </ul>
    </div>
  )
}