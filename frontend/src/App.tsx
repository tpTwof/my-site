import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Navbar } from '@/components/navbar'
import { Toaster } from '@/components/ui/sonner'
import Landing from '@/pages/Landing'
import HomePage from '@/pages/HomePage'
import Posts from '@/pages/Posts'
import PostDetail from '@/pages/PostDetail'
import AdminPostList from '@/pages/admin/AdminPostList'
import AdminPostEdit from '@/pages/admin/AdminPostEdit'

/** 常规内容页：与导航栏同宽，保证左右对齐 */
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
          <Route path="/admin/posts" element={<AdminPostList />} />
          <Route path="/admin/posts/new" element={<AdminPostEdit />} />
          <Route path="/admin/posts/:id/edit" element={<AdminPostEdit />} />
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
        <AppLayout />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App