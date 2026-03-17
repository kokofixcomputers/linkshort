import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { Analytics } from '../lib/types'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'
import { MousePointerClick, ChevronDown } from 'lucide-react'
import './AnalyticsPage.css'

const TIMEFRAMES = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'All time', value: 'all' },
]

const COUNTRY_FLAGS: Record<string, string> = {
  'Canada': '🇨🇦', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧',
  'Germany': '🇩🇪', 'France': '🇫🇷', 'Netherlands': '🇳🇱',
  'Australia': '🇦🇺', 'Japan': '🇯🇵', 'Brazil': '🇧🇷',
  'India': '🇮🇳', 'Czech Republic': '🇨🇿', 'Poland': '🇵🇱',
}

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="bar-count">{count}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('24h')
  const [showTimeframeDrop, setShowTimeframeDrop] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.getAnalytics(timeframe)
      setData(d)
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => { load() }, [load])

  const timeLabel = TIMEFRAMES.find(t => t.value === timeframe)?.label || ''

  const chartData = data?.time_series.map(d => ({
    time: d.t.length > 10 ? d.t.substring(11, 16) : d.t.substring(5),
    value: d.cnt,
  })) || []

  const maxReferrer = Math.max(...(data?.referrers.map(r => r.cnt) || [0]))
  const maxCountry = Math.max(...(data?.countries.map(c => c.cnt) || [0]))
  const maxDevice = Math.max(...(data?.devices.map(d => d.cnt) || [0]))
  const maxBrowser = Math.max(...(data?.browsers.map(b => b.cnt) || [0]))
  const maxLink = Math.max(...(data?.by_link.map(l => l.cnt) || [0]))

  return (
    <div className="page-root">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
      </div>

      <div className="analytics-toolbar">
        <div className="timeframe-select" style={{ position: 'relative' }}>
          <button className="btn-filter" onClick={() => setShowTimeframeDrop(v => !v)}>
            📅 {timeLabel} <ChevronDown size={12} />
          </button>
          {showTimeframeDrop && (
            <div className="timeframe-dropdown">
              {TIMEFRAMES.map(t => (
                <button
                  key={t.value}
                  className={`timeframe-option ${timeframe === t.value ? 'active' : ''}`}
                  onClick={() => { setTimeframe(t.value); setShowTimeframeDrop(false) }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="analytics-loading"><div className="spinner" /></div>
      ) : (
        <div className="analytics-body">
          {/* Metric tabs */}
          <div className="metric-tabs-card">
            <div
              className="metric-tab active"
            >
              <div className="metric-label">
                <MousePointerClick size={13} /> Clicks
              </div>
              <div className="metric-value">{data?.total_clicks ?? 0}</div>
            </div>
          </div>

          {/* Chart */}
          <div className="chart-card">
            {chartData.length === 0 ? (
              <div className="chart-empty">No data for this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#a3a3a3' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e5e5', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '4 2' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#colorValue)" dot={false} activeDot={{ r: 4, fill: '#3b82f6' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bottom grid */}
          <div className="analytics-grid">
            {/* Short Links */}
            <div className="analytics-card">
              <div className="card-subtabs">
                <button className="card-subtab active">Links</button>
              </div>
              <div className="card-rows">
                {data?.by_link.length === 0 ? (
                  <div className="card-empty">No data</div>
                ) : (
                  data?.by_link.map((l, i) => (
                    <BarRow
                      key={i}
                      label={`${l.domain}/${l.short_code}`}
                      count={l.cnt}
                      max={maxLink}
                      color={i === 0 ? '#fde68a' : '#f3f4f6'}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Referrers */}
            <div className="analytics-card">
              <div className="card-subtabs">
                <button className="card-subtab active">Referrer</button>
              </div>
              <div className="card-rows">
                {data?.referrers.length === 0 ? (
                  <div className="card-empty">No data</div>
                ) : (
                  data?.referrers.map((r, i) => (
                    <BarRow
                      key={i}
                      label={r.ref}
                      count={r.cnt}
                      max={maxReferrer}
                      color={i === 0 ? '#fecaca' : '#f3f4f6'}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Countries */}
            <div className="analytics-card">
              <div className="card-rows" style={{ marginTop: 12 }}>
                {data?.countries.length === 0 ? (
                  <div className="card-empty">No location data</div>
                ) : (
                  data?.countries.map((c, i) => (
                    <BarRow
                      key={i}
                      label={`${COUNTRY_FLAGS[c.country] || '🌍'} ${c.country}`}
                      count={c.cnt}
                      max={maxCountry}
                      color={i === 0 ? '#bfdbfe' : '#f3f4f6'}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Devices */}
            <div className="analytics-card">
              <div className="card-rows" style={{ marginTop: 12 }}>
                {data?.devices.length === 0 ? (
                  <div className="card-empty">No data</div>
                ) : (
                  data?.devices.map((d, i) => (
                    <BarRow
                      key={i}
                      label={d.device}
                      count={d.cnt}
                      max={maxDevice}
                      color={i === 0 ? '#bbf7d0' : '#f3f4f6'}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
