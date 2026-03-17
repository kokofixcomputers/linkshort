import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../App'
import { Link, Domain } from '../lib/types'
import { QRCodeSVG } from 'qrcode.react'
import {
  Plus, Copy, Check, MoreHorizontal, Trash2, Edit2,
  ExternalLink, Search, SlidersHorizontal, ChevronDown,
  MousePointerClick, Lock, Globe, QrCode, X, Download, Users
} from 'lucide-react'
import CreateLinkModal from '../components/CreateLinkModal'
import './LinksPage.css'

type SortKey = 'newest' | 'oldest' | 'most_clicks'

interface Filters {
  domain: string
  passwordOnly: boolean
  expiryOnly: boolean
}

interface Display {
  sort: SortKey
  showDest: boolean
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

function FaviconIcon({ url }: { url: string }) {
  if (!url) return <Globe size={16} className="link-favicon-fallback" />
  try {
    const host = new URL(url.startsWith('http') ? url : 'https://' + url).hostname
    const isVercel = host.endsWith('.vercel.app') || host.endsWith('.now.sh')
    if (isVercel) {
      return (
        <img
          src={`https://avatar.vercel.sh/${host}`}
          width={16} height={16}
          style={{ borderRadius: 3 }}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          alt=""
        />
      )
    }
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
        width={16} height={16}
        style={{ borderRadius: 3 }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        alt=""
      />
    )
  } catch {
    return <Globe size={16} className="link-favicon-fallback" />
  }
}

export default function LinksPage() {
  const { user } = useAuth()
  const [links, setLinks] = useState<Link[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editLink, setEditLink] = useState<Link | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [qrLink, setQrLink] = useState<Link | null>(null)
  const [qrSettings, setQrSettings] = useState<{ logo: boolean; color: string; logoUrl?: string }>({ logo: false, color: '#000000' })
  const [showFilterDrop, setShowFilterDrop] = useState(false)
  const [showDisplayDrop, setShowDisplayDrop] = useState(false)
  const [filters, setFilters] = useState<Filters>({ domain: '', passwordOnly: false, expiryOnly: false })
  const [display, setDisplay] = useState<Display>({ sort: 'newest', showDest: true })
  const [view, setView] = useState<'own' | 'all'>('own')
  const filterRef = useRef<HTMLDivElement>(null)
  const displayRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [l, d] = await Promise.all([api.getLinks(view), api.getDomains()])
    setLinks(l)
    setDomains(d)
    setLoading(false)
  }, [view])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDrop(false)
      if (displayRef.current && !displayRef.current.contains(e.target as Node)) setShowDisplayDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleCopy = (link: Link) => {
    navigator.clipboard.writeText(`${link.domain}/${link.short_code}`)
    setCopiedId(link.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this link and all its click data?')) return
    try {
      await api.deleteLink(id)
      setLinks(links.filter(l => l.id !== id))
    } catch (error: any) {
      alert(error.message || 'Failed to delete link')
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      setQrSettings({ ...qrSettings, logoUrl: result })
    }
    reader.readAsDataURL(file)
  }

  const uniqueDomains = [...new Set(links.map(l => l.domain))]

  const filtered = links.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !q || l.short_code.toLowerCase().includes(q) ||
      (l.destination_url || '').toLowerCase().includes(q) ||
      l.domain.toLowerCase().includes(q)
    const matchDomain = !filters.domain || l.domain === filters.domain
    const matchPassword = !filters.passwordOnly || !!l.password
    const matchExpiry = !filters.expiryOnly || !!l.expires_at
    return matchSearch && matchDomain && matchPassword && matchExpiry
  }).sort((a, b) => {
    if (display.sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (display.sort === 'most_clicks') return b.click_count - a.click_count
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const filterActive = !!filters.domain || filters.passwordOnly || filters.expiryOnly
  const displayActive = display.sort !== 'newest' || !display.showDest

  return (
    <div className="page-root">
      <div className="page-header">
        <h1 className="page-title">Links</h1>
        <button className="btn-primary" onClick={() => { setEditLink(null); setShowCreate(true) }}>
          <Plus size={14} strokeWidth={2.5} />
          Create link
        </button>
      </div>

      <div className="page-toolbar">
        <div className="toolbar-left">
          {user?.is_admin && (
            <div className="view-switcher">
              <button
                className={`view-btn ${view === 'own' ? 'active' : ''}`}
                onClick={() => setView('own')}
              >
                <Users size={13} />
                My Links
              </button>
              <button
                className={`view-btn ${view === 'all' ? 'active' : ''}`}
                onClick={() => setView('all')}
              >
                <Users size={13} />
                All Users
              </button>
            </div>
          )}
          <div className="toolbar-drop-wrap" ref={filterRef}>
            <button
              className={`btn-filter ${filterActive ? 'btn-filter-active' : ''}`}
              onClick={() => { setShowFilterDrop(v => !v); setShowDisplayDrop(false) }}
            >
              <SlidersHorizontal size={13} />
              Filter
              {filterActive && <span className="filter-dot" />}
              <ChevronDown size={12} />
            </button>
            {showFilterDrop && (
              <div className="toolbar-dropdown">
                <div className="tdrop-section">
                  <div className="tdrop-label">Domain</div>
                  <select
                    className="tdrop-select"
                    value={filters.domain}
                    onChange={e => setFilters(f => ({ ...f, domain: e.target.value }))}
                  >
                    <option value="">All domains</option>
                    {uniqueDomains.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="tdrop-section">
                  <div className="tdrop-label">Properties</div>
                  <label className="tdrop-check">
                    <input type="checkbox" checked={filters.passwordOnly} onChange={e => setFilters(f => ({ ...f, passwordOnly: e.target.checked }))} />
                    Password protected
                  </label>
                  <label className="tdrop-check">
                    <input type="checkbox" checked={filters.expiryOnly} onChange={e => setFilters(f => ({ ...f, expiryOnly: e.target.checked }))} />
                    Has expiration
                  </label>
                </div>
                {filterActive && (
                  <button className="tdrop-clear" onClick={() => setFilters({ domain: '', passwordOnly: false, expiryOnly: false })}>
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="toolbar-drop-wrap" ref={displayRef}>
            <button
              className={`btn-filter ${displayActive ? 'btn-filter-active' : ''}`}
              onClick={() => { setShowDisplayDrop(v => !v); setShowFilterDrop(false) }}
            >
              <SlidersHorizontal size={13} />
              Display
              {displayActive && <span className="filter-dot" />}
              <ChevronDown size={12} />
            </button>
            {showDisplayDrop && (
              <div className="toolbar-dropdown">
                <div className="tdrop-section">
                  <div className="tdrop-label">Sort by</div>
                  {(['newest', 'oldest', 'most_clicks'] as SortKey[]).map(s => (
                    <button
                      key={s}
                      className={`tdrop-option ${display.sort === s ? 'active' : ''}`}
                      onClick={() => setDisplay(d => ({ ...d, sort: s }))}
                    >
                      {s === 'newest' ? 'Newest first' : s === 'oldest' ? 'Oldest first' : 'Most clicks'}
                      {display.sort === s && <Check size={12} />}
                    </button>
                  ))}
                </div>
                <div className="tdrop-section">
                  <div className="tdrop-label">Show</div>
                  <label className="tdrop-check">
                    <input type="checkbox" checked={display.showDest} onChange={e => setDisplay(d => ({ ...d, showDest: e.target.checked }))} />
                    Destination URL
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="toolbar-right">
          <div className="search-box">
            <Search size={13} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search links..."
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}><X size={12} /></button>
            )}
          </div>
        </div>
      </div>

      <div className="links-list">
        {loading ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            {search || filterActive ? (
              <>
                <p>No links match your search or filters.</p>
                <button className="btn-primary" onClick={() => { setSearch(''); setFilters({ domain: '', passwordOnly: false, expiryOnly: false }) }}>
                  Clear search &amp; filters
                </button>
              </>
            ) : (
              <>
                <MousePointerClick size={32} strokeWidth={1.5} />
                <p>No links yet. Create your first one!</p>
                <button className="btn-primary" onClick={() => setShowCreate(true)}>
                  <Plus size={13} /> Create link
                </button>
              </>
            )}
          </div>
        ) : (
          filtered.map(link => (
            <div key={link.id} className="link-row animate-fade" onClick={() => setOpenMenu(null)}>
              <div className="link-favicon">
                <FaviconIcon url={link.destination_url} />
              </div>

              <div className="link-info">
                <div className="link-short">
                  <span className="link-short-text">{link.domain}/{link.short_code}</span>
                  <button
                    className="icon-btn"
                    onClick={e => { e.stopPropagation(); handleCopy(link) }}
                    title="Copy link"
                  >
                    {copiedId === link.id ? <Check size={13} color="var(--accent-green)" /> : <Copy size={13} />}
                  </button>
                  {link.password && <Lock size={11} className="link-lock" />}
                </div>
                <div className="link-dest">
                  <span className="link-arrow">↳</span>
                  {display.showDest
                    ? <span className="link-url">{link.destination_url || 'No URL configured'}</span>
                    : <span className="link-url" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>destination hidden</span>
                  }
                  {link.username && view === 'all' && (
                    <>
                      <span className="link-dot" />
                      <span className="link-user">{link.username}</span>
                    </>
                  )}
                  <span className="link-dot" />
                  <span className="link-age">{timeAgo(link.created_at)}</span>
                </div>
              </div>

              <div className="link-meta">
                <div className="link-clicks">
                  <MousePointerClick size={12} />
                  {link.click_count} click{link.click_count !== 1 ? 's' : ''}
                </div>

                <div className="link-menu-wrap">
                  <button
                    className="icon-btn"
                    onClick={e => { e.stopPropagation(); setOpenMenu(openMenu === link.id ? null : link.id) }}
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {openMenu === link.id && (
                    <div className="dropdown-menu">
                      <button onClick={() => { setEditLink(link); setShowCreate(true); setOpenMenu(null) }}>
                        <Edit2 size={13} /> Edit
                      </button>
                      <button onClick={() => { setQrLink(link); setOpenMenu(null) }}>
                        <QrCode size={13} /> QR Code
                      </button>
                      <a href={`http://${link.domain}/${link.short_code}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={13} /> Visit
                      </a>
                      <div className="dropdown-divider" />
                      <button className="danger" onClick={() => handleDelete(link.id)}>
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <CreateLinkModal
          domains={domains}
          editLink={editLink}
          onClose={() => { setShowCreate(false); setEditLink(null) }}
          onSaved={load}
        />
      )}

      {qrLink && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}
          onClick={() => setQrLink(null)}
        >
          <div
            style={{ 
              background: 'white', 
              borderRadius: '16px', 
              width: '90%', 
              maxWidth: '520px', 
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              display: 'flex', 
              flexDirection: 'column',
              animation: 'qrModalSlide 0.3s ease-out'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f0f0f0' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#0a0a0a', margin: 0, letterSpacing: '-0.02em' }}>QR Code Design</h2>
              <button 
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  border: 'none', 
                  background: '#f5f5f5', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  color: '#666',
                  transition: 'all 0.15s'
                }}
                onClick={() => setQrLink(null)}
                onMouseOver={(e) => { e.currentTarget.style.background = '#e8e8e8'; e.currentTarget.style.color = '#0a0a0a' }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#666' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* QR Code Preview */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{ 
                    width: '200px', 
                    height: '200px', 
                    border: '1px solid #e8e8e8', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    position: 'relative',
                    overflow: 'hidden',
                    backgroundColor: '#fff'
                  }}>
                    <QRCodeSVG
                      id="qr-modal-svg"
                      value={`http://${qrLink.domain}/${qrLink.short_code}`}
                      size={180}
                      bgColor="transparent"
                      fgColor={qrSettings.color}
                    />
                    {qrSettings.logo && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        width: '40px',
                        height: '40px',
                        background: 'white',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px solid ${qrSettings.color}`,
                        fontSize: '20px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden',
                        padding: '4px'
                      }}>
                        {qrSettings.logoUrl ? (
                          <img 
                            src={qrSettings.logoUrl} 
                            alt="Logo" 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'contain'
                            }} 
                          />
                        ) : (
                          '🔗'
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#666', 
                    marginBottom: '12px', 
                    fontFamily: "'Geist Mono', monospace",
                    background: '#f5f5f5',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    display: 'inline-block'
                  }}>
                    {qrLink.domain}/{qrLink.short_code}
                  </div>
                  <button
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      padding: '8px 16px', 
                      background: '#0a0a0a', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '8px', 
                      fontSize: '13px', 
                      fontWeight: '500', 
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onClick={() => {
                      const svg = document.getElementById('qr-modal-svg') as SVGElement | null
                      if (!svg) return
                      const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
                      const a = document.createElement('a')
                      a.href = URL.createObjectURL(blob)
                      a.download = `${qrLink.short_code}-qr.svg`
                      a.click()
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseOut={(e) => { e.currentTarget.style.background = '#0a0a0a'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>

              {/* Customization Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Logo Toggle */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <input
                          type="checkbox"
                          style={{
                            appearance: 'none',
                            width: '44px',
                            height: '24px',
                            background: qrSettings.logo ? '#0a0a0a' : '#e0e0e0',
                            borderRadius: '99px',
                            position: 'relative',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            outline: 'none'
                          }}
                          checked={qrSettings.logo}
                          onChange={(e) => setQrSettings({ ...qrSettings, logo: e.target.checked })}
                        />
                        <span style={{
                          position: 'absolute',
                          width: '18px',
                          height: '18px',
                          background: 'white',
                          borderRadius: '50%',
                          top: '3px',
                          left: qrSettings.logo ? '23px' : '3px',
                          transition: 'transform 0.2s',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                          pointerEvents: 'none'
                        }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>Logo</span>
                    </label>
                  </div>
                  
                  {/* Logo Upload */}
                  {qrSettings.logo && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '56px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        padding: '12px',
                        background: '#f5f5f5',
                        border: '1.5px solid #e0e0e0',
                        borderRadius: '8px'
                      }}>
                        {qrSettings.logoUrl ? (
                          <img 
                            src={qrSettings.logoUrl} 
                            alt="Logo" 
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              objectFit: 'contain',
                              borderRadius: '6px',
                              background: 'white',
                              padding: '4px'
                            }} 
                          />
                        ) : (
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            background: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                          }}>
                            🔗
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            style={{ display: 'none' }}
                            id="logo-upload"
                          />
                          <label
                            htmlFor="logo-upload"
                            style={{
                              display: 'inline-block',
                              padding: '6px 12px',
                              background: '#0a0a0a',
                              color: 'white',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              whiteSpace: 'nowrap'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#333' }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#0a0a0a' }}
                          >
                            {qrSettings.logoUrl ? 'Change logo' : 'Upload logo'}
                          </label>
                          {qrSettings.logoUrl && (
                            <button
                              style={{
                                marginLeft: '8px',
                                padding: '6px 12px',
                                background: 'white',
                                color: '#666',
                                border: '1px solid #e0e0e0',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                              }}
                              onClick={() => setQrSettings({ ...qrSettings, logoUrl: undefined })}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.borderColor = '#bbb'; e.currentTarget.style.color = '#0a0a0a' }}
                              onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#666' }}
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginLeft: '4px' }}>
                        Upload a logo image (PNG, JPG recommended)
                      </div>
                    </div>
                  )}
                </div>

                {/* Color Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: '#0a0a0a' }}>QR Code Color</label>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['#000000', '#1e40af', '#dc2626', '#059669', '#7c3aed', '#ea580c', '#0891b2', '#be123c'].map((presetColor) => (
                      <button
                        key={presetColor}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: qrSettings.color === presetColor ? '2px solid #0a0a0a' : '2px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          position: 'relative',
                          backgroundColor: presetColor
                        }}
                        onClick={() => setQrSettings({ ...qrSettings, color: presetColor })}
                        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)' }}
                        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                      >
                        {qrSettings.color === presetColor && (
                          <span style={{ 
                            position: 'absolute', 
                            top: '50%', 
                            left: '50%', 
                            transform: 'translate(-50%, -50%)', 
                            color: 'white', 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' 
                          }}>
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      style={{
                        width: '100%',
                        height: '36px',
                        border: '1.5px solid #e0e0e0',
                        borderRadius: '8px',
                        padding: '0 12px',
                        fontSize: '14px',
                        fontFamily: "'Geist Mono', monospace",
                        color: '#0a0a0a',
                        transition: 'all 0.15s'
                      }}
                      placeholder="#000000"
                      value={qrSettings.color}
                      onChange={(e) => setQrSettings({ ...qrSettings, color: e.target.value })}
                      maxLength={7}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#0a0a0a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(10, 10, 10, 0.06)' }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.boxShadow = 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'flex-end', 
              padding: '20px 24px', 
              borderTop: '1px solid #f0f0f0', 
              background: '#fafafa' 
            }}>
              <button
                style={{ 
                  padding: '9px 20px', 
                  borderRadius: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  border: '1.5px solid #e0e0e0',
                  background: 'white',
                  color: '#666'
                }}
                onClick={() => setQrLink(null)}
                onMouseOver={(e) => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.borderColor = '#bbb'; e.currentTarget.style.color = '#0a0a0a' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e0e0e0'; e.currentTarget.style.color = '#666' }}
              >
                Cancel
              </button>
              <button
                style={{ 
                  padding: '9px 20px', 
                  borderRadius: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  border: 'none',
                  background: '#0a0a0a',
                  color: 'white'
                }}
                onClick={() => {
                  const svg = document.getElementById('qr-modal-svg') as SVGElement | null
                  if (!svg) return
                  const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = `${qrLink.short_code}-qr.svg`
                  a.click()
                  setQrLink(null)
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#333'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#0a0a0a'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
