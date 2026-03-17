import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../App'
import { Settings, Users, UserPlus, Trash2, Shield, Globe } from 'lucide-react'
import './SettingsPage.css'

interface User {
  id: number
  username: string
  is_admin: number
  created_at: string
}

interface SettingsData {
  public_access: string
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<SettingsData>({ public_access: 'false' })
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [settingsData, usersData] = await Promise.all([
        api.getSettings(),
        api.getUsers()
      ])
      setSettings(settingsData)
      setUsers(usersData)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSettingsChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.updateSettings(settings as unknown as Record<string, unknown>)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError('')
    setSignupSuccess('')
    
    try {
      await api.signup(newUsername, newPassword)
      setSignupSuccess('User created successfully!')
      setNewUsername('')
      setNewPassword('')
      setShowSignup(false)
      loadData() // Refresh users list
    } catch (error: any) {
      setSignupError(error.message || 'Failed to create user')
    }
  }

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}" and all their data?`)) {
      return
    }
    
    try {
      await api.deleteUser(userId)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (error: any) {
      alert(error.message || 'Failed to delete user')
    }
  }

  if (loading) {
    return <div className="settings-loading">Loading…</div>
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div className="settings-title">
          <Settings size={20} />
          <h1>Settings</h1>
        </div>
        <p className="settings-subtitle">Manage your LinkShort instance</p>
      </div>

      <div className="settings-sections">
        {/* Public Access Settings */}
        <div className="settings-section">
          <div className="section-header">
            <Globe size={16} />
            <h2>Public Access</h2>
          </div>
          <div className="section-content">
            <div className="setting-item">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={settings.public_access === 'true'}
                  onChange={(e) => handleSettingsChange('public_access', e.target.checked ? 'true' : 'false')}
                  className="setting-checkbox"
                />
                <span>Enable public signup</span>
              </label>
              <p className="setting-description">
                Allow anyone to create an account and generate short links
              </p>
            </div>
            
            {settings.public_access === 'true' && (
              <div className="public-access-info">
                <div className="info-header">
                  <UserPlus size={14} />
                  <span>Public Signup Enabled</span>
                </div>
                <p>Users can sign up at /signup and create their own short links.</p>
              </div>
            )}
            
            <button
              className="save-settings-btn"
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* User Management */}
        <div className="settings-section">
          <div className="section-header">
            <Users size={16} />
            <h2>User Management</h2>
          </div>
          <div className="section-content">
            <div className="users-header">
              <h3>Users ({users.length})</h3>
              {settings.public_access === 'true' && (
                <button
                  className="add-user-btn"
                  onClick={() => setShowSignup(!showSignup)}
                >
                  <UserPlus size={14} />
                  Add User
                </button>
              )}
            </div>

            {showSignup && (
              <div className="signup-form">
                <h4>Create New User</h4>
                <form onSubmit={handleSignup}>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="form-input"
                      required
                      minLength={3}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-input"
                      required
                    />
                    <button type="submit" className="create-user-btn">
                      Create
                    </button>
                    <button
                      type="button"
                      className="cancel-btn"
                      onClick={() => {
                        setShowSignup(false)
                        setNewUsername('')
                        setNewPassword('')
                        setSignupError('')
                        setSignupSuccess('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
                {signupError && <div className="error-message">{signupError}</div>}
                {signupSuccess && <div className="success-message">{signupSuccess}</div>}
              </div>
            )}

            <div className="users-list">
              {users.map((u) => (
                <div key={u.id} className="user-item">
                  <div className="user-info">
                    <div className="user-name">
                      {u.username}
                      {u.is_admin && <Shield size={12} className="admin-badge" />}
                    </div>
                    <div className="user-meta">
                      Created {new Date(u.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="user-actions">
                    {u.id !== user?.id && (
                      <button
                        className="delete-user-btn"
                        onClick={() => deleteUser(u.id, u.username)}
                        title="Delete user and all their data"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
