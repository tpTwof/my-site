import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'

interface ThemeToggleProps {
  /** 图标尺寸类，默认 size-4 */
  iconClassName?: string
  /** 按钮尺寸类，默认 size-9 */
  className?: string
}

export function ThemeToggle({
  iconClassName = 'size-4',
  className = 'size-9',
}: ThemeToggleProps = {}) {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
      className={className}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className={iconClassName} />
      ) : (
        <Moon className={iconClassName} />
      )}
    </Button>
  )
}