/**
 * [前端 · 展示组件] 文章列表页左侧的标签栏，含搜索框。
 *
 * 结构：
 *   - 顶部搜索框 + 「搜索」按钮。**点击按钮或回车**才生效，不做实时搜索
 *   - 搜索只过滤下方的标签列表，不影响右侧文章列表
 *   - 关键词没有匹配到任何标签时，列表留空
 *   - 「All」置顶，显示已发布文章总数
 *   - 每个标签右侧是它名下已发布文章数
 *
 * 后端关联：数据来自 GET /api/tags（TagList，含 total）。
 */
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { TagCount } from '@/types/post'

interface TagSidebarProps {
  /** 所有标签（已按文章数降序） */
  tags: TagCount[]
  /** 已发布文章总数，给「All」用 */
  total: number
  /** 当前选中的标签 slug；null = All */
  activeSlug: string | null
  /** 已提交的搜索词，用于回填输入框 */
  query: string
  /** 点击标签 */
  onSelect: (slug: string | null) => void
  /** 提交搜索词（空字符串 = 清除搜索） */
  onSearch: (query: string) => void
}

export function TagSidebar({
  tags,
  total,
  activeSlug,
  query,
  onSelect,
  onSearch,
}: TagSidebarProps) {
  const [draft, setDraft] = useState(query)

  // URL 里的搜索词变化时（前进/后退）同步输入框
  useEffect(() => {
    setDraft(query)
  }, [query])

  const keyword = query.trim().toLowerCase()
  const visible = keyword
    ? tags.filter(
        (t) =>
          t.name.toLowerCase().includes(keyword) ||
          t.slug.toLowerCase().includes(keyword),
      )
    : tags

  return (
    <aside className="w-full lg:sticky lg:top-32 lg:w-60 lg:shrink-0">
      {/* 搜索：点按钮或回车才触发 */}
      <form
        className="mb-6 flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          onSearch(draft.trim())
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="搜索标签"
          aria-label="搜索标签"
          className={cn(
            'h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2',
            'text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        />
        <button
          type="submit"
          className={cn(
            'h-8 shrink-0 rounded-md border border-border px-3 text-sm',
            'transition-colors hover:bg-accent hover:text-accent-foreground',
          )}
        >
          搜索
        </button>
      </form>

      <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Categories
      </h2>

      <nav className="flex flex-col">
        <TagRow
          label="All"
          count={total}
          active={activeSlug === null}
          onClick={() => onSelect(null)}
        />
        {visible.map((tag) => (
          <TagRow
            key={tag.slug}
            label={tag.name}
            count={tag.count}
            active={activeSlug === tag.slug}
            onClick={() => onSelect(tag.slug)}
          />
        ))}
      </nav>
    </aside>
  )
}

/** 单个标签行。选中的左侧有红条，未选中的用透明边框占位避免文字跳动。 */
function TagRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex items-center justify-between gap-2 border-l-[3px] py-2 pl-2.5 pr-1 text-left',
        'text-sm transition-colors',
        active
          ? 'border-l-[var(--post-accent)] font-semibold text-[var(--post-body)]'
          : 'border-l-transparent text-[var(--post-link)] hover:text-[var(--post-link-hover)]',
      )}
    >
      <span className="truncate">{label}</span>
      <span className="shrink-0 rounded-full bg-[var(--post-rule)] px-1.5 py-0.5 text-xs text-[var(--post-muted)]">
        {count}
      </span>
    </button>
  )
}