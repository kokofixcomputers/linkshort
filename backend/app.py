from flask import Flask, request, jsonify, redirect, session, send_from_directory
from flask_cors import CORS
import sqlite3
import string
import random
import os
import hashlib
from datetime import datetime, timedelta
from functools import wraps
import socket
dist_path = os.path.abspath('../frontend/dist')


app = Flask(__name__, static_folder=dist_path, static_url_path='')
app.secret_key = 'linkshort-secret-key-2024'
CORS(app, supports_credentials=True, origins=['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'])

DB_PATH = os.path.join(os.path.dirname(__file__), 'links.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def migrate_db():
    with get_db() as db:
        # Add is_admin column to users table if it doesn't exist
        try:
            db.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
            db.commit()
        except sqlite3.Error:
            pass  # Column already exists
        
        # Update existing admin user to be admin
        try:
            db.execute("UPDATE users SET is_admin=1 WHERE username='admin'")
            db.commit()
        except sqlite3.Error:
            pass
        
        # Create settings table if it doesn't exist
        try:
            db.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE NOT NULL,
                    value TEXT NOT NULL,
                    created_at TEXT DEFAULT (datetime('now')),
                    updated_at TEXT DEFAULT (datetime('now'))
                )
            """)
            db.commit()
        except sqlite3.Error:
            pass
        
        # Seed default settings
        try:
            db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('public_access', 'false')")
            db.commit()
        except sqlite3.Error:
            pass

def init_db():
    with get_db() as db:
        db.executescript('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                is_admin INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS domains (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT UNIQUE NOT NULL,
                cname_target TEXT,
                verified INTEGER DEFAULT 0,
                is_system INTEGER DEFAULT 0,
                user_id INTEGER,
                created_at TEXT DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS links (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                short_code TEXT NOT NULL,
                domain TEXT NOT NULL,
                destination_url TEXT,
                tags TEXT DEFAULT '',
                comments TEXT DEFAULT '',
                password TEXT DEFAULT NULL,
                expires_at TEXT DEFAULT NULL,
                utm_source TEXT DEFAULT '',
                utm_medium TEXT DEFAULT '',
                utm_campaign TEXT DEFAULT '',
                utm_term TEXT DEFAULT '',
                utm_content TEXT DEFAULT '',
                user_id INTEGER,
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE (domain, short_code)
            );

            CREATE TABLE IF NOT EXISTS clicks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                link_id INTEGER NOT NULL,
                clicked_at TEXT DEFAULT (datetime('now')),
                referrer TEXT DEFAULT '',
                referrer_url TEXT DEFAULT '',
                country TEXT DEFAULT '',
                city TEXT DEFAULT '',
                region TEXT DEFAULT '',
                continent TEXT DEFAULT '',
                device TEXT DEFAULT '',
                browser TEXT DEFAULT '',
                os TEXT DEFAULT '',
                ip TEXT DEFAULT '',
                FOREIGN KEY (link_id) REFERENCES links(id)
            );

            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now')),
                updated_at TEXT DEFAULT (datetime('now'))
            );
        ''')

        # Seed admin user
        pw = hashlib.sha256('admin'.encode()).hexdigest()
        try:
            db.execute("INSERT OR IGNORE INTO users (username, password, is_admin) VALUES ('admin', ?, 1)", (pw,))
        except:
            pass

        # Seed default settings
        try:
            db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('public_access', 'false')")
        except:
            pass

        # Seed system domain (the app's own domain)
        try:
            hostname = socket.gethostname()
            db.execute("INSERT OR IGNORE INTO domains (domain, cname_target, verified, is_system) VALUES ('localhost:8003', NULL, 1, 1)")
            db.execute("INSERT OR IGNORE INTO domains (domain, cname_target, verified, is_system) VALUES ('s.myapp.io', 'cname.myapp.io', 0, 1)")
        except:
            pass

        db.commit()

# Run migrations first, then initialize
migrate_db()
init_db()

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        with get_db() as db:
            user = db.execute("SELECT is_admin FROM users WHERE id=?", (session['user_id'],)).fetchone()
            if not user or not user['is_admin']:
                return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

def generate_short_code(length=7):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

RESERVED_SLUGS = {'api', 'login', 'links', 'analytics', 'domains', 'passwordform', 'static'}
APP_HOST = 'localhost:8003'

def is_reserved(short_code: str, domain: str) -> bool:
    if short_code == '' and domain == APP_HOST:
        return True
    return short_code.lower() in RESERVED_SLUGS

# Auth
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    pw = hashlib.sha256(data.get('password', '').encode()).hexdigest()
    with get_db() as db:
        user = db.execute("SELECT * FROM users WHERE username=? AND password=?", (data.get('username'), pw)).fetchone()
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            return jsonify({'success': True, 'username': user['username']})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/auth/me', methods=['GET'])
def me():
    if 'user_id' in session:
        with get_db() as db:
            user = db.execute("SELECT username, id, is_admin FROM users WHERE id=?", (session['user_id'],)).fetchone()
            return jsonify(dict(user))
    return jsonify({'error': 'Not logged in'}), 401

# Domains
@app.route('/api/domains', methods=['GET'])
@login_required
def get_domains():
    with get_db() as db:
        rows = db.execute("SELECT * FROM domains ORDER BY is_system DESC, created_at ASC").fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/domains', methods=['POST'])
@login_required
def add_domain():
    data = request.json
    domain = data.get('domain', '').strip().lower()
    cname_target = data.get('cname_target', '').strip()
    if not domain:
        return jsonify({'error': 'Domain required'}), 400
    with get_db() as db:
        try:
            db.execute("INSERT INTO domains (domain, cname_target, verified, is_system, user_id) VALUES (?, ?, 0, 0, ?)",
                       (domain, cname_target or None, session['user_id']))
            db.commit()
            row = db.execute("SELECT * FROM domains WHERE domain=?", (domain,)).fetchone()
            return jsonify(dict(row))
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Domain already exists'}), 409

@app.route('/api/domains/<int:domain_id>/verify', methods=['POST'])
@login_required
def verify_domain(domain_id):
    with get_db() as db:
        domain = db.execute("SELECT * FROM domains WHERE id=?", (domain_id,)).fetchone()
        if not domain:
            return jsonify({'error': 'Not found'}), 404
        # Simulate CNAME check
        db.execute("UPDATE domains SET verified=1 WHERE id=?", (domain_id,))
        db.commit()
        return jsonify({'verified': True})

@app.route('/api/domains/<int:domain_id>', methods=['DELETE'])
@login_required
def delete_domain(domain_id):
    with get_db() as db:
        domain = db.execute("SELECT * FROM domains WHERE id=?", (domain_id,)).fetchone()
        if not domain or domain['is_system']:
            return jsonify({'error': 'Cannot delete'}), 400
        db.execute("DELETE FROM domains WHERE id=?", (domain_id,))
        db.commit()
        return jsonify({'success': True})

# Links
@app.route('/api/links', methods=['GET'])
@login_required
def get_links():
    view = request.args.get('view', 'own')  # 'own' or 'all'
    
    with get_db() as db:
        # Check if user is admin
        user = db.execute("SELECT is_admin FROM users WHERE id=?", (session['user_id'],)).fetchone()
        is_admin = user and user['is_admin']
        
        if view == 'all' and is_admin:
            # Admin can see all links
            rows = db.execute("""
                SELECT l.*, u.username, (SELECT COUNT(*) FROM clicks WHERE link_id=l.id) as click_count 
                FROM links l 
                JOIN users u ON l.user_id=u.id 
                ORDER BY l.created_at DESC
            """).fetchall()
        else:
            # Regular users or admin viewing own links
            rows = db.execute("""
                SELECT l.*, (SELECT COUNT(*) FROM clicks WHERE link_id=l.id) as click_count 
                FROM links l 
                WHERE l.user_id=? 
                ORDER BY l.created_at DESC
            """, (session['user_id'],)).fetchall()
        
        return jsonify([dict(r) for r in rows])

@app.route('/api/links', methods=['POST'])
@login_required
def create_link():
    data = request.json
    domain = data.get('domain', 'localhost:8003')
    short_code = data.get('short_code', '').strip()
    if not short_code:
        short_code = ''
    destination_url = data.get('destination_url', '').strip()
    tags = data.get('tags', '')
    comments = data.get('comments', '')
    password = data.get('password', None)
    expires_at = data.get('expires_at', None)
    utm_source = data.get('utm_source', '')
    utm_medium = data.get('utm_medium', '')
    utm_campaign = data.get('utm_campaign', '')
    utm_term = data.get('utm_term', '')
    utm_content = data.get('utm_content', '')

    if is_reserved(short_code, domain):
        return jsonify({'error': 'That short code is reserved'}), 400

    if password:
        password = hashlib.sha256(password.encode()).hexdigest()

    with get_db() as db:
        try:
            db.execute(
                """INSERT INTO links (short_code, domain, destination_url, tags, comments, password, expires_at,
                                      utm_source, utm_medium, utm_campaign, utm_term, utm_content, user_id)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    short_code,
                    domain,
                    destination_url,
                    tags,
                    comments,
                    password,
                    expires_at,
                    utm_source,
                    utm_medium,
                    utm_campaign,
                    utm_term,
                    utm_content,
                    session['user_id'],
                ),
            )
            db.commit()
            row = db.execute(
                "SELECT l.*, 0 as click_count FROM links l WHERE short_code=? AND domain=?",
                (short_code, domain),
            ).fetchone()
            return jsonify(dict(row))
        except sqlite3.IntegrityError:
            # Now this only triggers if (domain, short_code) is already taken
            return jsonify({'error': 'Short code already in use on this domain'}), 409


@app.route('/api/links/<int:link_id>', methods=['PUT'])
@login_required
def update_link(link_id):
    data = request.json
    with get_db() as db:
        link = db.execute("SELECT * FROM links WHERE id=? AND user_id=?", (link_id, session['user_id'])).fetchone()
        if not link:
            return jsonify({'error': 'Not found'}), 404
        password = data.get('password', None)
        if password is not None and password != '':
            password = hashlib.sha256(password.encode()).hexdigest()
        elif password == '':
            password = None
        else:
            password = link['password']
        expires_at = data.get('expires_at', link['expires_at'])
        new_domain = data.get('domain', link['domain'])
        new_short_code = data.get('short_code', link['short_code'])
        if is_reserved(new_short_code, new_domain):
            return jsonify({'error': 'That short code is reserved'}), 400
        try:
            db.execute("""UPDATE links SET destination_url=?, domain=?, short_code=?, tags=?, comments=?, password=?, expires_at=?,
                utm_source=?, utm_medium=?, utm_campaign=?, utm_term=?, utm_content=?
                WHERE id=?""",
                (data.get('destination_url', link['destination_url']),
                 new_domain,
                 new_short_code,
                 data.get('tags', link['tags']),
                 data.get('comments', link['comments']),
                 password,
                 expires_at,
                 data.get('utm_source', link['utm_source']),
                 data.get('utm_medium', link['utm_medium']),
                 data.get('utm_campaign', link['utm_campaign']),
                 data.get('utm_term', link['utm_term']),
                 data.get('utm_content', link['utm_content']),
                 link_id))
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Short code already in use on this domain'}), 409
        db.commit()
        row = db.execute("SELECT l.*, (SELECT COUNT(*) FROM clicks WHERE link_id=l.id) as click_count FROM links l WHERE l.id=?", (link_id,)).fetchone()
        return jsonify(dict(row))

@app.route('/api/links/<int:link_id>', methods=['DELETE'])
@login_required
def delete_link(link_id):
    with get_db() as db:
        db.execute("DELETE FROM clicks WHERE link_id=?", (link_id,))
        db.execute("DELETE FROM links WHERE id=? AND user_id=?", (link_id, session['user_id']))
        db.commit()
        return jsonify({'success': True})

# Admin Settings
@app.route('/api/admin/settings', methods=['GET'])
@admin_required
def get_settings():
    with get_db() as db:
        rows = db.execute("SELECT key, value FROM settings").fetchall()
        return jsonify({r['key']: r['value'] for r in rows})

@app.route('/api/admin/settings', methods=['PUT'])
@admin_required
def update_settings():
    data = request.json
    with get_db() as db:
        for key, value in data.items():
            db.execute("INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))", (key, value))
        db.commit()
        return jsonify({'success': True})

# User Management
@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_users():
    with get_db() as db:
        rows = db.execute("SELECT id, username, is_admin, created_at FROM users ORDER BY created_at DESC").fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    if user_id == session['user_id']:
        return jsonify({'error': 'Cannot delete yourself'}), 400
    with get_db() as db:
        # Delete user's links and clicks
        link_ids = db.execute("SELECT id FROM links WHERE user_id=?", (user_id,)).fetchall()
        for link in link_ids:
            db.execute("DELETE FROM clicks WHERE link_id=?", (link['id'],))
        db.execute("DELETE FROM links WHERE user_id=?", (user_id,))
        db.execute("DELETE FROM domains WHERE user_id=?", (user_id,))
        db.execute("DELETE FROM users WHERE id=?", (user_id,))
        db.commit()
        return jsonify({'success': True})

# Public Signup
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    if not is_public_access_enabled():
        return jsonify({'error': 'Public signup is disabled'}), 403
    
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    
    pw_hash = hashlib.sha256(password.encode()).hexdigest()
    
    with get_db() as db:
        try:
            db.execute("INSERT INTO users (username, password, is_admin) VALUES (?, ?, 0)", (username, pw_hash))
            db.commit()
            return jsonify({'success': True})
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Username already exists'}), 409

def is_public_access_enabled():
    with get_db() as db:
        setting = db.execute("SELECT value FROM settings WHERE key='public_access'").fetchone()
        return setting and setting['value'] == 'true'

# Analytics
@app.route('/api/analytics', methods=['GET'])
@login_required
def get_analytics():
    timeframe = request.args.get('timeframe', '24h')
    hours_map = {'24h': 24, '7d': 168, '30d': 720, 'all': 999999}
    hours = hours_map.get(timeframe, 24)
    since = (datetime.utcnow() - timedelta(hours=hours)).isoformat()

    with get_db() as db:
        # Total clicks
        total_clicks = db.execute("""
            SELECT COUNT(*) as cnt FROM clicks c
            JOIN links l ON c.link_id=l.id
            WHERE l.user_id=? AND c.clicked_at >= ?
        """, (session['user_id'], since)).fetchone()['cnt']

        # Clicks over time (hourly buckets for 24h, daily for longer)
        if hours <= 24:
            time_sql = "strftime('%Y-%m-%d %H:00', c.clicked_at)"
        else:
            time_sql = "strftime('%Y-%m-%d', c.clicked_at)"

        time_series = db.execute(f"""
            SELECT {time_sql} as t, COUNT(*) as cnt
            FROM clicks c JOIN links l ON c.link_id=l.id
            WHERE l.user_id=? AND c.clicked_at >= ?
            GROUP BY t ORDER BY t
        """, (session['user_id'], since)).fetchall()

        # By link
        by_link = db.execute("""
            SELECT l.short_code, l.domain, COUNT(c.id) as cnt
            FROM links l LEFT JOIN clicks c ON c.link_id=l.id AND c.clicked_at >= ?
            WHERE l.user_id=?
            GROUP BY l.id ORDER BY cnt DESC LIMIT 10
        """, (since, session['user_id'])).fetchall()

        # Referrers
        referrers = db.execute("""
            SELECT CASE WHEN c.referrer='' OR c.referrer IS NULL THEN '(direct)' ELSE c.referrer END as ref,
                   COUNT(*) as cnt
            FROM clicks c JOIN links l ON c.link_id=l.id
            WHERE l.user_id=? AND c.clicked_at >= ?
            GROUP BY ref ORDER BY cnt DESC LIMIT 10
        """, (session['user_id'], since)).fetchall()

        # Countries
        countries = db.execute("""
            SELECT country, COUNT(*) as cnt
            FROM clicks c JOIN links l ON c.link_id=l.id
            WHERE l.user_id=? AND c.clicked_at >= ? AND country != ''
            GROUP BY country ORDER BY cnt DESC LIMIT 10
        """, (session['user_id'], since)).fetchall()

        # Devices
        devices = db.execute("""
            SELECT CASE WHEN device='' OR device IS NULL THEN 'Unknown' ELSE device END as device,
                   COUNT(*) as cnt
            FROM clicks c JOIN links l ON c.link_id=l.id
            WHERE l.user_id=? AND c.clicked_at >= ?
            GROUP BY device ORDER BY cnt DESC LIMIT 10
        """, (session['user_id'], since)).fetchall()

        # Browsers
        browsers = db.execute("""
            SELECT CASE WHEN browser='' OR browser IS NULL THEN 'Unknown' ELSE browser END as browser,
                   COUNT(*) as cnt
            FROM clicks c JOIN links l ON c.link_id=l.id
            WHERE l.user_id=? AND c.clicked_at >= ?
            GROUP BY browser ORDER BY cnt DESC LIMIT 10
        """, (session['user_id'], since)).fetchall()

        return jsonify({
            'total_clicks': total_clicks,
            'total_leads': 0,
            'total_sales': 0,
            'time_series': [dict(r) for r in time_series],
            'by_link': [dict(r) for r in by_link],
            'referrers': [dict(r) for r in referrers],
            'countries': [dict(r) for r in countries],
            'devices': [dict(r) for r in devices],
            'browsers': [dict(r) for r in browsers],
        })

@app.route('/passwordform')
def password_form_page():
    return send_from_directory(dist_path, 'index.html')

@app.route('/app')
@app.route('/app/<path:path>')
def serve_app(path):
    return send_from_directory(dist_path, 'index.html')

@app.route('/')
def redirect_root():
    return _do_redirect('')

# Public redirect
@app.route('/<short_code>')
def redirect_link(short_code):
    return _do_redirect(short_code)

def _do_redirect(short_code):
    host = request.host

    # If you want to ignore ports (e.g., treat localhost:8003 as localhost),
    # uncomment the next two lines:
    # if ':' in host:
    #     host = host.split(':', 1)[0]

    with get_db() as db:
        # Enforce domain + short_code uniqueness at lookup time
        link = db.execute(
            "SELECT * FROM links WHERE short_code=? AND domain=?",
            (short_code, host)
        ).fetchone()

        # If no link for this exact domain, just fall through to frontend
        if not link:
            return send_from_directory(dist_path, 'index.html')

        # Check password
        if link['password']:
            return redirect(f'/passwordform?code={short_code}')

        # Check expiration
        if link['expires_at'] and datetime.utcnow().isoformat() > link['expires_at']:
            return "This link has expired.", 410

        # Record click (unchanged)
        ua = request.headers.get('User-Agent', '')
        referrer = request.referrer or ''
        import urllib.parse
        referrer_domain = urllib.parse.urlparse(referrer).netloc if referrer else ''

        if 'Mobile' in ua or 'Android' in ua:
            device = 'Mobile'
        else:
            device = 'Desktop'

        browser = 'Unknown'
        for b in ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera']:
            if b in ua:
                browser = b
                break

        db.execute(
            """INSERT INTO clicks (link_id, referrer, referrer_url, device, browser, ip)
               VALUES (?,?,?,?,?,?)""",
            (link['id'], referrer_domain, referrer, device, browser, request.remote_addr),
        )
        db.commit()

        dest = link['destination_url'] or ''
        if link['utm_source'] or link['utm_medium'] or link['utm_campaign']:
            params = {}
            if link['utm_source']:
                params['utm_source'] = link['utm_source']
            if link['utm_medium']:
                params['utm_medium'] = link['utm_medium']
            if link['utm_campaign']:
                params['utm_campaign'] = link['utm_campaign']
            if link['utm_term']:
                params['utm_term'] = link['utm_term']
            if link['utm_content']:
                params['utm_content'] = link['utm_content']
            import urllib.parse
            sep = '&' if '?' in dest else '?'
            dest += sep + urllib.parse.urlencode(params)

        if dest:
            return redirect(dest)
        return "No destination configured", 404


@app.route('/api/links/<short_code>/unlock', methods=['POST'])
def unlock_link(short_code):
    host = request.host
    data = request.json or {}
    pw = data.get('password', '')
    with get_db() as db:
        link = db.execute(
            "SELECT * FROM links WHERE short_code=? AND domain=?",
            (short_code, host)
        ).fetchone()
        if not link:
            return jsonify({'error': 'Not found'}), 404
        if hashlib.sha256(pw.encode()).hexdigest() != link['password']:
            return jsonify({'error': 'Wrong password'}), 401
        return jsonify({'destination': link['destination_url']})

def migrate_links_unique_constraint():
    with get_db() as db:
        # Check if migration already done by trying to add the index
        try:
            db.execute("PRAGMA foreign_keys=off;")

            # Rename old table
            db.execute("ALTER TABLE links RENAME TO links_old;")

            # Create new table with composite UNIQUE
            db.executescript("""
                CREATE TABLE links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    short_code TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    destination_url TEXT,
                    tags TEXT DEFAULT '',
                    comments TEXT DEFAULT '',
                    password TEXT DEFAULT NULL,
                    utm_source TEXT DEFAULT '',
                    utm_medium TEXT DEFAULT '',
                    utm_campaign TEXT DEFAULT '',
                    utm_term TEXT DEFAULT '',
                    utm_content TEXT DEFAULT '',
                    user_id INTEGER,
                    created_at TEXT DEFAULT (datetime('now')),
                    UNIQUE (domain, short_code)
                );
            """)

            # Copy data (ignores the old UNIQUE constraint on short_code)
            db.execute("""
                INSERT INTO links (id, short_code, domain, destination_url, tags, comments, password,
                                   utm_source, utm_medium, utm_campaign, utm_term, utm_content, user_id, created_at)
                SELECT id, short_code, domain, destination_url, tags, comments, password,
                       utm_source, utm_medium, utm_campaign, utm_term, utm_content, user_id, created_at
                FROM links_old;
            """)

            db.execute("DROP TABLE links_old;")
            db.execute("PRAGMA foreign_keys=on;")
            db.commit()
        except sqlite3.Error:
            db.rollback()
            db.execute("PRAGMA foreign_keys=on;")
            
migrate_links_unique_constraint()

try:
    with get_db() as db:
        db.execute("ALTER TABLE links ADD COLUMN expires_at TEXT DEFAULT NULL")
        db.commit()
except:
    pass


if __name__ == '__main__':
    app.run(debug=True, port=8003)
