/**
 * [前端 · 展示组件] 文章列表页左侧的标签栏，含搜索框。
 *
 * 定位：**固定在视口左侧**，不在正文容器内——正文仍按原来的 max-w-5xl
 * 居中显示，宽度不受侧栏影响。窄屏（< lg）时退回普通文档流，位于列表上方。
 *
 * 悬停效果与文章列表一致：红色左边条从 0 展开，同时文字右移；选中项
 * 则常驻红条。
 *
 * 搜索框：**点按钮或回车**才生效，不做实时搜索。
 * 搜索只过滤下方的标签列表，不影响右侧文章列表。
 *
 * 后端关联：数据来自 GET /api/tags（TagList，含 total）。
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  /** 提交搜索词（空字符串 = 清除搜索） */
  onSearch: (query: string) => void
}

export function TagSidebar({
  tags,
  total,
  activeSlug,
  query,
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
    <>
      {/*
        lg 以上：固定贴左边，不占正文容器的宽度。
        w-56 + left-6，与正文容器的 px-6 对齐。
      */}
      <aside
        className={cn(
          'mb-8 lg:fixed lg:top-40 lg:left-6 lg:z-10 lg:mb-0 lg:max-h-[calc(100vh-12rem)]',
          'lg:w-56 lg:overflow-y-auto',
        )}
      >
        <SearchBox value={draft} onChange={setDraft} onSubmit={() => onSearch(draft.trim())} />

        <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Categories
        </h2>

        <nav className="flex flex-col">
          <TagRow
            label="All"
            count={total}
            active={activeSlug === null}
            href="/posts"
          />
          {visible.map((tag) => (
            <TagRow
              key={tag.slug}
              label={tag.name}
              count={tag.count}
              active={activeSlug === tag.slug}
              href={`/tags/${encodeURIComponent(tag.slug)}`}
            />
          ))}
        </nav>
      </aside>
    </>
  )
}

function SearchBox({
  value,
  onChange,
  onSubmit,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <form
      className="mb-6 flex gap-1.5"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  )
}

/**
 * 单个标签行。
 *
 * 红条从 0 展开到 3px：用一个宽度从 0 过渡的 span 实现，而不是 border，
 * 因为 border 的宽度变化会带动布局位移，视觉上像文字在抖。
 * 文字同步右移，与文章列表的悬停行为一致。
 */
function TagRow({
  label,
  count,
  active,
  href,
}: {
  label: string
  count: number
  active: boolean
  href: string
}) {
  return (
    <Link
      to={href}
      aria-current={active ? 'true' : undefined}
      className="group relative flex items-center justify-between gap-2 py-2 pr-1"
    >
      {/* 红条：宽度 0 → 3px */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 left-0 w-0 bg-[var(--post-accent)]',
          'transition-[width] duration-300 ease-linear',
          active ? 'w-[3px]' : 'group-hover:w-[3px]',
        )}
      />
      <span
        className={cn(
          'truncate pl-2.5 text-sm transition-[padding,color] duration-300 ease-linear',
          active
            ? 'font-semibold text-[var(--post-body)]'
            : 'text-[var(--post-link)] group-hover:pl-4 group-hover:text-[var(--post-link-hover)]',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'shrink-0 rounded-full bg-[var(--post-rule)] px-1.5 py-0.5',
          'text-xs text-[var(--post-muted)]',
        )}
      >
        {count}
      </span>
    </Link>
  )
}