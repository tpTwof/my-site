import React from "react"
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
