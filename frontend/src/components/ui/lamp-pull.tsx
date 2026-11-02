/**
 * [前端 · 展示组件] 下拉灯绳 —— 向下拖动绳子再松手，页面变速滚回顶部。
 *
 * 只用两种状态：绳长（restLen）和是否拖动。拖动时**改变绳子的高度**让绳子
 * 真的被拉长，而不是把整根绳子往下平移——后者看起来像"整块在移动"，不像
 * 拉绳子。松手后绳长 spring 回到原长，同时页面开始缓动滚回顶部。
 *
 * 白绳靠 --lamp-outline 描边在白底上立住轮廓，暗底上则是纯白。
 *
 * 设计文档：docs/design/下拉灯绳回到顶部.md
 * 后端关联：不请求接口。
 */
import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { cn } from '@/lib/utils'

/** 静止时的绳长（px） */
const REST_LENGTH = 48
/** 最大拉伸长度（px），也就是最多能拉长这么多 */
const MAX_PULL = 64
/** 拉过这个比例才算有效，防误触 */
const TRIGGER_RATIO = 0.35
/** 坠子直径（px） */
const BEAD = 12
/** 滚回顶部的时长（ms） */
const SCROLL_MS = 900

/** 缓动：先慢、中段加速、末端减速 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
}

interface LampPullProps {
  /** 无障碍名称 */
  label?: string
  className?: string
}

export function LampPull({ label = '回到顶部', className }: LampPullProps) {
  /** 当前拉伸量：0 = 静止，MAX_PULL = 拉到底 */
  const pull = useMotionValue(0)
  /** 绳子实际高度 = 静止长度 + 拉伸量 —— 关键在于改变 height，而非 translateY */
  const ropeHeight = useTransform(pull, (v) => REST_LENGTH + v)

  const [dragging, setDragging] = useState(false)
  const [scrolling, setScrolling] = useState(false)
  const [hovered, setHovered] = useState(false)
  const startY = useRef(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [])

  /** 用 rAF 变速滚动——原生 behavior:'smooth' 无法自定义曲线 */
  function scrollToTop() {
    const start = window.scrollY
    if (start <= 0) return

    setScrolling(true)
    const t0 = performance.now()

    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / SCROLL_MS)
      // 缓动只作用于「剩余距离」，终点固定为 0（真正的页面顶部）
      window.scrollTo(0, start * (1 - easeInOutCubic(t)))
      if (t < 1) {
        frame.current = requestAnimationFrame(step)
      } else {
        window.scrollTo(0, 0)
        setScrolling(false)
      }
    }
    frame.current = requestAnimationFrame(step)
  }

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (scrolling) return
    e.preventDefault()
    setDragging(true)
    startY.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!dragging) return
    const delta = Math.max(0, e.clientY - startY.current)
    pull.set(Math.min(delta, MAX_PULL))
  }

  function onPointerUp() {
    if (!dragging) return
    setDragging(false)

    const pulled = pull.get()

    // 回弹与滚动同时开始：绳子缩回去的过程就是页面滚上来的过程
    animate(pull, 0, {
      type: 'spring',
      stiffness: 320,
      damping: 18,
    })

    if (pulled > MAX_PULL * TRIGGER_RATIO) scrollToTop()
  }

  const active = dragging || hovered

  return (
    <div className={cn('flex justify-start py-8', className)}>
      {/* 顶部固定点：一个很小的挂环，绳子从这里往下垂 */}
      <button
        type="button"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'group relative flex touch-none select-none flex-col items-center',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--lamp-outline)] focus-visible:ring-offset-2',
          'focus-visible:ring-offset-background',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        {/* 挂环 */}
        <div
          className={cn(
            'box-border h-[5px] w-[9px] rounded-full border bg-transparent',
            'border-[var(--lamp-outline)] transition-colors',
          )}
        />

        {/* 绳身：高度随拉伸变化，这才是「被拉长」。
            用 repeating-linear-gradient 画链节——纯色细线在小尺寸下
            看不出是根绳子，分段后才有链条的质感。
            节距 8px（4 亮 + 4 暗），比 4/3 更疏，不像刻度尺。 */}
        <motion.div
          style={{
            height: ropeHeight,
            backgroundImage:
              'repeating-linear-gradient(to bottom, ' +
              'var(--lamp-rope) 0px, var(--lamp-rope) 4px, ' +
              'var(--lamp-outline) 4px, var(--lamp-outline) 8px)',
            boxShadow: 'inset 0 0 0 1px var(--lamp-outline)',
          }}
          className="w-[4px]"
        />

        {/* 坠子 */}
        <div
          className={cn(
            '-mt-px box-border rounded-full border border-[var(--lamp-outline)]',
            'bg-[var(--lamp-bead)] shadow-[0_1px_3px_rgba(0,0,0,0.15)]',
            'transition-transform duration-150',
            active && 'scale-110',
          )}
          style={{ width: BEAD, height: BEAD }}
        />
      </button>
    </div>
  )
}