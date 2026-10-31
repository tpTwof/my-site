import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Save, Send } from 'lucide-react'
import { createPost, getAdminPost, updatePost } from '@/lib/api'
import type { PostStatus } from '@/types/post'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SplitEditor } from '@/components/split-editor'

interface FormState {
  title: string
  slug: string
  content: string
  status: PostStatus
}

const EMPTY: FormState = { title: '', slug: '', content: '', status: 'draft' }

/** 与后端 slugify 规则保持一致的提示；实际生成以后端为准 */
function slugHint(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || '（中文标题将由后端生成随机短码）'
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
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  /** 刚保存完的 id；此时路由变化不需要再次拉取 */
  const skipFetchFor = useRef<string | null>(null)

  useEffect(() => {
    if (!id) return
    if (skipFetchFor.current === id) {
      skipFetchFor.current = null
      return
    }
    setLoading(true)
    getAdminPost(id)
      .then((post) => {
        setForm({
          title: post.title,
          slug: post.slug,
          content: post.content_markdown,
          status: post.status,
        })
        setSavedSlug(post.status === 'published' ? post.slug : null)
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false))
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
      setSavedSlug(saved.status === 'published' ? saved.slug : null)
      setForm({
        title: saved.title,
        slug: saved.slug,
        content: saved.content_markdown,
        status: saved.status,
      })
      // 新建成功后切到编辑模式，后续保存走 PUT
      if (!isEdit) {
        skipFetchFor.current = saved.id
        navigate(`/admin/posts/${saved.id}/edit`, { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
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
          <span className="text-xs text-muted-foreground">
            {form.status === 'published' ? '已发布' : '草稿'}
          </span>
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

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

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
            placeholder={slugHint(form.title)}
            className="font-mono text-sm"
          />
        </div>
      </div>

      <SplitEditor value={form.content} onChange={(content) => patch({ content })} />
    </div>
  )
}