import { useEffect, useState } from 'react'
import { createWorkPreview, errorMessage } from '@/lib/api'
import { WorkPlayer } from './work-player'
import { ErrorBanner } from './error-banner'

export function WorkPreview({ id, title }: { id: string; title: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let alive = true
    setError(null)
    createWorkPreview(id).then(data => { if (alive) setUrl(data.url) })
      .catch(err => { if (alive) setError(errorMessage(err)) })
    return () => { alive = false }
  }, [id, revision])
  return <><ErrorBanner message={error} />
    {error && <button className="studio-button" onClick={() => setRevision(value => value + 1)}>重试预览</button>}
    {url ? <WorkPlayer src={url} title={title} onReload={() => setRevision(value => value + 1)} /> : !error && <p className="studio-empty">正在准备预览…</p>}
    <p className="studio-footnote">预览有效期为 30 分钟，过期后点击重新载入。预览链接仅供管理使用。</p>
  </>
}
