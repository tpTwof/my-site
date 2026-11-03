/**
 * [前端 · 页面] 路由 `/posts` — 公开博客列表（带标签侧栏与标签搜索）。
 *
 * 布局：左侧标签栏（含搜索），右侧文章列表。
 * 无限滚动（IntersectionObserver + 游标分页），只展示已发布文章。
 *
 * 筛选状态放在 URL 里（?tag=java&q=sql），因此可分享、可刷新、
 * 浏览器前进后退可用。切换筛选时清空游标、回到第一页、滚到顶部。
 *
 * 后端关联：
 *   GET /api/tags                    → 标签列表与各标签文章数
 *   GET /api/posts?tag=&cursor=      → 文章列表（tag 可选）
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getPosts, getTags, errorMessage } from '@/lib/api'
import type { PostSummary, TagCount } from '@/types/post'
import { PostCardList } from '@/components/ui/post-card-list'
import { TagSidebar } from '@/components/ui/tag-sidebar'

export default function Posts() {
  const [params, setParams] = useSearchParams()
  const activeTag = params.get('tag')
  const searchQuery = params.get('q') ?? ''

  const [posts, setPosts] = useState<PostSummary[]>([])
  const [tags, setTags] = useState<TagCount[]>([])
  const [total, setTotal] = useState(0)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // 标签列表只在挂载时取一次
  useEffect(() => {
    getTags()
      .then((data) => {
        setTags(data.items)
        setTotal(data.total)
      })
      .catch((err) => setError(errorMessage(err, '标签加载失败')))
  }, [])

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    try {
      // 每次请求都带上当前标签，否则翻页会串到别的标签里
      const data = await getPosts(cursor, 10, activeTag ?? undefined)
      // 游标分页在并发插入时可能返回重复条目，按 id 去重
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
  }, [cursor, hasMore, activeTag])

  // 切换标签：清空列表与游标，从第一页重新拉
  useEffect(() => {
    setPosts([])
    setCursor(undefined)
    setHasMore(true)
    setError(null)
    loadingRef.current = false
  }, [activeTag])

  useEffect(() => {
    loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag])

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

  /** 切换标签。搜索词保留——它只管左侧列表，与文章无关 */
  function selectTag(slug: string | null) {
    const next = new URLSearchParams(params)
    if (slug) next.set('tag', slug)
    else next.delete('tag')
    setParams(next, { replace: true })
    window.scrollTo(0, 0)
  }

  /** 提交搜索。只影响左侧标签列表，不改动文章筛选 */
  function submitSearch(query: string) {
    const next = new URLSearchParams(params)
    if (query) next.set('q', query)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
      <TagSidebar
        tags={tags}
        total={total}
        activeSlug={activeTag}
        query={searchQuery}
        onSelect={selectTag}
        onSearch={submitSearch}
      />

      <div className="min-w-0 flex-1">
        {activeTag && (
          <p className="mb-4 text-sm text-muted-foreground">
            标签筛选：<span className="text-[var(--post-link)]">#{activeTag}</span>
          </p>
        )}

        <PostCardList posts={posts} />

        <div ref={loaderRef} className="py-8 text-center text-sm text-muted-foreground">
          {error && <span className="text-destructive">{error}</span>}
          {!error && !hasMore && posts.length === 0 && '暂无文章'}
          {!error && !hasMore && posts.length > 0 && '没有更多了'}
        </div>
      </div>
    </div>
  )
}