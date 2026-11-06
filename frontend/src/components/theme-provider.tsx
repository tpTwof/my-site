/**
 * [前端 · 全局上下文] 明暗主题状态，包裹整个应用（在 App.tsx 最外层）。
 *
 * 三态：light / dark / system（跟随系统）。切换时给 <html> 加/去 `dark` 类，
 * shadcn 的 CSS 变量随之切换；选择写入 localStorage，刷新后保持。
 *
 * 后端关联：不请求接口。
 */
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 全站默认黑色，不再恢复旧的浅色或跟随系统设置；白底仅用于首页开场。
  const [theme, setTheme] = useState<Theme>('dark')

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (t: Theme) => {
      let resolved: 'light' | 'dark'

      if (t === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
      } else {
        resolved = t
      }

      setResolvedTheme(resolved)

      if (resolved === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme(theme)
    localStorage.setItem('theme', theme)

    // 监听系统主题变化
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
