import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Search } from 'lucide-react'
import { getWorks, errorMessage } from '@/lib/api'
import { WORK_CATEGORIES, type Work } from '@/types/work'
import { ErrorBanner } from '@/components/error-banner'
import './works.css'

export default function Works() {
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    getWorks().then(data => { if (alive) setWorks(data) })
      .catch(err => { if (alive) setError(errorMessage(err)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [retry])
  const filtered = works.filter(work => (category === 'all' || work.category === category) &&
    `${work.title} ${work.description} ${work.tags}`.toLowerCase().includes(query.toLowerCase()))
  const featured = !query && category === 'all' ? works.find(work => work.featured) : undefined
  return <section className="works-page">
    <header className="works-heading">
      <h1>作品<span>与探索</span></h1>
      <p>交互讲解、实验与项目。</p>
    </header>
    <ErrorBanner message={error} />
    {error && <button className="studio-button" onClick={() => setRetry(value => value + 1)}>重新加载</button>}
    {loading ? <p className="studio-empty" role="status">正在整理作品…</p> : <>
      {featured && <Link to={`/works/${featured.slug}`} className="featured-work">
        <div className="featured-copy">
          <h2>{featured.title}</h2><p>{featured.description}</p>
          <span className="featured-action">开始探索 <ArrowUpRight size={19} /></span>
        </div>
      </Link>}
      <div className="works-toolbar"><div className="studio-tabs" aria-label="作品分类">
        {[['all', '全部作品'], ...Object.entries(WORK_CATEGORIES)].map(([value, label]) =>
          <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>)}
      </div><label className="studio-search"><Search size={16} /><input aria-label="搜索作品" placeholder="搜索标题、标签…" value={query} onChange={e => setQuery(e.target.value)} /></label></div>
      <div className="works-grid">{filtered.map((work) => <Link key={work.id} to={`/works/${work.slug}`} className="work-card">
        <div className="work-card-top"><span>{WORK_CATEGORIES[work.category]}</span><ArrowUpRight size={21} /></div>
        <h2>{work.title}</h2><p>{work.description || '打开作品，开始探索。'}</p>
      </Link>)}</div>
      {!filtered.length && !error && <div className="studio-empty">{works.length ? '没有找到匹配作品，试试其他关键词或分类。' : '新的作品正在酝酿中。'}</div>}
    </>}
  </section>
}
