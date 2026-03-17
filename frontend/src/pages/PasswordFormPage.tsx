import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import './LoginPage.css'

export default function PasswordFormPage() {
  const [params] = useSearchParams()
  const code = params.get('code') ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/links/${code}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Wrong password'); return }
      window.location.href = data.destination
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <span className="login-logo-text">LinkShort</span>
        </div>
        <div className="login-header">
          <h1>Protected link</h1>
          <p>Enter the password to continue</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field-group">
            <label className="field-label">Password</label>
            <div className="field-password">
              <input
                className="field-input"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-btn" type="submit" disabled={loading || !password}>
            {loading ? <span className="btn-spinner" /> : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
