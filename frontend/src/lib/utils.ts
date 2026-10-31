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