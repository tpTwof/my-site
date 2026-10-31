/**
 * [前端 · 工具] 通用工具函数。
 *
 * - cn：合并 Tailwind 类名（shadcn 约定）
 * - formatCardDate：ISO 时间戳 → `02 Oct 2026`，列表 / 详情 / 管理端共用
 *
 * 后端关联：不请求接口。处理的是后端返回的 created_at / updated_at
 *   （ISO 8601 字符串）。
 */
export { cn } from "cn"

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const

/**
 * ISO 时间戳 → 英文短日期，如 `02 Oct 2026`
 *
 * 与参考站 `date_to_string` 的输出格式一致，列表与详情页共用。
 * 月份用固定缩写表而非 `toLocaleDateString`：en-GB 下九月会输出
 * `Sept`（四字母），导致日期宽度不一致。
 */
export function formatCardDate(iso: string): string {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, "0")
  return `${day} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}