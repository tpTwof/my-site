/**
 * [前端 · 布局组件] 全站通栏导航：站名居左，登出 / GitHub / 菜单居右。
 *
 * 菜单以全屏对话框呼出站内入口，支持 Escape、焦点管理与关闭后返回触发按钮。
 * 后端关联：登出调用 POST /api/auth/logout（见 AuthProvider）。
 */
import { useRef, useState, type ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import TextRoll from '@/components/ui/text-roll'
import { MenuToggleIcon, useMenuIconMotion } from '@/components/ui/menu-toggle-icon'
import { InteractiveHoverLinks, type HoverLink } from '@/components/ui/interactive-hover-links'
import { SocialLinks } from '@/components/social-links'
import { useAuth } from '@/components/auth-provider'

const MENU_LINKS: HoverLink[] = [
  { heading: 'HOME', label: '主页', href: '/home' },
  { heading: 'POSTS', label: '文章', href: '/posts' },
  { heading: 'WORKS', label: '作品', href: '/works' },
  { heading: 'CONTACT', label: '联系', href: '/contact' },
]

const ICON_BUTTON =
  'inline-flex size-11 shrink-0 cursor-pointer items-center justify-center text-inherit focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:size-12'

export function Navbar() {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuHovered, setMenuHovered] = useState(false)
  const [menuKeyboardFocused, setMenuKeyboardFocused] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const menuIconMotion = useMenuIconMotion(menuOpen, menuHovered || menuKeyboardFocused)
  const menuInteraction = {
    onPointerEnter: (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType !== 'touch') setMenuHovered(true)
    },
    onPointerLeave: () => setMenuHovered(false),
    onPointerCancel: () => setMenuHovered(false),
    onFocus: (event: React.FocusEvent<HTMLButtonElement>) => {
      setMenuKeyboardFocused(event.currentTarget.matches(':focus-visible'))
    },
    onBlur: () => setMenuKeyboardFocused(false),
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  async function handleLogout() {
    closeMenu()
    await logout()
    toast.success('已登出')
    navigate('/home')
  }

  function renderBar(menuButton: ReactNode) {
    return (
      <div className="flex h-28 w-full shrink-0 items-center justify-between px-6 sm:px-10">
        <Link
          to="/home"
          onClick={closeMenu}
          aria-label="tpTwo 首页"
          className="text-3xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <TextRoll center>tpTwo</TextRoll>
        </Link>

        <div className="flex items-center gap-1 text-muted-foreground transition-colors duration-200 ease-[ease] has-[>:is(a,button):is(:hover,:focus-visible)]:text-primary motion-reduce:transition-none sm:gap-2">
          {username && (
            <button
              type="button"
              onClick={handleLogout}
              title={`已登录：${username}`}
              className="group/logout mr-2 inline-flex h-11 shrink-0 cursor-pointer items-center justify-center px-1 text-sm text-inherit focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:mr-5 sm:h-12 sm:px-2 sm:text-base"
            >
              <span className="inline-flex scale-100 items-center gap-1.5 transition-transform duration-[280ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/logout:scale-[1.12] group-focus-visible/logout:scale-[1.12] motion-reduce:transition-none">
                <LogOut className="size-5" />
                登出
              </span>
            </button>
          )}
          <SocialLinks />
          {menuButton}
        </div>
      </div>
    )
  }

  return (
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <header className="sticky top-0 z-50">
        {renderBar(
          <Dialog.Trigger {...menuInteraction} aria-label="打开菜单" title="菜单" className={ICON_BUTTON}>
            <MenuToggleIcon animation={menuIconMotion} />
          </Dialog.Trigger>,
        )}
        {/* 仅开场过渡显示的视觉副本；不参与焦点、读屏或点击。 */}
        <div className="navbar-reveal-copy" aria-hidden="true" inert>
          {renderBar(<MenuToggleIcon animation={menuIconMotion} />)}
        </div>
      </header>

      <Dialog.Portal>
        <Dialog.Popup initialFocus={closeButtonRef} className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-background text-foreground outline-none motion-safe:transition-opacity motion-safe:duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0">
          <Dialog.Title className="sr-only">站点菜单</Dialog.Title>
          {renderBar(
            <Dialog.Close {...menuInteraction} ref={closeButtonRef} aria-label="关闭菜单" title="关闭菜单" className={ICON_BUTTON}>
              <MenuToggleIcon animation={menuIconMotion} />
            </Dialog.Close>,
          )}
          <nav aria-label="站点导航" className="w-full px-6 pt-2 pb-12 sm:pr-10 sm:pl-[18vw]">
            <InteractiveHoverLinks links={MENU_LINKS} onNavigate={closeMenu} />
          </nav>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
