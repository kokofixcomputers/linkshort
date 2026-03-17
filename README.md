# LinkShort — URL Shortener

A full-stack URL shortener with analytics, custom domains, and a clean dashboard UI.

## Stack
- **Backend**: Python / Flask + SQLite
- **Frontend**: React 18 + TypeScript + Vite + Recharts

## Quick Start

```bash
chmod +x start.sh
./start.sh
```

Then open http://localhost:5173

**Default credentials:** `admin` / `admin`

## Manual Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Features

- **Link Management** — Create, edit, delete short links with custom slugs
- **Custom Domains** — Add your own domains via CNAME records
- **Analytics Dashboard** — Clicks over time, referrers, countries, devices, browsers
- **Password Protection** — Lock any link behind a password
- **UTM Parameters** — Append tracking params automatically
- **QR Code Preview** — Visual QR placeholder on link creation

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/links | List links |
| POST | /api/links | Create link |
| PUT | /api/links/:id | Update link |
| DELETE | /api/links/:id | Delete link |
| GET | /api/domains | List domains |
| POST | /api/domains | Add domain |
| POST | /api/domains/:id/verify | Verify CNAME |
| DELETE | /api/domains/:id | Remove domain |
| GET | /api/analytics?timeframe=24h | Analytics data |
| GET | /:short_code | Redirect (public) |

## Adding Domains

1. Go to **Domains** in the sidebar
2. Click **Add domain**
3. Enter your domain (e.g. `links.example.com`)
4. Set a CNAME record in your DNS pointing to `cname.linkshort.io`
5. Click **Verify** once DNS propagates (up to 48h)
