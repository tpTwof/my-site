/**
 * [前端 · 组件] 页面级错误提示条（红色横幅，带 role="alert"）。
 *
 * 用于管理端列表与写作页展示请求失败原因，替代各页面里重复的同一段标记。
 *
 * 后端关联：文案通常来自 api.ts 的 errorMessage()，即后端返回的 detail 字段
 *   （如 409 slug 冲突、422 校验错误）。
 */
export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      {message}
    </p>
  )
}