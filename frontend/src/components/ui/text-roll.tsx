/**
 * [前端 · 展示组件] 逐字滚动文字，悬停时上下两行字母依次交错滑出/滑入。
 *
 * 当前用于导航栏的站名「tpTwo」。
 *
 * 后端关联：不请求接口。
 */
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const STAGGER = 0.035

export default function TextRoll({
  children,
  className,
  center = false,
}: {
  children: string
  className?: string
  center?: boolean
}) {
  return (
    <motion.span
      initial="initial"
      whileHover="hovered"
      className={cn(
        "relative inline-block overflow-hidden",
        className
      )}
      style={{
        lineHeight: 1.2,
      }}
    >
      {/* 顶部文字（向上滑动） */}
      <div>
        {children.split("").map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i

          return (
            <motion.span
              variants={{
                initial: { y: 0 },
                hovered: { y: "-100%" },
              }}
              transition={{ ease: "easeInOut", delay }}
              className="inline-block"
              key={i}
            >
              {l}
            </motion.span>
          )
        })}
      </div>

      {/* 底部文字（从下方滑入） */}
      <div className="absolute inset-0">
        {children.split("").map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (children.length - 1) / 2)
            : STAGGER * i

          return (
            <motion.span
              variants={{
                initial: { y: "100%" },
                hovered: { y: 0 },
              }}
              transition={{ ease: "easeInOut", delay }}
              className="inline-block"
              key={i}
            >
              {l}
            </motion.span>
          )
        })}
      </div>
    </motion.span>
  )
}
