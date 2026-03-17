import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { api } from '../lib/api'
import { Link, Domain } from '../lib/types'
import { QRCodeSVG } from 'qrcode.react'
import {
  X, Shuffle, Star, ChevronDown, Eye, EyeOff,
  Lock, Timer, Link2, ChevronUp, Download
} from 'lucide-react'
import './CreateLinkModal.css'
import { useSlugModel } from './useSlugModel'

interface Props {
  domains: Domain[]
  editLink: Link | null
  onClose: () => void
  onSaved: () => void
}

const RESERVED_SLUGS = new Set(['api', 'login', 'links', 'analytics', 'domains', 'passwordform', 'static'])
const APP_HOST = window.location.host // e.g. localhost:5173 in dev, localhost:8003 in prod

function validateShortCode(code: string, domain: string): string | null {
  if (code === '' && domain === APP_HOST) return 'Root / cannot be used on the app\'s own domain'
  if (RESERVED_SLUGS.has(code.toLowerCase())) return `"${code}" is a reserved path`
  return null
}

function generateCode(len = 7) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function CreateLinkModal({ domains, editLink, onClose, onSaved }: Props) {
  const [destUrl, setDestUrl] = useState(editLink?.destination_url || '')
  const [selectedDomain, setSelectedDomain] = useState(editLink?.domain || domains[0]?.domain || '')
  const [shortCode, setShortCode] = useState(editLink?.short_code ?? '')
  const [comments, setComments] = useState(editLink?.comments || '')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showPwDialog, setShowPwDialog] = useState(false)
  const [showDomainDrop, setShowDomainDrop] = useState(false)
  const [domainSearch, setDomainSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'utm' | 'password' | 'expiration' | null>(null)
  const [utmSource, setUtmSource] = useState(editLink?.utm_source || '')
  const [utmMedium, setUtmMedium] = useState(editLink?.utm_medium || '')
  const [utmCampaign, setUtmCampaign] = useState(editLink?.utm_campaign || '')
  const [utmTerm, setUtmTerm] = useState(editLink?.utm_term || '')
  const [utmContent, setUtmContent] = useState(editLink?.utm_content || '')
  const [expiresAt, setExpiresAt] = useState(
    editLink?.expires_at ? editLink.expires_at.slice(0, 16) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const domainRef = useRef<HTMLDivElement>(null)
  const domainBtnRef = useRef<HTMLButtonElement>(null)
  const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const { suggestSlug, loading: aiLoading } = useSlugModel()

  useLayoutEffect(() => {
    if (showDomainDrop && domainBtnRef.current) {
      const r = domainBtnRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) })
    }
  }, [showDomainDrop])

  const filteredDomains = domains.filter(d =>
    d.domain.toLowerCase().includes(domainSearch.toLowerCase())
  )

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        domainRef.current && !domainRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('.domain-dropdown')
      ) {
        setShowDomainDrop(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = async () => {
    setError('')
    const validationError = validateShortCode(shortCode, selectedDomain)
    if (validationError) { setError(validationError); return }
    setSaving(true)
    try {
      const payload = {
        destination_url: destUrl,
        domain: selectedDomain,
        short_code: shortCode,
        tags: '',
        comments,
        password: password || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString().slice(0, 19) : null,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_term: utmTerm,
        utm_content: utmContent,
      }
      if (editLink) {
        await api.updateLink(editLink.id, payload)
      } else {
        await api.createLink(payload)
      }
      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box animate-fade">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-breadcrumb">
            <span className="breadcrumb-parent">Links</span>
            <span className="breadcrumb-sep">›</span>
            <Globe2Icon />
            <span>{editLink ? 'Edit link' : 'New link'}</span>
          </div>
          <div className="modal-header-right">
            <button className="icon-btn" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        <div className="modal-body">
          {/* Left panel */}
          <div className="modal-left">
            {/* Destination URL */}
            <div className="form-section">
              <label className="form-label">
                Destination URL
                <HelpIcon />
              </label>
              <input
                className="form-input"
                type="url"
                value={destUrl}
                onChange={e => setDestUrl(e.target.value)}
                placeholder="https://example.com/your-long-url"
                autoFocus
              />
            </div>

            {/* Short link */}
            <div className="form-section">
              <div className="form-label-row">
                <label className="form-label">Short Link</label>
                <div className="form-label-actions">
                  <button
                    className="icon-btn-sm"
                    title="Randomize"
                    onClick={() => {
                      const code = generateCode()
                      const err = validateShortCode(code, selectedDomain)
                      setError(err || '')
                      setShortCode(code)
                    }}
                  >
                    <Shuffle size={13} />
                  </button>
                  <button
                    className="icon-btn-sm"
                    title="AI generate"
                    disabled={!destUrl || aiLoading}
                    onClick={async () => {
                      try {
                        setError('')
                        const slug = await suggestSlug(destUrl)
                        const err = validateShortCode(slug, selectedDomain)
                        if (err) {
                          setError(err)
                        } else {
                          setShortCode(slug)
                        }
                      } catch (e) {
                        setError(e instanceof Error ? e.message : 'AI generate failed')
                      }
                    }}
                  >
                    {aiLoading ? <span className="btn-spinner-dark" /> : <Star size={13} />}
                  </button>
                </div>
              </div>
              <div className="shortlink-row">
                {/* Domain dropdown */}
                <div className="domain-select" ref={domainRef}>
                  <button
                    className="domain-btn"
                    ref={domainBtnRef}
                    onClick={() => setShowDomainDrop(v => !v)}
                    type="button"
                  >
                    <span>{selectedDomain || 'Select domain'}</span>
                    {showDomainDrop ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>
                <input
                  className="form-input shortcode-input"
                  value={shortCode}
                  onChange={e => {
                    const val = e.target.value.replace(/\s/g, '')
                    const err = validateShortCode(val, selectedDomain)
                    setError(err || '')
                    setShortCode(val)
                  }}
                  placeholder="leave empty for root /"
                />
              </div>
            </div>

            {/* Comments */}
            <div className="form-section">
              <label className="form-label">Comments <HelpIcon /></label>
              <textarea
                className="form-input form-textarea"
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Add comments..."
                rows={3}
              />
            </div>

            {/* UTM panel */}
            {activeTab === 'utm' && (
              <div className="expand-panel animate-fade">
                <div className="utm-grid">
                  {([
                    ['Source', utmSource, setUtmSource],
                    ['Medium', utmMedium, setUtmMedium],
                    ['Campaign', utmCampaign, setUtmCampaign],
                    ['Term', utmTerm, setUtmTerm],
                    ['Content', utmContent, setUtmContent],
                  ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                    <div key={label} className="form-section">
                      <label className="form-label">UTM {label}</label>
                      <input
                        className="form-input"
                        value={val}
                        onChange={e => setter(e.target.value)}
                        placeholder={`utm_${label.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expiration panel */}
            {activeTab === 'expiration' && (
              <div className="expand-panel animate-fade">
                <div className="form-section">
                  <label className="form-label">Expires at</label>
                  <input
                    className="form-input"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                  />
                  {expiresAt && (
                    <button
                      className="form-label-link"
                      style={{ marginTop: 4, alignSelf: 'flex-start' }}
                      onClick={() => setExpiresAt('')}
                    >
                      Clear expiration
                    </button>
                  )}
                </div>
              </div>
            )}

            {error && <div className="form-error">{error}</div>}
          </div>

          {/* Right panel */}
          <div className="modal-right">
            <div className="form-section">
              <label className="form-label">QR Code</label>
              <div className="qr-preview">
                {selectedDomain ? (
                  <QRCodeSVG
                    value={`http://${selectedDomain}${shortCode ? '/' + shortCode : ''}`}
                    size={90}
                    bgColor="transparent"
                    fgColor="var(--text-primary)"
                  />
                ) : (
                  <div className="qr-placeholder">
                    <svg viewBox="0 0 120 120" width="80" height="80"><QRPattern /></svg>
                  </div>
                )}
                {selectedDomain && (
                  <button
                    className="qr-edit-btn"
                    title="Download QR"
                    onClick={() => {
                      const svg = document.querySelector('.qr-preview svg') as SVGElement
                      if (!svg) return
                      const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = `${shortCode || 'root'}-qr.svg`
                      a.click()
                    }}
                  >
                    <Download size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Password dialog */}
        {showPwDialog && (
          <div className="pw-dialog-overlay" onClick={() => setShowPwDialog(false)}>
            <div className="pw-dialog" onClick={e => e.stopPropagation()}>
              <div className="pw-dialog-header">
                <h3>Link Password</h3>
                <button className="icon-btn" onClick={() => setShowPwDialog(false)}><X size={15} /></button>
              </div>
              <div className="form-section">
                <div className="form-label-row">
                  <label className="form-label">Password</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="icon-btn-sm" onClick={() => setShowPw(v => !v)}>
                      {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button className="icon-btn-sm" onClick={() => setPassword(generateCode(12))}>
                      <Shuffle size={13} />
                    </button>
                  </div>
                </div>
                <input
                  className="form-input"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create password"
                  autoFocus
                />
              </div>
              <div className="pw-dialog-actions">
                <button className="btn-secondary" onClick={() => setShowPwDialog(false)}>Cancel</button>
                <button className="btn-primary-sm" onClick={() => setShowPwDialog(false)} disabled={!password}>
                  Add password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <div className="footer-tabs">
            <button
              className={`footer-tab ${activeTab === 'utm' ? 'active' : ''}`}
              onClick={() => setActiveTab(activeTab === 'utm' ? null : 'utm')}
            >
              <Link2 size={13} /> UTM
            </button>
            <button
              className={`footer-tab ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => { setShowPwDialog(true); setActiveTab('password') }}
            >
              <Lock size={13} /> Password {password && '•'}
            </button>
            <button
              className={`footer-tab ${activeTab === 'expiration' ? 'active' : ''}`}
              onClick={() => setActiveTab(activeTab === 'expiration' ? null : 'expiration')}
            >
              <Timer size={13} /> Expiration {expiresAt && '•'}
            </button>
          </div>
          <button className="btn-create" onClick={handleSave} disabled={saving}>
            {saving ? <span className="btn-spinner-dark" /> : <>{editLink ? 'Save changes' : 'Create link'} <kbd>↵</kbd></>}
          </button>
        </div>

        {/* Domain dropdown portal */}
        {showDomainDrop && dropPos && (
          <div
            className="domain-dropdown"
            style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, minWidth: dropPos.width, zIndex: 2000 }}
          >
            <div className="domain-search-wrap">
              <input
                autoFocus
                placeholder="Search domains..."
                value={domainSearch}
                onChange={e => setDomainSearch(e.target.value)}
                className="domain-search-input"
              />
            </div>
            <div className="domain-list">
              {filteredDomains.map(d => (
                <button
                  key={d.id}
                  className={`domain-option ${selectedDomain === d.domain ? 'selected' : ''}`}
                  onMouseDown={e => { e.preventDefault(); setSelectedDomain(d.domain); setShowDomainDrop(false); setDomainSearch('') }}
                >
                  {d.domain}
                  {selectedDomain === d.domain && <span className="domain-check">✓</span>}
                </button>
              ))}
              {filteredDomains.length === 0 && (
                <div className="domain-empty">No domains found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function HelpIcon() {
  return <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 3 }}>?</span>
}

function Globe2Icon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function QRPattern() {
  return (
    <>
      <rect x="10" y="10" width="30" height="30" rx="2" fill="none" stroke="#d4d4d4" strokeWidth="3" />
      <rect x="17" y="17" width="16" height="16" rx="1" fill="#d4d4d4" />
      <rect x="80" y="10" width="30" height="30" rx="2" fill="none" stroke="#d4d4d4" strokeWidth="3" />
      <rect x="87" y="17" width="16" height="16" rx="1" fill="#d4d4d4" />
      <rect x="10" y="80" width="30" height="30" rx="2" fill="none" stroke="#d4d4d4" strokeWidth="3" />
      <rect x="17" y="87" width="16" height="16" rx="1" fill="#d4d4d4" />
      <rect x="50" y="10" width="6" height="6" fill="#d4d4d4" />
      <rect x="60" y="10" width="6" height="6" fill="#d4d4d4" />
      <rect x="50" y="20" width="6" height="6" fill="#d4d4d4" />
      <rect x="60" y="30" width="6" height="6" fill="#d4d4d4" />
      <rect x="50" y="50" width="6" height="6" fill="#d4d4d4" />
      <rect x="60" y="60" width="6" height="6" fill="#d4d4d4" />
      <rect x="80" y="50" width="6" height="6" fill="#d4d4d4" />
      <rect x="90" y="60" width="6" height="6" fill="#d4d4d4" />
      <rect x="100" y="50" width="6" height="6" fill="#d4d4d4" />
    </>
  )
}
