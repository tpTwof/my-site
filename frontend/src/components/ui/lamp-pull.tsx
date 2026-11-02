/**
 * [前端 · 展示组件] 下拉灯绳 —— 向下拖动绳子再松手，页面变速滚回顶部。
 *
 * 只渲染绳子本身（细链 + 坠子），不含灯具。白绳靠 --lamp-outline 描边在
 * 白底上立住轮廓，暗底上则是纯白。
 *
 * 设计文档：docs/design/下拉灯绳回到顶部.md
 * 后端关联：不请求接口。
 */
import { useEffect, useRef, useState } from 'react'
import { animate, motion, useAnimation, useMotionValue } from 'motion/react'
import { cn } from '@/lib/utils'

/** 静止时的绳长（px） */
const REST_LENGTH = 48
/** 最大拉伸长度（px） */
const MAX_PULL = 64
/** 拉过这个比例才算有效，防误触 */
const TRIGGER_RATIO = 0.35
/** 坠子直径（px） */
const BEAD = 12
/** 滚回顶部的时长（ms） */
const SCROLL_MS = 900

/** 缓存：先慢、中段加速、末端减速 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
}

interface LampPullProps {
  /** 无障碍名称 */
  label?: string
  className?: string
}

export function LampPull({ label = '回到顶部', className }: LampPullProps) {
  const controls = useAnimation()
  const pull = useMotionValue(0)
  const [dragging, setDragging] = useState(false)
  const [scrolling, setScrolling] = useState(false)
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
      // 缓动只作用于"剩余距离"，终点固定为 0（真正的页面顶部）
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
    const value = Math.min(delta, MAX_PULL)
    pull.set(value)
    controls.set({ y: value })
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
      onUpdate: (v) => controls.set({ y: v }),
      onComplete: () => controls.set({ y: 0 }),
    })

    if (pulled > MAX_PULL * TRIGGER_RATIO) scrollToTop()
  }

  return (
    <div className={cn('flex justify-start py-6', className)}>
      <button
        type="button"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={cn(
          'group relative flex touch-none select-none flex-col items-center',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-[var(--lamp-outline)] focus-visible:ring-offset-2',
          'focus-visible:ring-offset-background',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
      >
        <motion.div animate={controls} className="flex flex-col items-center">
          {/* 绳身：3px 白线 + 左右各 1px 描边，总宽 5px */}
          <div
            className={cn(
              'box-border w-[3px] border-x border-[var(--lamp-outline)]',
              'bg-[var(--lamp-rope)]',
            )}
            style={{ height: REST_LENGTH }}
          />
          {/* 坠子：同色靠描边成形，极淡投影避免纯白区融掉 */}
          <div
            className={cn(
              '-mt-px box-border rounded-full border border-[var(--lamp-outline)]',
              'bg-[var(--lamp-bead)] shadow-[0_1px_2px_rgba(0,0,0,0.12)]',
              'transition-transform group-active:scale-90',
            )}
            style={{ width: BEAD, height: BEAD }}
          />
        </motion.div>
      </button>
    </div>
  )
}