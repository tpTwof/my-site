/**
 * [前端 · 页面] 路由 `/admin/posts/new` 与 `/admin/posts/:id/edit` — 新建 / 编辑文章。
 *
 * 两种模式共用本组件：有 :id 为编辑（先拉取再回填），无 :id 为新建。
 * 正文用 SplitEditor 左右分栏（Markdown 源码 + 实时预览）。
 * 新建保存成功后自动切到编辑路由，后续保存走 PUT，不会重复创建。
 *
 * 后端关联：
 *   GET    /api/admin/posts/{id} → PostDetail（含正文），用于回填表单
 *   POST   /api/admin/posts      → 201 PostDetail
 *   PUT    /api/admin/posts/{id} → 200 PostDetail
 *   slug 冲突时后端返回 409，此处以错误条 + toast 展示。
 * ⚠️ 管理端接口当前无鉴权，部署公网前必须补上。
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Save, Send } from 'lucide-react'
import { toast } from 'sonner'
import { createPost, errorMessage, getAdminPost, updatePost } from '@/lib/api'
import { STATUS_LABEL, publicSlug } from '@/lib/post-display'
import type { PostStatus, PostDetail } from '@/types/post'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SplitEditor } from '@/components/split-editor'
import { ErrorBanner } from '@/components/error-banner'

interface FormState {
  title: string
  slug: string
  content: string
  status: PostStatus
}

const EMPTY: FormState = { title: '', slug: '', content: '', status: 'draft' }

/** 后端会回传最终 slug，前端不重复实现同一套生成规则，只描述其行为 */
const SLUG_PLACEHOLDER = '留空则由标题生成（仅英文/数字，中文回退为随机短码）'

function toFormState(post: PostDetail): FormState {
  return {
    title: post.title,
    slug: post.slug,
    content: post.content_markdown,
    status: post.status,
  }
}

export default function AdminPostEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dirty = useRef(false)
  /** 已保存的 slug；只有已发布的文章才有公开链接 */
  const [savedSlug, setSavedSlug] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      // 新建模式：进入页面就处于可编辑状态，无需加载
      setLoading(false)
      return
    }
    let cancelled = false
    getAdminPost(id)
      .then((post) => {
        if (cancelled) return
        setForm(toFormState(post))
        setSavedSlug(publicSlug(post.status, post.slug))
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, '加载失败'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // 有未保存改动时拦截关闭/刷新
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  function patch(next: Partial<FormState>) {
    dirty.current = true
    setForm((prev) => ({ ...prev, ...next }))
  }

  async function save(status: PostStatus) {
    if (!form.title.trim()) {
      setError('标题不能为空')
      toast.error('标题不能为空')
      return
    }
    setSaving(true)
    setError(null)
    const body = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      content_markdown: form.content,
      status,
    }
    try {
      const saved = isEdit && id ? await updatePost(id, body) : await createPost(body)
      dirty.current = false
      // 用服务端返回的数据回填，保证展示的 slug 就是后端真正存下的那个
      setForm(toFormState(saved))
      setSavedSlug(publicSlug(saved.status, saved.slug))

      if (saved.status === 'published') {
        toast.success('已发布', {
          description: `读者现在可以在 /posts/${saved.slug} 看到这篇文章`,
          action: {
            label: '查看',
            onClick: () => window.open(`/posts/${saved.slug}`, '_blank'),
          },
        })
      } else {
        toast.success('草稿已保存', {
          description: '只有你能看到，发布后才会出现在文章列表',
        })
      }

      // 新建成功后切到编辑模式，后续保存走 PUT。表单已由上面的 setForm 回填，
      // 再拉取一次只是对齐路由状态，不会造成前后端数据不一致。
      if (!isEdit) {
        navigate(`/admin/posts/${saved.id}/edit`, { replace: true })
      }
    } catch (err) {
      const message = errorMessage(err, '保存失败')
      setError(message)
      toast.error('保存失败', { description: message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="py-20 text-center text-sm text-muted-foreground">加载中...</p>
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/posts" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            <ArrowLeft className="size-4" />
            返回
          </Link>
          <h1 className="m-0 text-xl font-bold tracking-tight">
            {isEdit ? '编辑文章' : '新建文章'}
          </h1>
          <span className="text-xs text-muted-foreground">{STATUS_LABEL[form.status]}</span>
        </div>

        <div className="flex items-center gap-2">
          {savedSlug && (
            <Link
              to={`/posts/${savedSlug}`}
              target="_blank"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              <ExternalLink className="size-4" />
              查看
            </Link>
          )}
          <Button variant="outline" size="sm" disabled={saving} onClick={() => save('draft')}>
            <Save className="size-4" />
            {saving ? '保存中...' : '保存草稿'}
          </Button>
          <Button size="sm" disabled={saving} onClick={() => save('published')}>
            <Send className="size-4" />
            {saving ? '保存中...' : '发布'}
          </Button>
        </div>
      </header>

      <ErrorBanner message={error} />

      <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <div className="space-y-1.5">
          <Label htmlFor="title">标题</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="文章标题"
            className="text-base"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="slug">Slug（留空自动生成）</Label>
          <Input
            id="slug"
            value={form.slug}
            onChange={(e) => patch({ slug: e.target.value })}
            placeholder={SLUG_PLACEHOLDER}
            className="font-mono text-sm"
          />
        </div>
      </div>

      <SplitEditor value={form.content} onChange={(content) => patch({ content })} />
    </div>
  )
}