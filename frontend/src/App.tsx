import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { api } from './lib/api'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import Layout from './components/Layout'
import LinksPage from './pages/LinksPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DomainsPage from './pages/DomainsPage'
import SettingsPage from './pages/SettingsPage'
import PasswordFormPage from './pages/PasswordFormPage'

interface AuthCtx {
  user: { username: string; id: number; is_admin?: number } | null
  setUser: (u: { username: string; id: number; is_admin?: number } | null) => void
  loading: boolean
}

export const AuthContext = createContext<AuthCtx>({ user: null, setUser: () => {}, loading: true })
export const useAuth = () => useContext(AuthContext)

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const [user, setUser] = useState<{ username: string; id: number; is_admin?: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/passwordform" element={<PasswordFormPage />} />
          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/app/links" replace />} />
            <Route path="links" element={<LinksPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="domains" element={<DomainsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
