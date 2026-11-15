import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, UploadCloud, Save, Send, FileCode2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { getAdminWork, saveWork, uploadWork, errorMessage } from '@/lib/api'
import { WORK_CATEGORIES, type Work, type WorkInput, type WorkCategory } from '@/types/work'
import { ErrorBanner } from '@/components/error-banner'
import { WorkPreview } from '@/components/work-preview'

const EMPTY: WorkInput = { title: '', slug: '', description: '', category: 'explainer', tags: '', featured: false, status: 'draft' }

export default function AdminWorkEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<WorkInput>(EMPTY)
  const [record, setRecord] = useState<Work | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewVersion, setPreviewVersion] = useState(0)
  const [dragging, setDragging] = useState(false)
  const dirty = useRef(false)
  const formElement = useRef<HTMLFormElement>(null)
  useEffect(() => {
    let alive = true
    setError(null)
    setRecord(null)
    setFile(null)
    setForm(EMPTY)
    dirty.current = false
    if (!id) { setLoading(false); return }
    setLoading(true)
    getAdminWork(id).then(work => { if (alive) { setRecord(work); setForm(work) } })
      .catch(err => { if (alive) setError(errorMessage(err)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.current) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])
  function patch(change: Partial<WorkInput>) { setForm(value => ({ ...value, ...change })); dirty.current = true }
  function chooseFile(next?: File) {
    if (!next) return
    if (!/\.(html?|zip)$/i.test(next.name)) { setError('请选择 .html、.htm 或 .zip 文件'); return }
    if (next.size > 10 * 1024 * 1024) { setError('文件不能超过 10 MiB'); return }
    setFile(next); setError(null); dirty.current = true
  }
  async function save(status: WorkInput['status']) {
    if (!formElement.current?.reportValidity()) return
    if (status === 'published' && !file && !record?.file_count) { setError('请先选择 HTML 或 ZIP 文件'); return }
    setSaving(true); setError(null)
    try {
      // New records must start as drafts. Keep the id on partial failures so retries never duplicate records.
      let saved = await saveWork({ ...form, status: record?.file_count ? status : 'draft' }, record?.id)
      setRecord(saved)
      if (file) { saved = await uploadWork(saved.id, file); setRecord(saved); setFile(null) }
      saved = await saveWork({ ...form, status }, saved.id)
      setRecord(saved); setForm(saved); setPreviewVersion(value => value + 1); dirty.current = false
      toast.success(status === 'published' ? '作品已发布到 Works' : '草稿已保存，可在下方预览')
      if (!id) navigate(`/admin/works/${saved.id}/edit`, { replace: true })
    } catch (err) { setError(errorMessage(err)) }
    finally { setSaving(false) }
  }
  if (loading) return <p className="studio-empty">加载作品中…</p>
  if (id && !record) return <><Link className="studio-back" to="/admin/works">返回作品列表</Link><ErrorBanner message={error} /></>
  return <div className="studio-stack">
    <Link className="studio-back" to="/admin/works" onClick={e => { if (dirty.current && !confirm('有未保存的修改，确定离开？')) e.preventDefault() }}><ArrowLeft size={16} />全部作品</Link>
    <header className="studio-page-heading"><div><h1>{record ? '编辑作品' : '添加一个新作品'}</h1><p>为你的讲解写一段介绍，然后把页面交给这里。</p></div><span className={`studio-status ${record?.status ?? 'draft'}`}>{record?.status === 'published' ? '已发布' : '草稿'}</span></header>
    <ErrorBanner message={error} />
    <form ref={formElement} onSubmit={e => { e.preventDefault(); void save('draft') }}>
      <fieldset disabled={saving} className="studio-edit-grid">
        <section className="studio-panel studio-form"><h2><span>01</span> 基本信息</h2>
          <label>作品标题<input required maxLength={160} placeholder="例如：ReAct 怎样运行" value={form.title} onChange={e => patch({ title: e.target.value })} /></label>
          <label>访问路径（slug）<input required maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="例如 react-explained" value={form.slug} onChange={e => patch({ slug: e.target.value })} /><small>/works/{form.slug || 'your-work'} · 小写英文、数字和连字符</small></label>
          <label>作品简介<textarea rows={4} maxLength={1000} placeholder="这份作品讲了什么，读者可以探索什么？" value={form.description} onChange={e => patch({ description: e.target.value })} /></label>
          <div className="studio-field-pair"><label>分类<select value={form.category} onChange={e => patch({ category: e.target.value as WorkCategory })}>{Object.entries(WORK_CATEGORIES).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>标签<input maxLength={200} placeholder="AI, Agent, ReAct" value={form.tags} onChange={e => patch({ tags: e.target.value })} /></label></div>
          <label className="studio-check"><input type="checkbox" checked={form.featured} onChange={e => patch({ featured: e.target.checked })} /><span>设为推荐作品<small>Works 顶部展示最新的已发布推荐作品。</small></span></label>
        </section>
        <section className="studio-panel studio-form"><h2><span>02</span> 页面文件</h2>
          <label className={`studio-upload ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); if (!saving) setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (!saving) chooseFile(e.dataTransfer.files[0]) }}>
            <UploadCloud size={34} /><strong>{file ? file.name : '将文件拖到这里'}</strong><span>{file ? `${(file.size / 1024).toFixed(1)} KB · 保存时上传` : '或点击选择 HTML / ZIP'}</span><input type="file" aria-label="上传 HTML 或 ZIP" accept=".html,.htm,.zip" onChange={e => { chooseFile(e.target.files?.[0]); e.target.value = '' }} />
          </label>
          {file && <button className="studio-text-button" type="button" onClick={() => setFile(null)}>取消本次文件选择</button>}
          {record && record.file_count > 0 && <div className="studio-file-state"><FileCode2 size={19} /><div><strong>已有页面文件</strong><small>{record.file_count} 个文件 · {(record.package_size / 1024).toFixed(1)} KB</small></div></div>}
          <div className="studio-upload-help"><strong>怎样准备文件？</strong><p>单 HTML：把样式和脚本写在页面中。多文件：将 index.html 与 CSS、JS、图片一起压成 ZIP，资源使用相对路径。</p><p>最多 10 MiB，ZIP 解压后最多 25 MiB / 200 个文件。适合离线交互讲解，不支持外部 CDN、联网 API、弹窗或浏览器存储。请将依赖打包在一起。</p></div>
          <p className="studio-footnote">替换文件会整体更新页面资源。已发布作品保存新文件后，访客会看到更新。</p>
        </section>
      </fieldset>
      <div className="studio-savebar"><p>{saving ? '正在保存，请稍候…' : '先保存草稿预览，满意后再发布。'}{record?.status === 'published' && ' 保存草稿将下架此作品。'}</p><div>
        {record?.status === 'published' && <Link className="studio-button" to={`/works/${record.slug}`}><ExternalLink size={16} />查看</Link>}
        <button disabled={saving} className="studio-button" type="submit"><Save size={16} />{saving ? '保存中…' : '保存草稿'}</button>
        <button disabled={saving} className="studio-button primary" type="button" onClick={() => save('published')}><Send size={16} />发布作品</button>
      </div></div>
    </form>
    <section className="studio-preview"><div className="studio-section-heading"><h2>03 / 页面预览</h2><span>展示已保存的版本</span></div>
      {record?.file_count ? <WorkPreview key={`${record.id}-${previewVersion}`} id={record.id} title={record.title} /> : <div className="studio-preview-empty"><FileCode2 size={28} /><p>保存页面文件后，在这里检查你的交互讲解。</p></div>}
    </section>
  </div>
}
