import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../lib/api'
import { Domain } from '../lib/types'
import {
  Plus, Globe, CheckCircle2, AlertCircle, Trash2,
  RefreshCw, ExternalLink, X, Info
} from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import './DomainsPage.css'

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [verifying, setVerifying] = useState<number | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; domain: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.getDomains()
      setDomains(d)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    document.body.style.overflow = showAdd ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showAdd])

  const closeAdd = () => {
    setShowAdd(false)
    setNewDomain('')
    setAddError('')
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    try {
      const d = await api.addDomain(newDomain.trim().toLowerCase(), '')
      setDomains(prev => [...prev, d])
      closeAdd()
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'Failed to add domain')
    } finally {
      setAdding(false)
    }
  }

  const handleVerify = async (id: number) => {
    setVerifying(id)
    try {
      await api.verifyDomain(id)
      setDomains(prev => prev.map(d => d.id === id ? { ...d, verified: 1 } : d))
    } catch (error: any) {
      const errorData = error.response?.data || {}
      const message = errorData.error || 'Verification failed'
      if (errorData.expected) {
        alert(`${message}\n\nExpected TXT record value:\n${errorData.expected}`)
      } else {
        alert(message)
      }
    } finally {
      setVerifying(null)
    }
  }

  const handleDelete = (id: number) => {
    const domain = domains.find(d => d.id === id)
    if (!domain) return
    setDeleteConfirm({ id, domain: domain.domain })
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    try {
      await api.deleteDomain(deleteConfirm.id)
      setDomains(prev => prev.filter(d => d.id !== deleteConfirm.id))
      setDeleteConfirm(null)
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete domain')
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="settings-page">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-title">
          <Globe size={20} />
          <h1>Domains</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="settings-subtitle">Manage custom domains for your short links</p>
          <button className="add-user-btn" onClick={() => setShowAdd(true)}>
            <Plus size={13} />
            Add domain
          </button>
        </div>
      </div>

      <div className="settings-sections">
        {/* Info card */}
        <div className="settings-section">
          <div className="section-header">
            <Info size={14} />
            <h2>Domain Verification</h2>
          </div>
          <div className="section-content">
            <div className="public-access-info">
              <div className="info-header">
                <Info size={12} />
                <strong>TXT Record Verification</strong>
              </div>
              <p>
                Add a TXT record to your domain's DNS settings to verify ownership.
                The verification process checks that the TXT record contains the correct value.
              </p>
            </div>
          </div>
        </div>

        {/* Domain list */}
        {loading ? (
          <div className="settings-loading">
            <div className="spinner" />
            <span style={{ marginLeft: 10 }}>Loading domains…</span>
          </div>
        ) : (
          <div className="settings-section">
            <div className="section-header">
              <Globe size={14} />
              <h2>Domain List</h2>
            </div>
            <div className="section-content">
              {domains.length === 0 ? (
                <div className="users-empty">
                  <Globe size={32} strokeWidth={1.5} />
                  <p>No domains added yet.</p>
                  <button className="add-user-btn" onClick={() => setShowAdd(true)}>
                    <Plus size={13} /> Add your first domain
                  </button>
                </div>
              ) : (
                <div className="users-list">
                  {domains.map(d => (
                    <DomainRow
                      key={d.id}
                      domain={d}
                      onVerify={handleVerify}
                      onDelete={handleDelete}
                      verifying={verifying === d.id}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add domain modal — portalled to document.body */}
      {showAdd && createPortal(
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title">
                <Globe size={18} />
                Add Domain
              </div>
              <button className="modal-close" onClick={() => setShowAdd(false)}>
                <X size={15} />
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleAdd}>
                <div className="form-row" style={{ flexDirection: 'column', alignItems: 'stretch', marginBottom: '16px' }}>
                  <label className="form-label">Domain</label>
                  <input
                    className="form-input"
                    value={newDomain}
                    onChange={e => setNewDomain(e.target.value)}
                    placeholder="links.yourdomain.com"
                    autoFocus
                    required
                  />
                </div>

                <div className="txt-instructions">
                  <div className="txt-step">
                    <span className="txt-step-num">1</span>
                    <div>
                      <strong>Add TXT record</strong>
                      <p>In your DNS provider, add a TXT record for <code>_linkshort-verify</code></p>
                    </div>
                  </div>
                  <div className="txt-step">
                    <span className="txt-step-num">2</span>
                    <div>
                      <strong>Set verification value</strong>
                      <p>Value: <code>linkshort-verify-{newDomain || 'yourdomain'}</code></p>
                    </div>
                  </div>
                  <div className="txt-step">
                    <span className="txt-step-num">3</span>
                    <div>
                      <strong>Add & verify here</strong>
                      <p>DNS propagation may take a few minutes.</p>
                    </div>
                  </div>
                </div>

                {addError && <div className="error-message">{addError}</div>}

                <div className="modal-footer">
                  <button type="button" className="cancel-btn" onClick={() => setShowAdd(false)}>Cancel</button>
                  <button type="submit" className="create-user-btn" disabled={adding || !newDomain}>
                    {adding ? <span className="btn-spinner-dark" /> : 'Add Domain'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={!!deleteConfirm}
        title="Remove Domain"
        message={`Are you sure you want to remove "${deleteConfirm?.domain}"? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
        dangerous
      />
    </div>
  )
}

function DomainRow({
  domain,
  onVerify,
  onDelete,
  verifying,
}: {
  domain: Domain
  onVerify: (id: number) => void
  onDelete: (id: number) => void
  verifying: boolean
}) {
  const [showTxtInfo, setShowTxtInfo] = useState(false)
  const isCurrentDomain = domain.domain === window.location.hostname

  return (
    <div className="user-item" style={{ flexWrap: 'wrap' }}>
      <div className="user-info">
        <div className="user-name">
          <Globe size={14} />
          {domain.domain}
          {isCurrentDomain && <span className="domain-current-badge">Current</span>}
        </div>
        <div className="user-meta" style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          {domain.verified ? (
            <>
              <CheckCircle2 size={11} style={{ color: '#16a34a' }} />
              <span style={{ color: '#16a34a' }}>Verified</span>
            </>
          ) : (
            <>
              <AlertCircle size={11} style={{ color: '#ea580c' }} />
              <span style={{ color: '#ea580c' }}>Pending verification</span>
            </>
          )}
        </div>
      </div>

      <div className="user-actions">
        {!domain.verified && (
          <button className="verify-btn" onClick={() => onVerify(domain.id)} disabled={verifying}>
            {verifying ? <span className="btn-spinner-dark" /> : <><RefreshCw size={11} /> Verify</>}
          </button>
        )}
        <button
          className="delete-user-btn"
          onClick={() => setShowTxtInfo(v => !v)}
          title="Show TXT record info"
        >
          <Info size={13} />
        </button>
        <a
          href={`http://${domain.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="delete-user-btn"
          title="Open domain"
          style={{ textDecoration: 'none' }}
        >
          <ExternalLink size={13} />
        </a>
        {!isCurrentDomain && (
          <button className="delete-user-btn" onClick={() => onDelete(domain.id)} title="Remove domain">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {showTxtInfo && (
        <div className="public-access-info" style={{ width: '100%', marginTop: 10, flexBasis: '100%' }}>
          <div className="info-header">
            <Info size={12} />
            <strong>TXT Record Verification</strong>
          </div>
          <p>Add this TXT record to your DNS:</p>
          <div className="dns-record-block">
            <div>Type: <strong>TXT</strong></div>
            <div>Name: <strong>_linkshort-verify</strong></div>
            <div>Value: <strong>linkshort-verify-{domain.domain}</strong></div>
          </div>
        </div>
      )}
    </div>
  )
}