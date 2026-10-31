export { cn } from "cn"

/** ISO 时间戳 → 中文日期，如「2026年10月31日」 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}