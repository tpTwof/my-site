/**
 * [前端 · 基础组件] 全局 Toast 容器（sonner），挂载在 App.tsx 根部。
 *
 * 管理端保存/发布/删除成功与失败的提示都通过这里的 toast() 弹出。
 *
 * 后端关联：不请求接口；提示文案多来自后端响应（如 409 slug 冲突）。
 */
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"
import { useTheme } from "@/components/theme-provider"

/**
 * shadcn 生成的版本读取 next-themes 的 useTheme；本项目没有引入该依赖，
 * 主题由自建的 ThemeProvider 管理，这里改为读取它的 resolvedTheme。
 */
const Toaster = (props: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--success-bg": "var(--popover)",
          "--success-text": "var(--brand-green)",
          "--success-border": "var(--border)",
          "--info-bg": "var(--popover)",
          "--info-text": "var(--foreground)",
          "--info-border": "var(--border)",
          "--warning-bg": "var(--popover)",
          "--warning-text": "var(--brand-red)",
          "--warning-border": "var(--border)",
          "--error-bg": "var(--popover)",
          "--error-text": "var(--brand-red)",
          "--error-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
