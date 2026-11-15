import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, FilePlus2, Upload, ArrowRight } from 'lucide-react'
import { errorMessage, getOverview, getAdminWorks } from '@/lib/api'
import { type Overview, type Work, WORK_CATEGORIES } from '@/types/work'
import { ErrorBanner } from '@/components/error-banner'

export default function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [works, setWorks] = useState<Work[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    Promise.all([getOverview(), getAdminWorks()]).then(([overview, items]) => {
      if (alive) { setData(overview); setWorks(items.slice(0, 5)) }
    }).catch(err => { if (alive) setError(errorMessage(err)) })
    return () => { alive = false }
  }, [])
  return <div className="studio-stack">
    <header className="studio-page-heading"><div><h1>把下一个想法，分享出去。</h1><p>管理文字、交互讲解，以及正在生长的作品集。</p></div></header>
    <ErrorBanner message={error} />
    <div className="studio-stats">
      {[['文章', data ? data.posts.published + data.posts.draft : '—', '/admin/posts', data ? `${data.posts.published} 已发布 · ${data.posts.draft} 草稿` : '加载中'],
        ['作品与讲解', data ? data.works.published + data.works.draft : '—', '/admin/works', data ? `${data.works.published} 已发布 · ${data.works.draft} 草稿` : '加载中'],
        ['待完成的想法', data ? data.posts.draft + data.works.draft : '—', '/admin/works', '保存为草稿，准备好了再发布']].map(([label, count, href, hint]) =>
        <Link className="studio-stat" to={String(href)} key={label}><span>{label}<ArrowUpRight size={17} /></span><strong>{count}</strong><small>{hint}</small></Link>)}
    </div>
    <div className="studio-quick-grid">
      <Link to="/admin/works/new" className="studio-quick primary"><Upload size={25} /><div><h2>上传一个交互作品</h2><p>HTML 或 ZIP，让讲解变成可以亲手探索的页面。</p></div><ArrowRight size={20} /></Link>
      <Link to="/admin/posts/new" className="studio-quick"><FilePlus2 size={25} /><div><h2>写一篇新文章</h2><p>用 Markdown 记录思考，整理知识与灵感。</p></div><ArrowRight size={20} /></Link>
    </div>
    <section className="studio-panel"><div className="studio-section-heading"><h2>最近更新的作品</h2><Link to="/admin/works">管理全部 <ArrowRight size={14} /></Link></div>
      {!data && !error && <p className="studio-empty">加载中…</p>}
      {data && !works.length && <p className="studio-empty">你的第一个作品，从一次上传开始。</p>}
      {works.map(work => <Link className="studio-recent" to={`/admin/works/${work.id}/edit`} key={work.id}><span className="studio-recent-icon">↗</span><div><strong>{work.title}</strong><small>{WORK_CATEGORIES[work.category]} · {new Date(work.updated_at).toLocaleDateString('zh-CN')}</small></div><span className={`studio-status ${work.status}`}>{work.status === 'published' ? '已发布' : '草稿'}</span><ArrowUpRight size={17} /></Link>)}
    </section>
    <div className="studio-tip"><span>发布流程</span><p>填写作品信息 → 上传页面 → 预览交互 → 发布到 Works。之后随时可以更新内容或下架为草稿。</p></div>
  </div>
}
