import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../lib/api'
import { Link, Domain } from '../lib/types'
import { QRCodeSVG } from 'qrcode.react'
import {
  Plus, Copy, Check, MoreHorizontal, Trash2, Edit2,
  ExternalLink, Search, SlidersHorizontal, ChevronDown,
  MousePointerClick, Lock, Globe, QrCode, X, Download
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
  const [links, setLinks] = useState<Link[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editLink, setEditLink] = useState<Link | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [qrLink, setQrLink] = useState<Link | null>(null)
  const [showFilterDrop, setShowFilterDrop] = useState(false)
  const [showDisplayDrop, setShowDisplayDrop] = useState(false)
  const [filters, setFilters] = useState<Filters>({ domain: '', passwordOnly: false, expiryOnly: false })
  const [display, setDisplay] = useState<Display>({ sort: 'newest', showDest: true })
  const filterRef = useRef<HTMLDivElement>(null)
  const displayRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [l, d] = await Promise.all([api.getLinks(), api.getDomains()])
    setLinks(l)
    setDomains(d)
    setLoading(false)
  }, [])

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
    if (!confirm('Delete this link?')) return
    await api.deleteLink(id)
    setLinks(prev => prev.filter(l => l.id !== id))
    setOpenMenu(null)
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
                  {link.password && <Lock size={11} className="link-lock" title="Password protected" />}
                </div>
                <div className="link-dest">
                  <span className="link-arrow">↳</span>
                  {display.showDest
                    ? <span className="link-url">{link.destination_url || 'No URL configured'}</span>
                    : <span className="link-url" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>destination hidden</span>
                  }
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}
          onClick={() => setQrLink(null)}
        >
          <div
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: 24, width: 280, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, animation: 'fadeIn 0.15s ease' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 210 }}>
                {qrLink.domain}/{qrLink.short_code}
              </span>
              <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex', cursor: 'pointer' }} onClick={() => setQrLink(null)}>
                <X size={15} />
              </button>
            </div>
            <QRCodeSVG
              id="qr-modal-svg"
              value={`http://${qrLink.domain}/${qrLink.short_code}`}
              size={180}
              bgColor="transparent"
              fgColor="var(--text-primary)"
            />
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
              onClick={() => {
                const svg = document.getElementById('qr-modal-svg') as SVGElement | null
                if (!svg) return
                const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = `${qrLink.short_code}-qr.svg`
                a.click()
              }}
            >
              <Download size={13} /> Download SVG
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
