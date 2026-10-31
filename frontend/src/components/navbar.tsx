import { Link } from 'react-router-dom'
import TextRoll from '@/components/ui/text-roll'
import { ThemeToggle } from '@/components/theme-toggle'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link to="/home" className="text-xl font-bold tracking-tight">
          <TextRoll center>tpTwo</TextRoll>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            to="/posts"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Posts
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
