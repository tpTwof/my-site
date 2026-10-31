/**
 * [前端 · 基础组件 / shadcn] 表单标签。
 *
 * 用于管理端写作页，为标题与 slug 输入框提供可点击的文字标签。
 *
 * 后端关联：不请求接口。
 */
import * as React from "react"
import { cn } from "cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Label }
