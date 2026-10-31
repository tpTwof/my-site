import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getAdminPosts, deletePost } from '@/lib/api'
import { formatCardDate } from '@/lib/utils'
import type { PostStatus, PostSummary } from '@/types/post'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NavTabs } from '@/components/ui/nav-tabs'
import type { NavTabItem } from '@/components/ui/nav-tabs'
import { cn } from '@/lib/utils'

type Filter = 'all' | PostStatus

const FILTERS: NavTabItem<Filter>[] = [
  { value: 'all', label: '全部' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
]

export default function AdminPostList() {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  /** 仅首次加载时为 true；之后切换过滤不卸载列表，避免页面高度跳动 */
  const [initialLoading, setInitialLoading] = useState(true)
  /** 切换过滤时的轻提示，不改变列表布局 */
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const hasLoadedOnce = useRef(false)

  const load = useCallback(async (nextFilter: Filter) => {
    if (hasLoadedOnce.current) setRefreshing(true)
    setError(null)
    try {
      // 分页上限 50；个人博客文章量在合理范围内可一次拉全
      const data = await getAdminPosts(
        undefined,
        50,
        nextFilter === 'all' ? undefined : nextFilter,
      )
      setPosts(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      hasLoadedOnce.current = true
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load(filter)
  }, [filter, load])

  /**
   * 切换过滤时回到顶部。
   *
   * 过滤后条目数不同（如 9 篇 → 1 篇），列表高度骤减时浏览器会强制把
   * scrollY 回滚，表现为页面「震一下」。显式滚动让这个变化变成可预期的行为。
   */
  function changeFilter(next: Filter) {
    if (next === filter) return
    setFilter(next)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  async function handleDelete(post: PostSummary) {
    if (!confirm(`确认删除《${post.title}》？此操作不可恢复。`)) return
    setDeletingId(post.id)
    try {
      await deletePost(post.id)
      setPosts((prev) => prev.filter((p) => p.id !== post.id))
      toast.success('已删除', { description: `《${post.title}》` })
    } catch (err) {
      const message = err instanceof Error ? err.message : '删除失败'
      setError(message)
      toast.error('删除失败', { description: message })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-bold tracking-tight">文章管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">共 {posts.length} 篇</p>
        </div>
        <Link to="/admin/posts/new" className={buttonVariants()}>
          <Plus className="size-4" />
          新建文章
        </Link>
      </header>

      <NavTabs items={FILTERS} value={filter} onChange={changeFilter} />

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {initialLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">加载中...</p>
      )}

      {!initialLoading && posts.length === 0 && !error && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          还没有文章，点右上角「新建文章」开始写吧。
        </p>
      )}

      <ul
        className={cn(
          'm-0 list-none p-0 transition-opacity',
          refreshing && 'opacity-50',
        )}
      >
        {posts.map((post) => (
          <PostRow
            key={post.id}
            post={post}
            deleting={deletingId === post.id}
            onDelete={() => handleDelete(post)}
          />
        ))}
      </ul>
    </div>
  )
}

function PostRow({
  post,
  deleting,
  onDelete,
}: {
  post: PostSummary
  deleting: boolean
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{
        y: hovered ? -2 : 0,
        backgroundColor: hovered ? 'var(--card)' : 'transparent',
        boxShadow: hovered
          ? '0 10px 40px -10px rgba(0,0,0,0.15), 0 2px 10px -2px rgba(0,0,0,0.08)'
          : '0 0 0 0 transparent',
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="relative flex items-center gap-4 rounded-xl px-5 py-4"
    >
      {/* 分隔线：悬停时淡出，由卡片阴影接替 */}
      <motion.div
        className="absolute inset-x-5 bottom-0 h-px bg-border"
        animate={{ opacity: hovered ? 0 : 1 }}
        transition={{ duration: 0.3 }}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <motion.span
            className="truncate text-lg font-semibold"
            animate={{ color: hovered ? 'var(--foreground)' : 'var(--muted-foreground)' }}
            transition={{ duration: 0.3 }}
          >
            {post.title}
          </motion.span>
          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
            {post.status === 'published' ? '已发布' : '草稿'}
          </Badge>
        </div>
        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
          <span className="truncate">/posts/{post.slug}</span>
          <span className="shrink-0">{formatCardDate(post.created_at)}</span>
        </div>
      </div>

      {/* 操作区：悬停时滑入，替代原组件的右箭头 */}
      <motion.div
        className="flex shrink-0 items-center gap-1"
        animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
      >
        <Link
          to={`/admin/posts/${post.id}/edit`}
          aria-label="编辑"
          title="编辑"
          className={buttonVariants({ size: 'icon-sm', variant: 'ghost' })}
        >
          <Pencil className="size-4" />
        </Link>
        <button
          type="button"
          aria-label="删除"
          title="删除"
          disabled={deleting}
          onClick={onDelete}
          className={cn(
            buttonVariants({ size: 'icon-sm', variant: 'ghost' }),
            'text-destructive hover:text-destructive disabled:opacity-50',
          )}
        >
          <Trash2 className="size-4" />
        </button>
      </motion.div>
    </motion.li>
  )
}