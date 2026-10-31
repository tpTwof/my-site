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

/** 每个页面自己的内容宽度，不再由 AppLayout 统一决定 */
const WIDE = 'mx-auto max-w-5xl px-6 py-8'
const FULL = 'mx-auto max-w-[1400px] px-6 py-6'

function AppLayout() {
  const { pathname } = useLocation()
  const isLanding = pathname === '/'
  const isEditor = pathname.startsWith('/admin/posts/') && pathname !== '/admin/posts'
  const mainClass = isLanding ? '' : isEditor ? FULL : WIDE

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isLanding && <Navbar />}
      <main className={mainClass}>
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