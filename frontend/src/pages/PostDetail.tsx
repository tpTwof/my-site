/**
 * [前端 · 页面] 路由 `/posts/:slug` — 公开文章详情。
 *
 * 用 react-markdown 渲染正文（GFM 表格/任务列表 + highlight.js 代码高亮）。
 * 顶部有返回列表的链接，底部是上一篇/下一篇（顺序与列表一致）。
 *
 * 后端关联：GET /api/posts/{slug}
 *   → PublicPostDetail（含 content_markdown 正文 + previous/next 相邻文章）。
 *   文章不存在或仍是草稿时后端返回 404，此处重定向回 /posts。
 */
import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { getPost } from '@/lib/api'
import { cn, formatCardDate } from '@/lib/utils'
import { LampPull } from '@/components/ui/lamp-pull'
import type { PublicPostDetail } from '@/types/post'

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<PublicPostDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    // 切换文章时先清掉旧内容，避免上一篇的正文短暂残留
    setPost(null)
    window.scrollTo(0, 0)
    getPost(slug)
      .then(setPost)
      .catch((err) => {
        console.error(err)
        navigate('/posts', { replace: true })
      })
      .finally(() => setLoading(false))
  }, [slug, navigate])

  if (loading) {
    return <p className="py-20 text-center text-muted-foreground">加载中...</p>
  }

  if (!post) return null

  return (
    <article>
      <Link
        to="/posts"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        返回列表
      </Link>

      <header className="mb-8 border-b border-border pb-6">
        <h1 className="m-0 text-3xl font-bold tracking-tight">{post.title}</h1>
        <time className="mt-2 block text-sm text-muted-foreground">
          {formatCardDate(post.created_at)}
        </time>
        {post.tags.length > 0 && <PostTags tags={post.tags} />}
      </header>

      <div className="prose prose-neutral max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {post.content_markdown}
        </ReactMarkdown>
      </div>

      {/* 灯绳在上一篇/下一篇之上，整体靠左 */}
      <LampPull />

      <PostNeighbours previous={post.previous} next={post.next} />
    </article>
  )
}

/** 文章标签行，显示在日期下方。点击跳到该标签的文章列表。 */
function PostTags({ tags }: { tags: PublicPostDetail['tags'] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {tags.map((tag, i) => (
        <span key={tag.slug} className="inline-flex items-center gap-2">
          {i > 0 && <span className="text-muted-foreground">,</span>}
          <Link
            to={`/tags/${encodeURIComponent(tag.slug)}`}
            className={cn(
              'text-[var(--post-link)] transition-colors',
              'hover:text-[var(--post-link-hover)] hover:underline',
            )}
          >
            #{tag.name}
          </Link>
        </span>
      ))}
    </div>
  )
}

/** 文章底部的上一篇/下一篇。都没有时不渲染整块。 */
function PostNeighbours({
  previous,
  next,
}: {
  previous: PublicPostDetail['previous']
  next: PublicPostDetail['next']
}) {
  if (!previous && !next) return null

  // 颜色沿用 --post-link 系列，与文章列表的链接保持一致
  const linkClass =
    'text-[var(--post-link)] transition-colors hover:text-[var(--post-link-hover)] hover:underline'

  return (
    <nav className="mt-16 flex flex-col gap-4 border-t border-border pt-8 text-sm sm:flex-row sm:justify-between">
      <div className="min-w-0 sm:max-w-[45%]">
        {previous && (
          <Link
            to={`/posts/${previous.slug}`}
            className="group inline-flex items-start gap-1.5"
          >
            <ArrowLeft className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="text-muted-foreground">上一篇：</span>
              <span className={linkClass}>{previous.title}</span>
            </span>
          </Link>
        )}
      </div>

      <div className="min-w-0 sm:max-w-[45%] sm:text-right">
        {next && (
          <Link
            to={`/posts/${next.slug}`}
            className="group inline-flex items-start gap-1.5"
          >
            <ArrowRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="text-muted-foreground">下一篇：</span>
              <span className={linkClass}>{next.title}</span>
            </span>
          </Link>
        )}
      </div>
    </nav>
  )
}