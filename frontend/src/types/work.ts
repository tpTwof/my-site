export const WORK_CATEGORIES = { explainer: '交互讲解', experiment: '实验', project: '项目' } as const
export type WorkCategory = keyof typeof WORK_CATEGORIES
export interface WorkInput {
  title: string
  slug: string
  description: string
  category: WorkCategory
  tags: string
  status: 'draft' | 'published'
  featured: boolean
}
export interface Work extends WorkInput {
  id: string
  file_count: number
  package_size: number
  created_at: string
  updated_at: string
}
export interface Overview {
  posts: { draft: number; published: number }
  works: { draft: number; published: number }
}
