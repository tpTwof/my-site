import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getAdminPosts, deletePost } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { PostStatus, PostSummary } from '@/types/post'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Filter = 'all' | PostStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '草稿' },
]

export default function AdminPostList() {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async (nextFilter: Filter) => {
    setLoading(true)
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
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(filter)
  }, [filter, load])

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

      <div className="flex gap-2">
        {FILTERS.map(({ value, label }) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading && <p className="py-16 text-center text-sm text-muted-foreground">加载中...</p>}

      {!loading && posts.length === 0 && !error && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          还没有文章，点右上角「新建文章」开始写吧。
        </p>
      )}

      <ul className="m-0 divide-y divide-border rounded-xl border border-border p-0">
        {posts.map((post) => (
          <li key={post.id} className="flex items-center gap-4 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{post.title}</span>
                <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                  {post.status === 'published' ? '已发布' : '草稿'}
                </Badge>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                <span className="truncate">/posts/{post.slug}</span>
                <span className="shrink-0">{formatDate(post.created_at)}</span>
              </div>
            </div>

            <div className="flex shrink-0 gap-1">
              <Link
                to={`/admin/posts/${post.id}/edit`}
                className={buttonVariants({ size: 'sm', variant: 'ghost' })}
              >
                <Pencil className="size-3.5" />
                编辑
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={deletingId === post.id}
                onClick={() => handleDelete(post)}
              >
                <Trash2 className="size-3.5" />
                {deletingId === post.id ? '删除中' : '删除'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}