import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect, createContext, useContext } from 'react'
import { api } from './lib/api'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import LinksPage from './pages/LinksPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DomainsPage from './pages/DomainsPage'
import PasswordFormPage from './pages/PasswordFormPage'

interface AuthCtx {
  user: { username: string; id: number } | null
  setUser: (u: { username: string; id: number } | null) => void
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
  const [user, setUser] = useState<{ username: string; id: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/passwordform" element={<PasswordFormPage />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/links" replace />} />
            <Route path="links" element={<LinksPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="domains" element={<DomainsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
