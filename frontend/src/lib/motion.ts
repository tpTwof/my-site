import type { Transition } from 'motion/react'

/**
 * 悬停卡片动效：上浮 2px + 卡片底色 + 阴影。
 *
 * 同一个效果在两处使用（管理端列表行、以及此前的 interactive-hover-list），
 * 抽成常量避免两处各写一份后逐渐走样。
 */
export const HOVER_CARD_SHADOW =
  '0 10px 40px -10px rgba(0,0,0,0.15), 0 2px 10px -2px rgba(0,0,0,0.08)'

export function hoverCardAnimate(hovered: boolean) {
  return {
    y: hovered ? -2 : 0,
    backgroundColor: hovered ? 'var(--card)' : 'transparent',
    boxShadow: hovered ? HOVER_CARD_SHADOW : '0 0 0 0 transparent',
  }
}

export const HOVER_CARD_TRANSITION: Transition = { duration: 0.3, ease: 'easeOut' }