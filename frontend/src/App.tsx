/**
 * [前端 · 应用根组件] 挂载主题、登录态、路由、全局 Toast。
 *
 * 路由表见下方 <Routes>：/ 入口页、/home 首页导航、/posts 博客列表、
 * /posts/:slug 详情、/login 登录、/admin/posts* 管理端（需登录）。
 *
 * 后端关联：本文件不发请求；登录态由 AuthProvider 维护，
 *   页面各自通过 src/lib/api.ts 调用后端。
 */
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { RequireAuth } from '@/components/require-auth'
import { Navbar } from '@/components/navbar'
import { Toaster } from '@/components/ui/sonner'
import Landing from '@/pages/Landing'
import HomePage from '@/pages/HomePage'
import Posts from '@/pages/Posts'
import PostDetail from '@/pages/PostDetail'
import PostTags from '@/pages/PostTags'
import Login from '@/pages/Login'
import AdminPostList from '@/pages/admin/AdminPostList'
import AdminPostEdit from '@/pages/admin/AdminPostEdit'

/** 与导航栏共用同一宽度上限，保证左右对齐 */
const CONTENT = 'mx-auto max-w-5xl px-6 py-8'
/** 全屏导航页：宽度同导航栏，但用更高更宽的间距撑满视口 */
const FULLSCREEN = 'mx-auto max-w-5xl px-6 pt-10 pb-16'

function AppLayout() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const isHome = pathname === '/home'

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isLanding && <Navbar />}
      <main className={isLanding ? '' : isHome ? FULLSCREEN : CONTENT}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<HomePage />} />
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