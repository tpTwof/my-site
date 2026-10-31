import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPosts } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { PostSummary } from '@/types/post'
import InteractiveHoverList from '@/components/ui/interactive-hover-list'
import type { HoverListItem } from '@/components/ui/interactive-hover-list'

function toHoverItem(post: PostSummary): HoverListItem {
  return {
    id: post.id,
    title: post.title,
    subtitle: formatDate(post.created_at),
    href: `/posts/${post.slug}`,
  }
}

export default function Posts() {
  const navigate = useNavigate()
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
      // 去重：游标分页在并发插入时可能返回重复条目
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
      <InteractiveHoverList
        items={posts.map(toHoverItem)}
        onItemClick={(item) => item.href && navigate(item.href)}
      />

      <div ref={loaderRef} className="py-8 text-center text-sm text-muted-foreground">
        {error && <span className="text-destructive">{error}</span>}
        {!error && !hasMore && posts.length === 0 && '暂无文章'}
        {!error && !hasMore && posts.length > 0 && '没有更多了'}
      </div>
    </div>
  )
}