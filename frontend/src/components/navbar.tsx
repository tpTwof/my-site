import { Link, NavLink } from 'react-router-dom'
import TextRoll from '@/components/ui/text-roll'
import { ThemeToggle } from '@/components/theme-toggle'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition-colors ${
    isActive ? 'text-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
  }`

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link to="/home" className="text-xl font-bold tracking-tight">
          <TextRoll center>tpTwo</TextRoll>
        </Link>

        <nav className="flex items-center gap-6">
          <NavLink to="/posts" className={linkClass}>
            Posts
          </NavLink>
          <NavLink to="/admin/posts" className={linkClass}>
            Admin
          </NavLink>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
