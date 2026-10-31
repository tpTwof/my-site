import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// ===== 类型定义 =====
export interface HoverListItem {
  id: string
  title: string
  subtitle: string
  href?: string
}

interface InteractiveHoverListProps {
  items: HoverListItem[]
  className?: string
  onItemClick?: (item: HoverListItem) => void
}

// ===== 单个列表项 =====
function HoverItem({
  item,
  isHovered,
  onHover,
  onLeave,
  onClick,
}: {
  item: HoverListItem
  isHovered: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  return (
    <motion.div
      className="relative cursor-pointer rounded-xl px-5 py-5"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      animate={{
        y: isHovered ? -2 : 0,
        backgroundColor: isHovered ? 'var(--card)' : 'transparent',
        boxShadow: isHovered
          ? '0 10px 40px -10px rgba(0,0,0,0.15), 0 2px 10px -2px rgba(0,0,0,0.08)'
          : '0 0 0 0 transparent',
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* 分隔线：悬停时淡出 */}
      <motion.div
        className="absolute bottom-0 left-5 right-5 bg-border"
        animate={{
          height: 1,
          opacity: isHovered ? 0 : 1,
        }}
        transition={{ duration: 0.3 }}
      />

      <div className="flex items-center justify-between">
        <div>
          <motion.h2
            className="m-0 text-2xl font-bold tracking-tight"
            animate={{
              color: isHovered ? 'var(--foreground)' : '#9ca3af',
            }}
            transition={{ duration: 0.3 }}
          >
            {item.title}
          </motion.h2>

          <motion.p
            className="mt-2 text-sm"
            animate={{
              color: isHovered ? 'var(--muted-foreground)' : '#d1d5db',
            }}
            transition={{ duration: 0.3 }}
          >
            {item.subtitle}
          </motion.p>
        </div>

        {/* 箭头：向左滑出 */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 0 }}
              animate={{ opacity: 1, x: -70 }}
              exit={{ opacity: 0, x: 0 }}
              transition={{ duration: 0.25 }}
            >
              <ArrowRight size={28} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ===== 主组件 =====
export default function InteractiveHoverList({
  items,
  className,
  onItemClick,
}: InteractiveHoverListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className={cn('w-full', className)}>
      {items.map((item) => (
        <HoverItem
          key={item.id}
          item={item}
          isHovered={hoveredId === item.id}
          onHover={() => setHoveredId(item.id)}
          onLeave={() => setHoveredId(null)}
          onClick={() => onItemClick?.(item)}
        />
      ))}
    </div>
  )
}
