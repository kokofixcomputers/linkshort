import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, BarChart2, Zap, ArrowRight } from 'lucide-react'
import './HomePage.css'

export default function HomePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('short-links')

  const tabs = [
    { id: 'short-links', icon: '🔗', label: 'Short Links' },
    { id: 'analytics', icon: '📊', label: 'Conversion Analytics' },
    { id: 'affiliate', icon: '🤝', label: 'Affiliate Programs' },
  ]

  return (
    <div className="home-root">
      {/* Nav */}
      <nav className="home-nav">
        <div className="nav-inner">
          <div className="nav-logo">
            <div className="nav-logo-mark">
              <Link2 size={16} strokeWidth={2.5} />
            </div>
            <span className="nav-logo-text">LinkShort</span>
          </div>
          <div className="nav-links">
          </div>
          <div className="nav-actions">
            <button className="nav-btn-ghost" onClick={() => navigate('/login')}>Sign in</button>
            <button className="nav-btn-dark" onClick={() => navigate('/signup')}>Start for free</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <h1 className="hero-title">Shorten links in seconds.
        </h1>
        <p className="hero-subtitle">
          LinkShort is the modern link attribution platform for short links.
        </p>

        <div className="hero-ctas">
          <button className="cta-primary" onClick={() => navigate('/signup')}>
            Start for free
          </button>
          <button className="cta-secondary" onClick={() => navigate('/login')}>
            Login
          </button>
        </div>
      </section>

      {/* Product preview */}
      <section className="product-section">
        {/* Tab pills */}
        <div className="product-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`product-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mockup window */}
        <div className="product-window">
          <div className="window-chrome">
            <div className="window-dots">
              <span /><span /><span />
            </div>
            <div className="window-url">app.linkshort.io</div>
          </div>
          <div className="window-content">
            <div className="mock-sidebar">
              <div className="mock-nav-item active" />
              <div className="mock-nav-item" />
              <div className="mock-nav-item" />
              <div className="mock-nav-item" />
            </div>
            <div className="mock-main">
              <div className="mock-header">
                <div className="mock-title-bar">
                  <div className="mock-title" />
                  <div className="mock-create-btn" />
                </div>
              </div>
              <div className="mock-form">
                <div className="mock-field">
                  <div className="mock-label" />
                  <div className="mock-input" />
                </div>
                <div className="mock-field">
                  <div className="mock-label" />
                  <div className="mock-input-short">
                    <div className="mock-domain" />
                    <div className="mock-slug" />
                  </div>
                </div>
                <div className="mock-row">
                  <div className="mock-field half">
                    <div className="mock-label" />
                    <div className="mock-input" />
                  </div>
                  <div className="mock-qr-preview">
                    <div className="mock-qr" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom feature tooltip */}
        <div className="feature-tooltip">
          <div className="tooltip-icon">🔗</div>
          <div className="tooltip-text">
            <strong>Short Links</strong>
            <span>Create and manage short links at scale, with advanced features, folders, and role-based access control</span>
          </div>
          <button className="tooltip-learn">Learn more</button>
        </div>
      </section>
    </div>
  )
}