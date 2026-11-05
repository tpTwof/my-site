/**
 * [前端 · 页面] 路由 `/tags/:slug` — 单个标签下的文章列表。
 *
 * 布局与 /posts 一致：标签侧栏固定贴左（All 为当前选中），正文保持原宽度。
 * 下面是与 Posts 相同的文章列表，无限滚动。
 *
 * 标签不存在时跳回 /posts。
 *
 * 后端关联：
 *   GET /api/tags                       → 侧栏数据
 *   GET /api/tags/{slug}/posts?cursor=  → 该标签下的文章
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getPostsByTag, getTags, errorMessage } from '@/lib/api'
import type { PostSummary, TagCount } from '@/types/post'
import { PostCardList } from '@/components/ui/post-card-list'
import { TagSidebar } from '@/components/ui/tag-sidebar'

export default function PostTags() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const [posts, setPosts] = useState<PostSummary[]>([])
  const [tags, setTags] = useState<TagCount[]>([])
  const [total, setTotal] = useState(0)
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  // 侧栏数据 + 校验标签是否存在
  useEffect(() => {
    getTags()
      .then((data) => {
        const found = data.items.find((t) => t.slug === slug)
        if (!found) {
          navigate('/posts', { replace: true })
          return
        }
        setTags(data.items)
        setTotal(data.total)
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

  // 切换标签时重置列表
  useEffect(() => {
    setPosts([])
    setCursor(undefined)
    setHasMore(true)
    setError(null)
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
    /* 与 /posts 相同：正文居中，侧栏贴在正文左侧 272px 的预留区域内 */
    <div className="mx-auto max-w-5xl lg:relative lg:max-w-[1296px]">
      <TagSidebar
        tags={tags}
        total={total}
        activeSlug={slug ?? null}
        query=""
        // 标签页不做标签搜索，忽略提交
        onSearch={() => undefined}
      />

      <div className="lg:pl-[272px]">
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