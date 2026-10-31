import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPosts } from '@/lib/api'
import type { Post } from '@/types/post'
import InteractiveHoverList from '@/components/ui/interactive-hover-list'
import type { HoverListItem } from '@/components/ui/interactive-hover-list'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function postToHoverItem(post: Post): HoverListItem {
  return {
    id: post.id,
    title: post.title,
    subtitle: formatDate(post.created_at),
    href: `/posts/${post.slug}`,
  }
}

export default function Posts() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    try {
      const data = await getPosts(cursor)
      setPosts((prev) => [...prev, ...data.items])
      setCursor(data.next_cursor ?? undefined)
      setHasMore(data.next_cursor !== null)
    } catch (err) {
      console.error('Failed to load posts:', err)
    } finally {
      loadingRef.current = false
      setLoading(false)
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

  const items = posts.map(postToHoverItem)

  return (
    <div>
      <InteractiveHoverList
        items={items}
        onItemClick={(item) => {
          if (item.href) navigate(item.href)
        }}
      />

      <div ref={loaderRef} className="py-8 text-center text-sm text-muted-foreground">
        {loading && '加载中...'}
        {!loading && !hasMore && posts.length > 0 && '没有更多了'}
        {!loading && !hasMore && posts.length === 0 && '暂无文章'}
      </div>
    </div>
  )
}
