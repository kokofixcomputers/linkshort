import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { api } from '../lib/api'
import { Link2, BarChart2, Globe, Settings, LogOut } from 'lucide-react'
import './Layout.css'

export default function Layout() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await api.logout()
    setUser(null)
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">
            <Link2 size={16} strokeWidth={2.5} />
          </div>
          <span className="logo-text">LinkShort</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/app/links" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Link2 size={15} />
            <span>Links</span>
          </NavLink>
          <NavLink to="/app/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <BarChart2 size={15} />
            <span>Analytics</span>
          </NavLink>
          <NavLink to="/app/domains" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Globe size={15} />
            <span>Domains</span>
          </NavLink>
          {user?.is_admin && (
            <NavLink to="/app/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Settings size={15} />
              <span>Settings</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase()}</div>
            <span className="user-name">{user?.username}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
