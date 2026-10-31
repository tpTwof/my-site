import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Navbar } from '@/components/navbar'
import Landing from '@/pages/Landing'
import HomePage from '@/pages/HomePage'
import Posts from '@/pages/Posts'
import PostDetail from '@/pages/PostDetail'

function AppLayout() {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <div className="min-h-screen bg-background text-foreground">
      {!isLanding && <Navbar />}
      <main className={isLanding ? '' : 'mx-auto max-w-5xl px-6 py-8'}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/posts" element={<Posts />} />
          <Route path="/posts/:slug" element={<PostDetail />} />
        </Routes>
      </main>
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
