import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { Domain } from '../lib/types'
import {
  Plus, Globe, CheckCircle2, AlertCircle, Trash2,
  RefreshCw, ExternalLink, X, Info
} from 'lucide-react'
import './DomainsPage.css'

export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newDomain, setNewDomain] = useState('')
  const [newCname, setNewCname] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [verifying, setVerifying] = useState<number | null>(null)

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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    setAdding(true)
    try {
      const d = await api.addDomain(newDomain.trim().toLowerCase(), newCname.trim())
      setDomains(prev => [...prev, d])
      setNewDomain('')
      setNewCname('')
      setShowAdd(false)
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
    } finally {
      setVerifying(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this domain?')) return
    await api.deleteDomain(id)
    setDomains(prev => prev.filter(d => d.id !== id))
  }

  const systemDomains = domains.filter(d => d.is_system)
  const userDomains = domains.filter(d => !d.is_system)

  return (
    <div className="page-root">
      <div className="page-header">
        <h1 className="page-title">Domains</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={14} strokeWidth={2.5} />
          Add domain
        </button>
      </div>

      <div className="domains-body">
        {/* CNAME info banner */}
        <div className="info-banner">
          <Info size={14} />
          <div>
            <strong>Custom domains via CNAME</strong> — Point your domain's CNAME record to{' '}
            <code>cname.linkshort.io</code> then add it here. Verification checks your CNAME is set correctly.
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* System/default domains */}
            {systemDomains.length > 0 && (
              <div className="domain-section">
                <h2 className="domain-section-title">Default Domains</h2>
                <div className="domains-list">
                  {systemDomains.map(d => (
                    <DomainRow
                      key={d.id}
                      domain={d}
                      onVerify={handleVerify}
                      onDelete={handleDelete}
                      verifying={verifying === d.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* User domains */}
            <div className="domain-section">
              <h2 className="domain-section-title">Custom Domains</h2>
              {userDomains.length === 0 ? (
                <div className="domains-empty">
                  <Globe size={32} strokeWidth={1.5} />
                  <p>No custom domains added yet.</p>
                  <button className="btn-primary" onClick={() => setShowAdd(true)}>
                    <Plus size={13} /> Add your first domain
                  </button>
                </div>
              ) : (
                <div className="domains-list">
                  {userDomains.map(d => (
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
          </>
        )}
      </div>

      {/* Add domain modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false) }}>
          <div className="add-domain-modal animate-fade">
            <div className="modal-header">
              <h3 className="modal-title">Add Custom Domain</h3>
              <button className="icon-btn" onClick={() => setShowAdd(false)}><X size={15} /></button>
            </div>

            <form onSubmit={handleAdd} className="add-domain-form">
              <div className="form-section">
                <label className="form-label">Domain</label>
                <input
                  className="form-input"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  placeholder="links.yourdomain.com"
                  autoFocus
                  required
                />
                <p className="field-hint">Enter the subdomain or apex domain you want to use for short links.</p>
              </div>

              <div className="form-section">
                <label className="form-label">CNAME Target <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input
                  className="form-input"
                  value={newCname}
                  onChange={e => setNewCname(e.target.value)}
                  placeholder="cname.linkshort.io"
                />
                <p className="field-hint">Add a CNAME record in your DNS pointing to this target.</p>
              </div>

              <div className="cname-instructions">
                <div className="cname-step">
                  <span className="cname-step-num">1</span>
                  <div>
                    <strong>Go to your DNS provider</strong>
                    <p>Namecheap, Cloudflare, GoDaddy, etc.</p>
                  </div>
                </div>
                <div className="cname-step">
                  <span className="cname-step-num">2</span>
                  <div>
                    <strong>Add a CNAME record</strong>
                    <div className="cname-example">
                      <span>Type: <code>CNAME</code></span>
                      <span>Name: <code>{newDomain ? newDomain.split('.')[0] : 'links'}</code></span>
                      <span>Target: <code>cname.linkshort.io</code></span>
                    </div>
                  </div>
                </div>
                <div className="cname-step">
                  <span className="cname-step-num">3</span>
                  <div>
                    <strong>Add & verify here</strong>
                    <p>DNS propagation may take up to 48 hours.</p>
                  </div>
                </div>
              </div>

              {addError && <div className="form-error">{addError}</div>}

              <div className="modal-footer-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn-create" disabled={adding || !newDomain}>
                  {adding ? <span className="btn-spinner-dark" /> : 'Add Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  return (
    <div className="domain-row">
      <div className="domain-icon">
        <Globe size={16} />
      </div>

      <div className="domain-info">
        <div className="domain-name">{domain.domain}</div>
        {domain.cname_target && (
          <div className="domain-cname">
            CNAME → <code>{domain.cname_target}</code>
          </div>
        )}
        {domain.is_system ? (
          <span className="domain-badge system">System</span>
        ) : null}
      </div>

      <div className="domain-status">
        {domain.verified ? (
          <span className="status-verified">
            <CheckCircle2 size={13} />
            Verified
          </span>
        ) : (
          <span className="status-pending">
            <AlertCircle size={13} />
            Pending
          </span>
        )}
      </div>

      <div className="domain-actions">
        {!domain.verified && !domain.is_system && (
          <button
            className="btn-verify"
            onClick={() => onVerify(domain.id)}
            disabled={verifying}
            title="Check CNAME and verify"
          >
            {verifying ? <span className="mini-spinner" /> : <><RefreshCw size={12} /> Verify</>}
          </button>
        )}
        <a
          href={`http://${domain.domain}`}
          target="_blank"
          rel="noopener noreferrer"
          className="icon-btn"
          title="Open domain"
        >
          <ExternalLink size={13} />
        </a>
        {!domain.is_system && (
          <button
            className="icon-btn danger-btn"
            onClick={() => onDelete(domain.id)}
            title="Remove domain"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}
