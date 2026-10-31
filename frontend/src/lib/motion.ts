/**
 * [前端 · 工具] 共用的 motion 动画参数。
 *
 * hoverCardAnimate / HOVER_CARD_TRANSITION：悬停卡片浮起效果
 * （上浮 2px + 卡片底色 + 阴影），当前用于管理端文章列表行。
 *
 * 后端关联：不请求接口，纯前端表现。
 */
import type { Transition } from 'motion/react'

/** 悬停浮起时的阴影，亮暗主题共用 */
export const HOVER_CARD_SHADOW =
  '0 10px 40px -10px rgba(0,0,0,0.15), 0 2px 10px -2px rgba(0,0,0,0.08)'

/** 悬停卡片动效：上浮 2px + 卡片底色 + 阴影 */
export function hoverCardAnimate(hovered: boolean) {
  return {
    y: hovered ? -2 : 0,
    backgroundColor: hovered ? 'var(--card)' : 'transparent',
    boxShadow: hovered ? HOVER_CARD_SHADOW : '0 0 0 0 transparent',
  }
}

export const HOVER_CARD_TRANSITION: Transition = { duration: 0.3, ease: 'easeOut' }