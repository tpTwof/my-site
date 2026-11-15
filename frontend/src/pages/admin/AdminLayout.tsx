import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, PanelsTopLeft, ArrowUpRight, LogOut, Route } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import './studio.css'
import '../works.css'

export default function AdminLayout() {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  return <div className="studio-shell">
    <aside className="studio-sidebar">
      <Link className="studio-brand" to="/admin">tpTwo<span>STUDIO</span></Link>
      <p className="studio-nav-label">内容工作台</p>
      <nav aria-label="后台导航">
        <NavLink end to="/admin"><LayoutDashboard size={18} />总览</NavLink>
        <NavLink to="/admin/posts"><FileText size={18} />文章管理</NavLink>
        <NavLink to="/admin/works"><PanelsTopLeft size={18} />作品与讲解</NavLink>
      </nav>
      <div className="studio-sidebar-bottom">
        <Link to="/home"><Route size={16} />首页与旅程<ArrowUpRight size={14} /></Link>
        <Link to="/works"><ArrowUpRight size={16} />查看网站</Link>
        <div className="studio-account"><span className="studio-avatar">{username?.slice(0, 1).toUpperCase()}</span><span>{username}<small>管理员</small></span>
          <button title="退出登录" aria-label="退出登录" onClick={async () => { await logout(); navigate('/login') }}><LogOut size={17} /></button>
        </div>
      </div>
    </aside>
    <div className="studio-main"><header className="studio-topbar"><span>个人网站 / 内容管理</span><Link to="/works">预览网站 <ArrowUpRight size={14} /></Link></header>
      <div className="studio-content"><Outlet /></div>
    </div>
  </div>
}
