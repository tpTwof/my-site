/**
 * [前端 · 页面] 路由 `/tags/:slug` — 单个标签下的文章列表。
 *
 * 顶部显示标签名与文章数，下方复用 PostCardList，无限滚动。
 * 标签不存在或该标签下没有已发布文章时，跳回 /posts。
 *
 * 后端关联：
 *   GET /api/tags/{slug}/posts?cursor=&limit=  → PostSummaryList
 *   GET /api/tags                              → 用来取标签展示名
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { getPostsByTag, getTags, errorMessage } from '@/lib/api'
import type { PostSummary } from '@/types/post'
import { PostCardList } from '@/components/ui/post-card-list'

export default function PostTags() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [posts, setPosts] = useState<PostSummary[]>([])
  const [tagName, setTagName] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // 取标签展示名与文章数
  useEffect(() => {
    if (!slug) return
    getTags()
      .then((data) => {
        const found = data.items.find((t) => t.slug === slug)
        if (!found) {
          navigate('/posts', { replace: true })
          return
        }
        setTagName(found.name)
        setTotal(found.count)
      })
      .catch((err) => setError(errorMessage(err, '标签加载失败')))
  }, [slug, navigate])

  const loadMore = useCallback(async () => {
    if (!slug || loadingRef.current || !hasMore) return
    loadingRef.current = true
    try {
      const data = await getPostsByTag(slug, cursor, 10)
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...data.items.filter((p) => !seen.has(p.id))]
      })
      setCursor(data.next_cursor ?? undefined)
      setHasMore(data.next_cursor !== null)
      setError(null)
    } catch (err) {
      setError(errorMessage(err, '加载失败'))
    } finally {
      loadingRef.current = false
    }
  }, [slug, cursor, hasMore])

  // 切换标签时重置
  useEffect(() => {
    setPosts([])
    setCursor(undefined)
    setHasMore(true)
    loadingRef.current = false
  }, [slug])

  useEffect(() => {
    loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <div>
      <Link
        to="/posts"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        返回文章列表
      </Link>

      <header className="mb-8 border-b border-border pb-6">
        <h1 className="m-0 text-3xl font-bold tracking-tight">
          <span className="text-[var(--post-accent)]">#</span>
          {tagName ?? slug}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{total} 篇文章</p>
      </header>

      <PostCardList posts={posts} />

      <div ref={loaderRef} className="py-8 text-center text-sm text-muted-foreground">
        {error && <span className="text-destructive">{error}</span>}
        {!error && !hasMore && posts.length === 0 && '暂无文章'}
        {!error && !hasMore && posts.length > 0 && '没有更多了'}
      </div>
    </div>
  )
}