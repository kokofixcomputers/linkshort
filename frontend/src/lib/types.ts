export interface Link {
  id: number
  short_code: string
  domain: string
  destination_url: string
  tags: string
  comments: string
  password: string | null
  expires_at: string | null
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  utm_content: string
  user_id: number
  created_at: string
  click_count: number
}

export interface Domain {
  id: number
  domain: string
  cname_target: string | null
  verified: number
  is_system: number
  user_id: number | null
  created_at: string
}

export interface Analytics {
  total_clicks: number
  total_leads: number
  total_sales: number
  time_series: { t: string; cnt: number }[]
  by_link: { short_code: string; domain: string; cnt: number }[]
  referrers: { ref: string; cnt: number }[]
  countries: { country: string; cnt: number }[]
  devices: { device: string; cnt: number }[]
  browsers: { browser: string; cnt: number }[]
}
