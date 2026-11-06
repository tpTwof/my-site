/**
 * [前端 · 应用根组件] 挂载主题、登录态、路由、全局 Toast。
 *
 * 路由表见下方 <Routes>：/ 重定向至 /home 欢迎首页、/posts 博客列表、
 * /posts/:slug 详情、/works 作品、/contact 联系、/login 登录、
 * /admin/posts* 管理端（需登录）。
 *
 * 后端关联：本文件不发请求；登录态由 AuthProvider 维护，
 *   页面各自通过 src/lib/api.ts 调用后端。
 */
import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { RequireAuth } from '@/components/require-auth'
import { Navbar } from '@/components/navbar'
import { Toaster } from '@/components/ui/sonner'
import HomePage from '@/pages/HomePage'
import Works from '@/pages/Works'
import Contact from '@/pages/Contact'
import Posts from '@/pages/Posts'
import PostDetail from '@/pages/PostDetail'
import PostTags from '@/pages/PostTags'
import Login from '@/pages/Login'
import AdminPostList from '@/pages/admin/AdminPostList'
import AdminPostEdit from '@/pages/admin/AdminPostEdit'

/** 正文居中显示，顶部导航独立占满屏幕宽度 */
const CONTENT = 'mx-auto max-w-5xl px-6 py-8'
/**
 * 文章列表页的标签侧栏要放在正文容器之外（贴着视口左边），
 * 因此本页的 main 不再套 max-w-5xl，改由页面自己控制：
 * 侧栏靠左固定，正文仍在容器里居中，宽度与其它页面一致。
 */
const WIDE = 'px-6 py-8'

function AppLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/' || pathname === '/home'
  /** 带标签侧栏、需要突破正文容器的页面 */
  const isWide = pathname === '/posts' || pathname.startsWith('/tags/')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main
        className={isHome ? '' : isWide ? WIDE : CONTENT}
        data-reading-page={pathname.startsWith('/posts') || pathname.startsWith('/tags/') ? '' : undefined}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/works" element={<Works />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/posts/:slug" element={<PostDetail />} />
          <Route path="/tags/:slug" element={<PostTags />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/admin/posts"
            element={
              <RequireAuth>
                <AdminPostList />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/posts/new"
            element={
              <RequireAuth>
                <AdminPostEdit />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/posts/:id/edit"
            element={
              <RequireAuth>
                <AdminPostEdit />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
