import { Link } from 'react-router-dom'
import TextRoll from '@/components/ui/text-roll'
import { ThemeToggle } from '@/components/theme-toggle'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-28 max-w-5xl items-center justify-between px-6">
        <Link to="/home" className="text-3xl font-bold tracking-tight">
          <TextRoll center>tpTwo</TextRoll>
        </Link>

        {/* 中间暂留空，后续可放每日一句/名言 */}
        <ThemeToggle className="size-10" iconClassName="size-5" />
      </div>
    </header>
  )
}