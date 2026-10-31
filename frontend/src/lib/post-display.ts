/**
 * [前端 · 工具] 文章状态相关的展示映射。
 *
 * STATUS_LABEL：draft/published → 中文文案，全站共用一份
 * publicSlug：只有已发布文章才有公开 URL
 *
 * 后端关联：输入来自文章接口的 `status` 字段
 *   （取值 'draft' | 'published'，由后端 Literal 校验）。
 */
import type { PostStatus } from '@/types/post'

/** 文章状态的展示文案，全站共用一份 */
export const STATUS_LABEL: Record<PostStatus, string> = {
  published: '已发布',
  draft: '草稿',
}

/** 已发布的文章才有公开 URL，其余返回 null */
export function publicSlug(status: PostStatus, slug: string): string | null {
  return status === 'published' ? slug : null
}