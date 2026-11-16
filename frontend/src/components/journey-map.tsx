import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useAuth } from '@/components/auth-provider'
import { getJourney, saveJourney, deleteJourney, errorMessage, type JourneyEntry, type JourneyInput } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { JourneyRoute } from '@/components/journey-route'
import './journey-map.css'

type JourneyPointEntry = JourneyEntry & { title?: string }

function JourneyPoint({ entry, index, x, y, onEdit, onDelete, admin, locked, editor }: {
  entry: JourneyPointEntry
  index: number
  x: number
  y: number
  admin: boolean
  locked: boolean
  onEdit: (trigger: HTMLButtonElement) => void
  onDelete: () => void
  editor: ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [touchOpen, setTouchOpen] = useState(false)
  const [angle, setAngle] = useState(0)
  const [requestedPhoto, setRequestedPhoto] = useState(false)
  function openPhoto() {
    if (!entry.image) return
    setRequestedPhoto(true)
    setAngle(Math.random() * 60 - 30)
  }
  const visible = hovered || focused || touchOpen
  return (
    <li className={`map-stop ${index % 2 === 0 ? 'map-stop--left' : 'map-stop--right'} ${entry.title ? 'map-stop--intro' : ''}`} style={{ '--node-x': `${x}px`, top: y } as CSSProperties}>
      <button type="button" className="map-node" data-route-index={index} aria-label={`${entry.date || `路程 ${index + 1}`}${entry.image ? '，查看图片' : ''}`}
        aria-expanded={entry.image ? visible : undefined}
        onPointerEnter={e => { if (e.pointerType !== 'touch') { openPhoto(); setHovered(true) } }}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => { openPhoto(); setFocused(true) }} onBlur={() => { setFocused(false); setTouchOpen(false) }}
        onPointerDown={e => { if (e.pointerType === 'touch') { openPhoto(); setTouchOpen(v => !v) } }}>
        <span />
      </button>
      <div className="map-stop-content" data-journey-content>
        <div className="map-copy">
          {entry.title ? (
            <h2 className="map-identity-row">
              <span className="map-intro-number">{entry.date}</span>
              <span className="map-identity">{entry.title}</span>
            </h2>
          ) : <p className="map-date">{entry.date || String(index + 1).padStart(2, '0')}</p>}
          <p className="map-text">{entry.text}</p>
          {admin && <div className="map-actions">
            <button type="button" disabled={locked} aria-expanded={!!editor} onClick={e => onEdit(e.currentTarget)}>编辑</button>
            <button type="button" disabled={locked} onClick={onDelete}>删除</button>
          </div>}
        </div>
        {editor}
      </div>
      {entry.image && requestedPhoto && <div className="map-photo" data-visible={visible} aria-hidden={!visible} style={{ '--photo-angle': `${angle}deg` } as CSSProperties}>
        <img src={entry.image} alt={entry.date ? `${entry.date} 的日常照片` : '路程中的日常照片'} />
      </div>}
    </li>
  )
}

const EMPTY: JourneyInput = { text: '', date: '', image: null }
// 固定介绍作为路程起点；动态日常记录追加在后，不进入管理端增删改接口。
const INTRO: JourneyPointEntry[] = [
  { id: 'intro-cs', date: '01 /', title: 'CS · FULL_STACK', text: 'Turning ideas into reality.', image: null, created_at: '' },
  { id: 'intro-reading', date: '02 / ', title: 'READER', text: 'Stay curious. Keep learning.', image: null, created_at: '' },
  { id: 'intro-gaming', date: '03 / ', title: 'GAMER', text: 'Level up. Another window into interaction.', image: null, created_at: '' },
]
export function JourneyMap() {
  const { username } = useAuth()
  const [entries, setEntries] = useState<JourneyEntry[]>([])
  const allEntries = useMemo(() => [...INTRO, ...entries], [entries])
  const [error, setError] = useState('')
  const [editorError, setEditorError] = useState('')
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null | undefined>(undefined)
  const [draft, setDraft] = useState<JourneyInput>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [reading, setReading] = useState(false)
  const boxRef = useRef<HTMLOListElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const editorTrigger = useRef<HTMLButtonElement>(null)
  const offsets = useRef(new Map<string, number>())
  const [geometry, setGeometry] = useState({ width: 0, height: 0, points: [] as { x: number; y: number; height: number }[] })
  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    getJourney(signal)
      .then(data => { if (!signal.aborted) setEntries(data) })
      .catch(e => { if (!signal.aborted) setError(errorMessage(e)) })
      .finally(() => { if (!signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const width = box.clientWidth
      const contents = box.querySelectorAll<HTMLElement>('[data-journey-content]')
      let y = 24
      const points = allEntries.map((entry, index) => {
        if (!offsets.current.has(entry.id)) offsets.current.set(entry.id, [0.1, 0.15, 0.2][Math.floor(Math.random() * 3)])
        const x = width * (0.5 + (index % 2 === 0 ? -1 : 1) * offsets.current.get(entry.id)!)
        const height = contents[index]?.offsetHeight ?? 80
        const point = { x, y, height }
        y += Math.max(230, height + 110)
        return point
      })
      setGeometry({ width, height: y, points })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    box.querySelectorAll('[data-journey-content]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [allEntries, username, editing])

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (editing === undefined) {
        editorTrigger.current?.focus()
        editorTrigger.current = null
        return
      }
      const form = formRef.current
      if (!form) return
      form.scrollIntoView({ block: form.offsetHeight > window.innerHeight - 100 ? 'start' : 'nearest' })
      form.querySelector('input')?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [editing, username])

  function openEditor(trigger: HTMLButtonElement, entry?: JourneyEntry) {
    if (editing === (entry?.id ?? null)) {
      formRef.current?.querySelector('input')?.focus()
      return
    }
    editorTrigger.current = trigger
    setEditorError('')
    setDraft(entry ? { text: entry.text, date: entry.date, image: entry.image } : EMPTY)
    setEditing(entry?.id ?? null)
  }

  function locateJourneyEnd() {
    const button = addButtonRef.current
    if (!button) return
    button.focus({ preventScroll: true })
    button.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setEditorError('')
    try {
      const original = entries.find(item => item.id === editing)
      const keepImage = !!original && draft.image === original.image && draft.image === `/api/journey/${original.id}/image`
      const saved = await saveJourney(draft, editing ?? undefined, keepImage)
      setEntries(prev => editing ? prev.map(item => item.id === editing ? saved : item) : [...prev, saved])
      setEditing(undefined); setDraft(EMPTY)
    } catch (e) { setEditorError(errorMessage(e)) } finally { setBusy(false) }
  }
  async function remove(entry: JourneyEntry) {
    if (!window.confirm('删除这条路程记录？')) return
    try {
      await deleteJourney(entry.id)
      setEntries(prev => prev.filter(item => item.id !== entry.id))
      setEditing(current => current === entry.id ? undefined : current)
    } catch (e) { setError(errorMessage(e)) }
  }
  async function chooseImage(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setEditorError('请选择不超过 2MB 的 PNG、JPEG、WebP 或 GIF 图片'); return
    }
    setEditorError('')
    setReading(true)
    try {
      const image = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file) })
      setDraft(prev => ({ ...prev, image }))
    } catch { setEditorError('图片读取失败，请重试') } finally { setReading(false) }
  }
  const editor = username && editing !== undefined && (
    <form ref={formRef} className="map-form" aria-label={editing === null ? '添加路程' : '编辑路程'} onSubmit={submit}>
      {editorError && <p role="alert" className="map-error">{editorError}</p>}
      <label>日期 / 阶段<input disabled={busy} maxLength={40} value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} placeholder="例如 2026.11.07" /></label>
      <label>寄语 / 日常<textarea disabled={busy} required maxLength={3000} rows={4} value={draft.text} onChange={e => setDraft({ ...draft, text: e.target.value })} /></label>
      <label>日常图片（可选，最大 2MB）<input disabled={busy || reading} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => void chooseImage(e.target.files?.[0])} /></label>
      {draft.image && <div><img className="map-form-preview" src={draft.image} alt="待保存图片" /><button disabled={busy || reading} type="button" onClick={() => setDraft({ ...draft, image: null })}>移除图片</button></div>}
      <div className="map-form-buttons"><Button disabled={busy || reading} type="submit">{busy ? '保存中…' : '保存路程'}</Button><Button disabled={busy || reading} variant="ghost" type="button" onClick={() => setEditing(undefined)}>取消</Button></div>
    </form>
  )
  return (
    <div className="journey-map">
      <div className="map-toolbar">
        <p className="about-eyebrow">MY JOURNEY / 我的路程</p>
        {username && <Button type="button" variant="outline" disabled={loading || busy || reading} onClick={locateJourneyEnd}>定位到末端 <span aria-hidden="true">↓</span></Button>}
        <p className="map-status" role="status">{loading ? '正在加载路程…' : ''}</p>
      </div>
      {error && <p role="alert" className="map-error">{error}</p>}
      <ol ref={boxRef} className="map-route" data-loading={loading || undefined} aria-busy={loading} style={{ height: geometry.height }}>
        <JourneyRoute geometry={geometry} containerRef={boxRef} loading={loading} />
        {allEntries.map((entry, index) => <JourneyPoint key={entry.id} entry={entry} index={index} admin={!!username && index >= INTRO.length}
          x={geometry.points[index]?.x ?? 0} y={geometry.points[index]?.y ?? 0}
          locked={busy || reading} editor={editing === entry.id ? editor : null}
          onEdit={trigger => openEditor(trigger, entry)} onDelete={() => void remove(entry)} />)}
      </ol>
      {username && !loading && <div className="map-end">
        <Button ref={addButtonRef} type="button" aria-expanded={editing === null} disabled={busy || reading} onClick={e => openEditor(e.currentTarget)}>添加路程</Button>
        {editing === null && editor}
      </div>}
    </div>
  )
}
