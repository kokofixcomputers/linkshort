const BASE = '/api'

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => req('/auth/logout', { method: 'POST' }),
  me: () => req('/auth/me'),
  signup: (username: string, password: string) =>
    req('/auth/signup', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // Domains
  getDomains: () => req('/domains'),
  addDomain: (domain: string, cname_target: string) =>
    req('/domains', { method: 'POST', body: JSON.stringify({ domain, cname_target }) }),
  verifyDomain: (id: number) => req(`/domains/${id}/verify`, { method: 'POST' }),
  deleteDomain: (id: number) => req(`/domains/${id}`, { method: 'DELETE' }),

  // Links
  getLinks: (view = 'own') => req(`/links?view=${view}`),
  createLink: (data: Record<string, unknown>) =>
    req('/links', { method: 'POST', body: JSON.stringify(data) }),
  updateLink: (id: number, data: Record<string, unknown>) =>
    req(`/links/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLink: (id: number) => req(`/links/${id}`, { method: 'DELETE' }),

  // Analytics
  getAnalytics: (timeframe = '24h') => req(`/analytics?timeframe=${timeframe}`),

  // Admin
  getSettings: () => req('/admin/settings'),
  updateSettings: (data: Record<string, unknown>) =>
    req('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getUsers: () => req('/admin/users'),
  deleteUser: (id: number) => req(`/admin/users/${id}`, { method: 'DELETE' }),
}
