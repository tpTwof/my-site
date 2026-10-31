import { useCallback, useEffect, useRef, useState } from 'react'
import { getPosts } from '@/lib/api'
import type { PostSummary } from '@/types/post'
import { PostCardList } from '@/components/ui/post-card-list'

export default function Posts() {
  const [posts, setPosts] = useState<PostSummary[]>([])
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    try {
      const data = await getPosts(cursor)
      // 游标分页在并发插入时可能返回重复条目，按 id 去重
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...data.items.filter((p) => !seen.has(p.id))]
      })
      setCursor(data.next_cursor ?? undefined)
      setHasMore(data.next_cursor !== null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      loadingRef.current = false
    }
  }, [cursor, hasMore])

  useEffect(() => {
    loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      <PostCardList posts={posts} />

      <div ref={loaderRef} className="py-8 text-center text-sm text-muted-foreground">
        {error && <span className="text-destructive">{error}</span>}
        {!error && !hasMore && posts.length === 0 && '暂无文章'}
        {!error && !hasMore && posts.length > 0 && '没有更多了'}
      </div>
    </div>
  )
}