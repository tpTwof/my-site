/**
 * [前端 · 页面] 路由 `/posts/:slug` — 公开文章详情。
 *
 * 用 react-markdown 渲染正文（GFM 表格/任务列表 + highlight.js 代码高亮）。
 *
 * 后端关联：GET /api/posts/{slug}
 *   → PostDetail（含 content_markdown 正文）。
 *   文章不存在或仍是草稿时后端返回 404，此处重定向回 /posts。
 */
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { getPost } from '@/lib/api'
import { formatCardDate } from '@/lib/utils'
import type { PostDetail as PostDetailData } from '@/types/post'

export default function PostDetail() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<PostDetailData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
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
      <header className="mb-8 border-b border-border pb-6">
        <h1 className="m-0 text-3xl font-bold tracking-tight">{post.title}</h1>
        <time className="mt-2 block text-sm text-muted-foreground">
          {formatCardDate(post.created_at)}
        </time>
      </header>

      <div className="prose prose-neutral max-w-none dark:prose-invert">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {post.content_markdown}
        </ReactMarkdown>
      </div>
    </article>
  )
}