import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { getWork, errorMessage } from '@/lib/api'
import { type Work } from '@/types/work'
import { WorkPlayer } from '@/components/work-player'
import { ErrorBanner } from '@/components/error-banner'
import './works.css'

export default function WorkDetail() {
  const { slug = '' } = useParams()
  const [work, setWork] = useState<Work | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setWork(null)
    setError(null)
    getWork(slug).then(data => { if (alive) setWork(data) })
      .catch(err => { if (alive) setError(errorMessage(err)) })
    return () => { alive = false }
  }, [slug])
  return <section className="work-detail">
    <Link className="studio-back" to="/works"><ArrowLeft size={16} /> 返回作品集</Link>
    <ErrorBanner message={error} />
    {!work && !error && <p className="studio-empty">正在打开作品…</p>}
    {work && <><header><h1>{work.title}</h1><p>{work.description}</p></header>
      <WorkPlayer src={`/api/works/${encodeURIComponent(work.slug)}/files/index.html`} title={work.title} />
    </>}
  </section>
}
