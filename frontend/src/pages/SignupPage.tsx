import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { Link2, Eye, EyeOff } from 'lucide-react'
import './SignupPage.css'

export default function SignupPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.signup(username, password)
      navigate('/login')
    } catch (error: any) {
      setError(error.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signup-root">
      <div className="signup-card animate-fade">
        <div className="signup-logo">
          <div className="signup-logo-mark">
            <Link2 size={18} strokeWidth={2.5} />
          </div>
          <span className="signup-logo-text">LinkShort</span>
        </div>

        <div className="signup-header">
          <h1>Create account</h1>
          <p>Sign up to start creating short links</p>
        </div>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">Username</label>
            <input
              className="field-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Choose a username"
              autoFocus
              required
              minLength={3}
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
                placeholder="Choose a password"
                required
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <div className="signup-error">{error}</div>}

          <button className="signup-btn" type="submit" disabled={loading}>
            {loading ? <span className="btn-spinner" /> : 'Create Account'}
          </button>
        </form>

        <div className="signup-footer">
          <p>
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
