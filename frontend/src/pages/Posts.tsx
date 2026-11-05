/**
 * [前端 · 页面] 路由 `/posts` — 公开博客列表（带标签侧栏与标签搜索）。
 *
 * 布局：标签侧栏**固定在视口左侧**（不在正文容器内），正文文章列表
 * 仍按原来的 max-w-5xl 居中，宽度不受侧栏影响。
 * 无限滚动（IntersectionObserver + 游标分页），只展示已发布文章。
 *
 * 筛选状态放在 URL 里（?tag=java&q=sql），因此可分享、可刷新、
 * 浏览器前进后退可用。切换筛选时清空游标、回到第一页、滚到顶部。
 *
 * 后端关联：
 *   GET /api/tags               → 标签列表与各标签文章数
 *   GET /api/posts?tag=&cursor= → 文章列表（tag 可选）
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

  /** 提交搜索。只影响左侧标签列表，不改动文章筛选 */
  function submitSearch(query: string) {
    const next = new URLSearchParams(params)
    if (query) next.set('q', query)
    else next.delete('q')
    setParams(next, { replace: true })
    window.scrollTo(0, 0)
  }

  return (
    /*
      侧栏与正文放在同一个居中容器里：容器宽度 = 侧栏 224 + 间距 48 + 正文 1024，
      整体 mx-auto 居中，所以侧栏永远紧贴正文左侧，不会在宽屏下被甩到边缘。
      窄屏时容器变窄，侧栏回到文档流排在上方（见 TagSidebar 的 lg: 断点）。
    */
    <div className="mx-auto max-w-5xl lg:flex lg:max-w-[1296px] lg:gap-12">
      <TagSidebar
        tags={tags}
        total={total}
        activeSlug={activeTag}
        query={searchQuery}
        onSearch={submitSearch}
      />

      {/* 正文保持 max-w-5xl，与其它页面宽度一致 */}
      <div className="min-w-0 max-w-5xl flex-1">
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