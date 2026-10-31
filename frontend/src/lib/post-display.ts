import type { PostStatus } from '@/types/post'

/** 文章状态的展示文案与徽章样式，全站共用一份 */
export const STATUS_LABEL: Record<PostStatus, string> = {
  published: '已发布',
  draft: '草稿',
}

/** 已发布的文章才有公开 URL，其余返回 null */
export function publicSlug(status: PostStatus, slug: string): string | null {
  return status === 'published' ? slug : null
}