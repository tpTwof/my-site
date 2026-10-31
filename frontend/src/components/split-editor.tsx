import { useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github.css'
import { Textarea } from '@/components/ui/textarea'

interface SplitEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/**
 * 左侧 Markdown 源码，右侧实时预览。
 *
 * 滚动同步按**比例**而非像素对齐：预览区渲染后高度通常大于源码区，
 * 按滚动进度百分比同步能让两边大致停在同一段内容上。
 * 用 rAF 节流，避免每帧触发两次 scroll 事件互相打架。
 */
export function SplitEditor({ value, onChange, placeholder }: SplitEditorProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const syncing = useRef(false)

  function syncFrom(source: HTMLElement, target: HTMLElement) {
    if (syncing.current) return
    syncing.current = true
    requestAnimationFrame(() => {
      const sourceRange = source.scrollHeight - source.clientHeight
      const targetRange = target.scrollHeight - target.clientHeight
      target.scrollTop = sourceRange > 0 ? (source.scrollTop / sourceRange) * targetRange : 0
      syncing.current = false
    })
  }

  return (
    <div className="grid h-[calc(100vh-16rem)] min-h-[420px] grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col">
        <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Markdown
        </div>
        <Textarea
          ref={textareaRef}
          value={value}
          placeholder={placeholder ?? '# 标题\n\n开始写吧...'}
          onChange={(e) => onChange(e.target.value)}
          onScroll={() => {
            const preview = previewRef.current
            if (preview && textareaRef.current) syncFrom(textareaRef.current, preview)
          }}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none font-mono text-sm leading-relaxed field-sizing-fixed"
        />
      </div>

      <div className="flex min-h-0 flex-col">
        <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          预览
        </div>
        <div
          ref={previewRef}
          onScroll={() => {
            const area = textareaRef.current
            if (area && previewRef.current) syncFrom(previewRef.current, area)
          }}
          className="min-h-0 flex-1 overflow-auto rounded-md border border-border px-5 py-4"
        >
          <div className="prose prose-neutral max-w-none dark:prose-invert">
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {value}
              </ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">预览区</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}