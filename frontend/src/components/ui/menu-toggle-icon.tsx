/** 两条线与一个圆点连续变形；共享进度让导航栏与弹层之间的切换保持连贯。 */
import { useEffect } from 'react'
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react'

// 适度欠阻尼：变形略微越过目标再收回，增强拉伸与回弹的张力。
const SPRING = { stiffness: 380, damping: 21, mass: 0.85 }
const DOT_RADIUS = 1.5

export function useMenuIconMotion(open: boolean, active: boolean) {
  const reducedMotion = useReducedMotion()
  const opening = useSpring(open ? 1 : 0, SPRING)
  const interaction = useSpring(active ? 1 : 0, SPRING)

  useEffect(() => {
    if (reducedMotion) {
      opening.jump(Number(open))
      interaction.jump(Number(active))
    } else {
      opening.set(Number(open))
      interaction.set(Number(active))
    }
  }, [open, active, reducedMotion, opening, interaction])

  // 打开且移开鼠标时，上线收成左上圆点，下线保留为 /，右下圆点浮现。
  const topX1 = useTransform(() =>
    (2 - interaction.get()) * (1 - opening.get())
    + (5.5 - 1.5 * interaction.get()) * opening.get(),
  )
  const topY1 = useTransform(() =>
    (8 - interaction.get()) * (1 - opening.get())
    + (5.5 - 1.5 * interaction.get()) * opening.get(),
  )
  const topX2 = useTransform(() =>
    (22 - 10 * interaction.get()) * (1 - opening.get())
    + (5.5 + 14.5 * interaction.get()) * opening.get(),
  )
  const topY2 = useTransform(() =>
    (8 - interaction.get()) * (1 - opening.get())
    + (5.5 + 14.5 * interaction.get()) * opening.get(),
  )
  const bottomX1 = useTransform(() => (2 - interaction.get()) * (1 - opening.get()) + 4 * opening.get())
  const bottomY1 = useTransform(() => (16 + interaction.get()) * (1 - opening.get()) + 20 * opening.get())
  const bottomX2 = useTransform(() => (22 + interaction.get()) * (1 - opening.get()) + 20 * opening.get())
  const bottomY2 = useTransform(() => (16 + interaction.get()) * (1 - opening.get()) + 4 * opening.get())
  const dotX = useTransform(() => 22 - 3.5 * opening.get())
  const dotY = useTransform(() => (8 - interaction.get()) * (1 - opening.get()) + 18.5 * opening.get())
  const dotOpacity = useTransform(() =>
    (1 - opening.get()) * interaction.get() + opening.get() * (1 - interaction.get()),
  )
  const scale = useTransform(() => 1 + 0.1 * interaction.get() + 0.04 * opening.get())
  const topStrokeWidth = useTransform(() =>
    2 + (DOT_RADIUS * 2 - 2) * opening.get() * (1 - interaction.get()),
  )

  return { topX1, topY1, topX2, topY2, topStrokeWidth, bottomX1, bottomY1, bottomX2, bottomY2, dotX, dotY, dotOpacity, scale }
}

export function MenuToggleIcon({ animation }: { animation: ReturnType<typeof useMenuIconMotion> }) {
  return (
    <motion.svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="pointer-events-none size-7 overflow-visible"
      style={{ scale: animation.scale }}
    >
      <motion.line x1={animation.topX1} y1={animation.topY1} x2={animation.topX2} y2={animation.topY2} strokeWidth={animation.topStrokeWidth} />
      <motion.line x1={animation.bottomX1} y1={animation.bottomY1} x2={animation.bottomX2} y2={animation.bottomY2} />
      <motion.circle cx={animation.dotX} cy={animation.dotY} r={DOT_RADIUS} fill="currentColor" stroke="none" style={{ opacity: animation.dotOpacity }} />
    </motion.svg>
  )
}
