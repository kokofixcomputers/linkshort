import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuth } from '../App'
import { Link2, Eye, EyeOff } from 'lucide-react'
import './LoginPage.css'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(username, password)
      setUser({ username: data.username, id: data.id || 1 })
      navigate('/links')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      <div className="login-card animate-fade">
        <div className="login-logo">
          <div className="login-logo-mark">
            <Link2 size={18} strokeWidth={2.5} />
          </div>
          <span className="login-logo-text">LinkShort</span>
        </div>

        <div className="login-header">
          <h1>Welcome back</h1>
          <p>Sign in to your account</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">Username</label>
            <input
              className="field-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoFocus
              required
            />
          </div>

          <div className="field-group">
            <label className="field-label">Password</label>
            <div className="field-password">
              <input
                className="field-input"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
