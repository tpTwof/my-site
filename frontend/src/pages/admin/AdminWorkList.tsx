import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Pencil, Trash2, ArrowUpRight } from 'lucide-react'
import { toast } from 'sonner'
import { getAdminWorks, deleteWork, errorMessage } from '@/lib/api'
import { WORK_CATEGORIES, type Work } from '@/types/work'
import { ErrorBanner } from '@/components/error-banner'

export default function AdminWorkList() {
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getAdminWorks().then(data => { if (alive) setWorks(data) })
      .catch(err => { if (alive) setError(errorMessage(err)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [retry])
  async function remove(work: Work) {
    if (!confirm(`删除「${work.title}」及所有上传文件？此操作不可恢复。`)) return
    setDeleting(work.id)
    try { await deleteWork(work.id); setWorks(items => items.filter(item => item.id !== work.id)); toast.success('作品已删除') }
    catch (err) { setError(errorMessage(err)) }
    finally { setDeleting(null) }
  }
  const filtered = works.filter(work => (filter === 'all' || work.status === filter) && `${work.title} ${work.tags} ${work.slug}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="studio-stack">
    <header className="studio-page-heading"><div><h1>作品与讲解</h1><p>让每一个想法，都拥有自己的展示空间。</p></div><Link className="studio-button primary" to="/admin/works/new"><Plus size={17} />添加作品</Link></header>
    <div className="works-toolbar"><div className="studio-tabs">{[['all', '全部'], ['published', '已发布'], ['draft', '草稿']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label} <small>{works.filter(w => value === 'all' || w.status === value).length}</small></button>)}</div><label className="studio-search"><Search size={16} /><input aria-label="搜索作品" placeholder="搜索标题、路径、标签" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
    <ErrorBanner message={error} />{error && <button className="studio-button" onClick={() => setRetry(value => value + 1)}>重新加载</button>}
    <div className="studio-panel studio-library">{loading ? <p className="studio-empty">加载作品中…</p> : filtered.length ? filtered.map(work => <article className="studio-work-row" key={work.id}>
      <div className="studio-work-symbol" aria-hidden="true">{'{ }'}</div><div className="studio-work-info"><Link to={`/admin/works/${work.id}/edit`}>{work.title}</Link><p>{WORK_CATEGORIES[work.category]} · /works/{work.slug}</p><small>{work.file_count ? `${work.file_count} 个文件 · ${(work.package_size / 1024).toFixed(1)} KB` : '尚未上传页面'}{work.featured ? ' · 首页推荐' : ''}</small></div>
      <span className={`studio-status ${work.status}`}>{work.status === 'published' ? '已发布' : '草稿'}</span><div className="studio-row-actions">
        {work.status === 'published' && <Link to={`/works/${work.slug}`} title="查看作品" aria-label={`查看 ${work.title}`}><ArrowUpRight size={17} /></Link>}
        <Link to={`/admin/works/${work.id}/edit`} title="编辑作品" aria-label={`编辑 ${work.title}`}><Pencil size={16} /></Link>
        <button disabled={deleting === work.id} onClick={() => remove(work)} title="删除作品" aria-label={`删除 ${work.title}`}><Trash2 size={16} /></button>
      </div>
    </article>) : !error && <div className="studio-empty"><p>{works.length ? '没有匹配的作品。' : '还没有作品。上传一个 HTML，开始你的作品集。'}</p><Link className="studio-button" to="/admin/works/new">添加作品</Link></div>}</div>
    <p className="studio-footnote">支持单个 HTML 或静态网页 ZIP。草稿只对你可见，发布后出现在 Works。</p>
  </div>
}
