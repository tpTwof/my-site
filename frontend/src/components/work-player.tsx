import { useState } from 'react'
import { Maximize2, Minimize2, RotateCcw } from 'lucide-react'

export function WorkPlayer({ src, title, onReload }: { src: string; title: string; onReload?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [revision, setRevision] = useState(0)
  return <div className={`work-player ${expanded ? 'is-expanded' : ''}`}>
    <div className="player-toolbar"><span><i /> {title}</span><div>
      <button type="button" onClick={() => { if (onReload) onReload(); else setRevision(value => value + 1) }} aria-label="重新载入讲解"><RotateCcw size={16} /></button>
      <button type="button" aria-pressed={expanded} onClick={() => setExpanded(!expanded)} aria-label={expanded ? '退出专注阅读' : '专注阅读'}>{expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{expanded ? '退出专注' : '专注阅读'}</button>
    </div></div>
    <iframe key={`${src}-${revision}`} src={src} title={title} sandbox="allow-scripts" referrerPolicy="no-referrer" />
  </div>
}
