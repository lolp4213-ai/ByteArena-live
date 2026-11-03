from flask import Flask, send_from_directory, redirect, request, url_for, jsonify, abort, session
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
import os
import json
import sqlite3
import hmac
import re
import secrets
from datetime import timedelta

BASE_DIR = os.path.dirname(__file__)
HTML_DIR = os.path.join(BASE_DIR, 'html')
CSS_DIR = os.path.join(BASE_DIR, 'css')
IMG_DIR = os.path.join(BASE_DIR, 'img')
JS_DIR = os.path.join(BASE_DIR, 'static', 'js')
DB_PATH = os.path.join(BASE_DIR, 'logo.db')
GAMES_DIR = os.path.join(BASE_DIR, 'static', 'games')
PROFILE_UPLOADS_DIR = os.path.join(BASE_DIR, 'static', 'uploads', 'profiles')

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('BYTEARENA_SECRET_KEY', 'change-this-secret-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('BYTEARENA_COOKIE_SECURE', '').lower() == 'true'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['MAX_CONTENT_LENGTH'] = 40 * 1024 * 1024
USERNAME_PATTERN = re.compile(r'^[A-Za-zА-Яа-яІіЇїЄєҐґ0-9_-]{3,32}$')
ALLOWED_AVATAR_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
ALLOWED_BACKGROUND_EXTENSIONS = ALLOWED_AVATAR_EXTENSIONS | {'mp4', 'webm', 'ogg'}
ADMIN_USERS = {
    username.strip()
    for username in os.environ.get('BYTEARENA_ADMIN_USERS', 'admin').split(',')
    if username.strip()
}
AUTH_COOKIE_NAME = 'bytearena_auth'
AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30


def auth_cookie_serializer():
    return URLSafeTimedSerializer(app.secret_key, salt='bytearena-auth')


@app.route('/')
def index():
    return redirect('/bytearena')

@app.route('/health')
def health():
    return jsonify({'status': 'ok'})


@app.route('/bytearena')
def bytearena():
    return send_from_directory(HTML_DIR, 'ByteArena.html')


@app.route('/biblioteka')
def biblioteka():
    return send_from_directory(HTML_DIR, 'biblioteka.html')


@app.route('/compare')
def compare():
    return send_from_directory(HTML_DIR, 'compare.html')


@app.route('/about')
def about():
    return send_from_directory(HTML_DIR, 'about.html')


@app.route('/portfolio')
def portfolio():
    return send_from_directory(HTML_DIR, 'portfolio.html')


@app.route('/news')
def news():
    return send_from_directory(HTML_DIR, 'news.html')


@app.route('/login')
def login():
    if current_user():
        return redirect(url_for('profil'))
    return send_from_directory(HTML_DIR, 'login.html')


@app.route('/register')
def register():
    if current_user():
        return redirect(url_for('profil'))
    return send_from_directory(HTML_DIR, 'Registe.html')

@app.route('/test_download')
def test_download():
    return send_from_directory(HTML_DIR, 'test_download.html')

@app.route('/Uncharted')
def Uncharted():
    return send_from_directory(HTML_DIR, 'Uncherted.html') 

@app.route('/GodofWar')
def GodOfWar():
    return send_from_directory(HTML_DIR, 'GodofWar.html')

@app.route('/Spider-Man')
def SpiderMan():
    return send_from_directory(HTML_DIR, 'Spider-Man.html')

@app.route('/TheLastofUs')
def TheLastofUs():
    return send_from_directory(HTML_DIR, 'TheLastOfUs.html')

@app.route('/HorizonZeroDawn')
def HorizonZeroDawn():
    return send_from_directory(HTML_DIR, 'HorizonZeroDawn.html')

@app.route('/DeathStranding')
def DeathStranding():
    return send_from_directory(HTML_DIR, 'DeathStranding.html')

@app.route('/DemonSouls')
def DemonSouls():
    return send_from_directory(HTML_DIR, 'DemonSouls.html')

@app.route('/GostOfTsusima')
def GostOfTsusima():
    return send_from_directory(HTML_DIR, 'GostOfTsusima.html') 

@app.route('/GhostOfTsushima')
def GhostOfTsushima():
    return redirect(url_for('GostOfTsusima'))

@app.route('/profil')
def profil(): 
    if not current_user():
        return redirect(url_for('login') + '?msg=required')
    return send_from_directory(HTML_DIR, 'profil.html')

@app.route('/admin')
def admin():
    if not is_admin():
        return redirect(url_for('profil') + '?msg=admin_required')
    return send_from_directory(HTML_DIR, 'admin.html')

@app.route('/profile')
def profile_alias():
    return redirect(url_for('profil'))

@app.route('/library')
def library_alias():
    return redirect(url_for('biblioteka'))

@app.route('/store')
def store_alias():
    return redirect(url_for('biblioteka'))

@app.route('/basket')
def basket():
    return redirect(url_for('portfolio'))

@app.route('/do_basket', methods=['GET'])
def do_basket():
    return redirect(url_for('portfolio'))

@app.route('/do_logout', methods=['GET'])
def do_logout():
    return send_from_directory(HTML_DIR, 'login.html')

USERS_FILE = os.path.join(BASE_DIR, 'users.json')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS games (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            price REAL NOT NULL DEFAULT 0,
            genre TEXT NOT NULL DEFAULT 'Action',
            platform TEXT NOT NULL DEFAULT 'PC',
            image TEXT NOT NULL,
            rating REAL NOT NULL DEFAULT 0,
            is_free INTEGER NOT NULL DEFAULT 0
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS basket (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            game TEXT NOT NULL,
            count INTEGER NOT NULL DEFAULT 1
        )
    """)
    cur.execute('CREATE UNIQUE INDEX IF NOT EXISTS basket_user_game_idx ON basket (user, game)')
    cur.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            total REAL NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            game TEXT NOT NULL,
            count INTEGER NOT NULL,
            price REAL NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS wishlist (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            game TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user, game)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            game TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user, game)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS coupons (
            code TEXT PRIMARY KEY,
            percent INTEGER NOT NULL,
            expires_at TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS achievements (
            user TEXT NOT NULL,
            code TEXT NOT NULL,
            title TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user, code)
        )
    """)
    for column, definition in (
        ('status', "TEXT NOT NULL DEFAULT 'new'"),
        ('coupon', "TEXT NOT NULL DEFAULT ''"),
        ('discount', "REAL NOT NULL DEFAULT 0"),
    ):
        try:
            cur.execute(f'ALTER TABLE orders ADD COLUMN {column} {definition}')
        except sqlite3.OperationalError as error:
            if 'duplicate column name' not in str(error).lower():
                raise
    cur.execute(
        'INSERT OR IGNORE INTO coupons (code, percent) VALUES (?, ?)',
        ('WELCOME10', 10)
    )
    games = [
        ('uncharted', 'Uncharted', 'A cinematic action-adventure journey.', 1499, 'Adventure', 'PlayStation, PC', '/img/game6.jpg', 4.7, 0),
        ('ghost-of-tsushima', 'Ghost of Tsushima', 'Become the last samurai of Tsushima.', 1499, 'Action', 'PlayStation, PC', '/img/game2.jpg', 4.9, 0),
        ('god-of-war', 'God of War', 'A mythic journey through the Norse realms.', 1199, 'Action RPG', 'PC', '/img/game3.jpg', 4.8, 0),
        ('spider-man', 'Spider-Man', 'Swing through the city and protect New York.', 0, 'Action', 'PlayStation, PC', '/img/game4.jpg', 4.6, 1),
        ('the-last-of-us', 'The Last of Us', 'A story of survival and human connection.', 0, 'Story', 'PlayStation, PC', '/img/game5.jpg', 4.8, 1),
        ('horizon-zero-dawn', 'Horizon Zero Dawn', 'Explore a beautiful world ruled by machines.', 0, 'RPG', 'PC', '/img/game1.jpg', 4.7, 1),
        ('death-stranding', 'Death Stranding', 'Reconnect a fractured world in a strange future.', 0, 'Adventure', 'PC', '/img/game7.jpg', 4.5, 1),
        ('demons-souls', "Demon's Souls", 'Face brutal challenges in a dark fantasy world.', 0, 'RPG', 'PlayStation 5', '/img/game8.jpg', 4.8, 1),
        ('elden-ring', 'Elden Ring', 'Explore the vast Lands Between and forge your own legend.', 1599, 'Action RPG', 'PC, PlayStation, Xbox', 'https://cdn.akamai.steamstatic.com/steam/apps/1245620/capsule_616x353.jpg', 4.9, 0),
        ('cyberpunk-2077', 'Cyberpunk 2077', 'Live the story of V in the neon-lit Night City.', 1399, 'RPG', 'PC, PlayStation, Xbox', 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/capsule_616x353.jpg', 4.6, 0),
        ('baldurs-gate-3', "Baldur's Gate 3", 'Gather your party and shape an unforgettable fantasy adventure.', 1699, 'RPG', 'PC, PlayStation 5, Xbox', 'https://cdn.akamai.steamstatic.com/steam/apps/1086940/capsule_616x353.jpg', 4.9, 0),
        ('hades', 'Hades', 'Battle out of the Underworld in this fast-paced roguelike.', 499, 'Roguelike', 'PC, Nintendo Switch, Xbox', 'https://cdn.akamai.steamstatic.com/steam/apps/1145360/capsule_616x353.jpg', 4.8, 0),
    ]
    cur.executemany("""
        INSERT OR IGNORE INTO games
        (id, title, description, price, genre, platform, image, rating, is_free)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, games)
    conn.commit()
    conn.close()

init_db()

@app.route('/do_register', methods=['POST'])
def do_register():
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')
    if not username or not password:
        return redirect(url_for('register') + '?msg=missing')
    if not valid_credentials(username, password):
        return redirect(url_for('register') + '?msg=invalid')

    users = _load_users()
    if username in users:
        return redirect(url_for('register') + '?msg=exists')

    users[username] = {'password': generate_password_hash(password)}
    _save_users(users)
    return redirect(url_for('login') + '?msg=created')


@app.route('/do_login', methods=['POST'])
def do_login():
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')
    if not username or not password:
        return redirect(url_for('login') + '?msg=missing')

    users = _load_users()
    entry = users.get(username)
    stored_password = entry.get('password', '') if entry else ''
    valid_password = False
    if stored_password.startswith(('scrypt:', 'pbkdf2:')):
        valid_password = check_password_hash(stored_password, password)
    else:
        valid_password = stored_password == password
        if valid_password:
            users[username]['password'] = generate_password_hash(password)
            _save_users(users)
    if valid_password:
        session.clear()
        session.permanent = True
        session['user'] = username
        resp = redirect('/profil?msg=logged')
        resp.set_cookie(
            AUTH_COOKIE_NAME,
            auth_cookie_serializer().dumps(username),
            max_age=AUTH_COOKIE_MAX_AGE,
            httponly=True,
            secure=app.config['SESSION_COOKIE_SECURE'],
            samesite='Lax'
        )
        return resp
    else:
        return redirect(url_for('login') + '?msg=failed')

@app.route('/do_profil', methods=['POST'])
def do_profil():
    if not current_user():
        return redirect(url_for('login') + '?msg=failed')
    return redirect(url_for('profil') + '?msg=logged')

@app.route('/logout', methods=['GET'])
def logout():
    resp = redirect('/login?msg=logged_out')
    session.clear()
    resp.delete_cookie(
        AUTH_COOKIE_NAME,
        secure=app.config['SESSION_COOKIE_SECURE'],
        samesite='Lax'
    )
    resp.delete_cookie('user', secure=app.config['SESSION_COOKIE_SECURE'], samesite='Lax')
    return resp

@app.route('/css/<path:filename>')
def css_files(filename):
    return send_from_directory(CSS_DIR, filename)


@app.route('/img/<path:filename>')
def img_files(filename):
    return send_from_directory(IMG_DIR, filename)

@app.route('/js/<path:filename>')
def legacy_js_files(filename):
    return send_from_directory(JS_DIR, filename)


@app.route('/api/basket', methods=['GET'])
def api_basket():
    user = current_user()
    if not user:
        return jsonify({'error':'not logged in'}), 401
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT basket.id, basket.game, basket.count,
               games.title, games.image, games.price
        FROM basket
        JOIN games ON games.id = basket.game
        WHERE basket.user=?
        ORDER BY basket.id DESC
    """, (user,))
    items = [dict(r) for r in cur.fetchall()]
    conn.close()
    return jsonify(items)

@app.route('/api/basket/add', methods=['POST'])
def api_basket_add():
    user = current_user()
    if not user:
        return jsonify({'error':'not logged in'}), 401
    payload = request.get_json(silent=True) or {}
    game = request.form.get('game') or payload.get('game')
    if not game:
        return jsonify({'error':'missing game'}), 400
    conn = get_db()
    cur = conn.cursor()
    if cur.execute('SELECT 1 FROM games WHERE id=?', (game,)).fetchone() is None:
        conn.close()
        return jsonify({'error': 'unknown game'}), 404
    cur.execute('SELECT id, count FROM basket WHERE user=? AND game=?', (user, game))
    row = cur.fetchone()
    if row:
        cur.execute('UPDATE basket SET count=count+1 WHERE id=?', (row['id'],))
    else:
        cur.execute('INSERT INTO basket (user, game, count) VALUES (?, ?, 1)', (user, game))
    conn.commit()
    conn.close()
    return jsonify({'ok':True})

@app.route('/api/basket/remove', methods=['POST'])
def api_basket_remove():
    user = current_user()
    if not user:
        return jsonify({'error':'not logged in'}), 401
    payload = request.get_json(silent=True) or {}
    basket_id = request.form.get('basket_id') or payload.get('basket_id')
    if not basket_id:
        return jsonify({'error':'missing basket_id'}), 400
    conn = get_db()
    cur = conn.cursor()
    cur.execute('DELETE FROM basket WHERE id=? AND user=?', (basket_id, user))
    conn.commit()
    conn.close()
    return jsonify({'ok':True})

@app.route('/api/basket/update', methods=['POST'])
def api_basket_update():
    user = current_user()
    if not user:
        return jsonify({'error': 'not logged in'}), 401
    payload = request.get_json(silent=True) or {}
    basket_id = request.form.get('basket_id') or payload.get('basket_id')
    raw_count = request.form.get('count') or payload.get('count')
    try:
        count = int(raw_count)
    except (TypeError, ValueError):
        return jsonify({'error': 'invalid count'}), 400
    if not basket_id or count < 0 or count > 99:
        return jsonify({'error': 'invalid basket item'}), 400
    conn = get_db()
    if count == 0:
        conn.execute('DELETE FROM basket WHERE id=? AND user=?', (basket_id, user))
    else:
        conn.execute(
            'UPDATE basket SET count=? WHERE id=? AND user=?',
            (count, basket_id, user)
        )
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.route('/api/games', methods=['GET'])
def api_games():
    conn = get_db()
    query = request.args.get('q', '').strip()
    genre = request.args.get('genre', '').strip()
    platform = request.args.get('platform', '').strip()
    max_price = request.args.get('max_price', '').strip()
    min_rating = request.args.get('min_rating', '').strip()
    sort = request.args.get('sort', 'popular')
    clauses = []
    params = []
    if query:
        clauses.append('(title LIKE ? OR description LIKE ? OR genre LIKE ? OR platform LIKE ?)')
        params.extend([f'%{query}%'] * 4)
    if genre and genre != 'all':
        clauses.append('genre = ?')
        params.append(genre)
    if platform and platform != 'all':
        clauses.append('platform LIKE ?')
        params.append(f'%{platform}%')
    if max_price:
        try:
            max_price_value = float(max_price)
        except ValueError:
            return jsonify({'error': 'invalid max price'}), 400
        if max_price_value < 0:
            return jsonify({'error': 'invalid max price'}), 400
        clauses.append('price <= ?')
        params.append(max_price_value)
    if min_rating:
        try:
            min_rating_value = float(min_rating)
        except ValueError:
            return jsonify({'error': 'invalid minimum rating'}), 400
        if not 0 <= min_rating_value <= 5:
            return jsonify({'error': 'invalid minimum rating'}), 400
        clauses.append('rating >= ?')
        params.append(min_rating_value)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ''
    order_by = {
        'price-low': 'price ASC',
        'price-high': 'price DESC',
        'rating': 'rating DESC',
        'newest': 'rowid DESC',
    }.get(sort, 'rating DESC')
    rows = conn.execute(f'SELECT * FROM games {where} ORDER BY {order_by}', params).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/admin/summary')
def api_admin_summary():
    if not is_admin():
        return jsonify({'error': 'admin access required'}), 403
    conn = get_db()
    games = conn.execute('SELECT COUNT(*) AS count FROM games').fetchone()['count']
    orders = conn.execute('SELECT COUNT(*) AS count FROM orders').fetchone()['count']
    revenue = conn.execute('SELECT COALESCE(SUM(total), 0) AS total FROM orders').fetchone()['total']
    conn.close()
    users = _load_users()
    return jsonify({
        'games': games,
        'users': len(users),
        'orders': orders,
        'revenue': revenue
    })

@app.route('/api/admin/games', methods=['GET', 'POST'])
def api_admin_games():
    if not is_admin():
        return jsonify({'error': 'admin access required'}), 403
    if request.method == 'GET':
        conn = get_db()
        rows = conn.execute('SELECT * FROM games ORDER BY rowid DESC').fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])

    payload = request.get_json(silent=True) or {}
    game_id = str(payload.get('id', '')).strip().lower()
    title = str(payload.get('title', '')).strip()
    description = str(payload.get('description', '')).strip()
    genre = str(payload.get('genre', '')).strip()
    platform = str(payload.get('platform', '')).strip()
    image = str(payload.get('image', '')).strip()
    try:
        price = float(payload.get('price', 0))
        rating = float(payload.get('rating', 0))
    except (TypeError, ValueError):
        return jsonify({'error': 'price and rating must be numbers'}), 400
    is_free = 1 if payload.get('is_free') else 0
    if not re.fullmatch(r'[a-z0-9-]{2,64}', game_id):
        return jsonify({'error': 'invalid game id'}), 400
    if not 1 <= len(title) <= 120 or not genre or not platform or not image:
        return jsonify({'error': 'title, genre, platform and image are required'}), 400
    if price < 0 or rating < 0 or rating > 5:
        return jsonify({'error': 'invalid price or rating'}), 400
    conn = get_db()
    try:
        conn.execute("""
            INSERT INTO games (id, title, description, price, genre, platform, image, rating, is_free)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (game_id, title, description, price, genre, platform, image, rating, is_free))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'error': 'game id already exists'}), 409
    row = conn.execute('SELECT * FROM games WHERE id=?', (game_id,)).fetchone()
    conn.close()
    return jsonify({'ok': True, 'game': dict(row)}), 201

@app.route('/api/admin/games/<game_id>', methods=['PUT', 'DELETE'])
def api_admin_game(game_id):
    if not is_admin():
        return jsonify({'error': 'admin access required'}), 403
    conn = get_db()
    if request.method == 'DELETE':
        deleted = conn.execute('DELETE FROM games WHERE id=?', (game_id,)).rowcount
        conn.commit()
        conn.close()
        if not deleted:
            return jsonify({'error': 'game not found'}), 404
        return jsonify({'ok': True})

    payload = request.get_json(silent=True) or {}
    fields = ('title', 'description', 'price', 'genre', 'platform', 'image', 'rating', 'is_free')
    updates = {field: payload[field] for field in fields if field in payload}
    if not updates:
        return jsonify({'error': 'no fields to update'}), 400
    if 'price' in updates or 'rating' in updates:
        try:
            if 'price' in updates: updates['price'] = float(updates['price'])
            if 'rating' in updates: updates['rating'] = float(updates['rating'])
        except (TypeError, ValueError):
            return jsonify({'error': 'price and rating must be numbers'}), 400
    if 'rating' in updates and not 0 <= updates['rating'] <= 5:
        return jsonify({'error': 'invalid rating'}), 400
    if 'price' in updates and updates['price'] < 0:
        return jsonify({'error': 'invalid price'}), 400
    if 'is_free' in updates:
        updates['is_free'] = 1 if updates['is_free'] else 0
    assignments = ', '.join(f'{field}=?' for field in updates)
    values = list(updates.values()) + [game_id]
    changed = conn.execute(f'UPDATE games SET {assignments} WHERE id=?', values).rowcount
    conn.commit()
    row = conn.execute('SELECT * FROM games WHERE id=?', (game_id,)).fetchone()
    conn.close()
    if not changed or not row:
        return jsonify({'error': 'game not found'}), 404
    return jsonify({'ok': True, 'game': dict(row)})

@app.route('/api/admin/users')
def api_admin_users():
    if not is_admin():
        return jsonify({'error': 'admin access required'}), 403
    users = _load_users()
    return jsonify([
        {
            'username': username,
            'display_name': (entry.get('profile') or {}).get('display_name') or username,
            'has_avatar': bool((entry.get('profile') or {}).get('avatar_url'))
        }
        for username, entry in users.items()
    ])

@app.route('/api/admin/orders')
def api_admin_orders():
    if not is_admin():
        return jsonify({'error': 'admin access required'}), 403
    conn = get_db()
    rows = conn.execute(
        'SELECT id, user, total, discount, coupon, status, created_at FROM orders ORDER BY id DESC'
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/admin/orders/<int:order_id>', methods=['PATCH'])
def api_admin_order_update(order_id):
    if not is_admin():
        return jsonify({'error': 'admin access required'}), 403
    status = str((request.get_json(silent=True) or {}).get('status', '')).strip().lower()
    if status not in {'new', 'paid', 'processing', 'completed', 'cancelled'}:
        return jsonify({'error': 'invalid order status'}), 400
    conn = get_db()
    row = conn.execute('SELECT user FROM orders WHERE id=?', (order_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({'error': 'order not found'}), 404
    conn.execute('UPDATE orders SET status=? WHERE id=?', (status, order_id))
    conn.commit()
    conn.close()
    add_notification(row['user'], 'Статус замовлення змінено', f'Замовлення #{order_id}: {status}.')
    return jsonify({'ok': True})

@app.route('/api/games/genres', methods=['GET'])
def api_game_genres():
    conn = get_db()
    genres = [row['genre'] for row in conn.execute('SELECT DISTINCT genre FROM games ORDER BY genre')]
    conn.close()
    return jsonify(genres)

@app.route('/api/basket/checkout', methods=['POST'])
def api_basket_checkout():
    user = current_user()
    if not user:
        return jsonify({'error': 'not logged in'}), 401
    conn = get_db()
    items = conn.execute("""
        SELECT basket.game, basket.count, games.price
        FROM basket JOIN games ON games.id = basket.game
        WHERE basket.user = ?
    """, (user,)).fetchall()
    if not items:
        conn.close()
        return jsonify({'error': 'basket is empty'}), 400
    payload = request.get_json(silent=True) or {}
    coupon_code = str(payload.get('coupon', '')).strip().upper()
    subtotal = sum(row['count'] * row['price'] for row in items)
    discount = 0
    if coupon_code:
        coupon = conn.execute(
            'SELECT percent FROM coupons WHERE code=? AND (expires_at IS NULL OR expires_at >= date("now"))',
            (coupon_code,)
        ).fetchone()
        if not coupon:
            conn.close()
            return jsonify({'error': 'invalid coupon'}), 400
        discount = round(subtotal * coupon['percent'] / 100, 2)
    total = round(subtotal - discount, 2)
    cursor = conn.execute(
        'INSERT INTO orders (user, total, coupon, discount, status) VALUES (?, ?, ?, ?, ?)',
        (user, total, coupon_code, discount, 'new')
    )
    for row in items:
        conn.execute(
            'INSERT INTO order_items (order_id, game, count, price) VALUES (?, ?, ?, ?)',
            (cursor.lastrowid, row['game'], row['count'], row['price'])
        )
    conn.execute('DELETE FROM basket WHERE user=?', (user,))
    conn.commit()
    conn.close()
    add_notification(user, 'Замовлення оформлено', f'Замовлення #{cursor.lastrowid} успішно створено.')
    unlock_achievements(user)
    return jsonify({'ok': True, 'order_id': cursor.lastrowid, 'total': total})

@app.route('/api/wishlist', methods=['GET', 'POST', 'DELETE'])
def api_wishlist():
    user = current_user()
    if not user:
        return jsonify({'error': 'not logged in'}), 401
    payload = request.get_json(silent=True) or {}
    game = str(payload.get('game', '')).strip()
    conn = get_db()
    if request.method == 'GET':
        rows = conn.execute("""
            SELECT games.*, wishlist.created_at AS saved_at
            FROM wishlist JOIN games ON games.id=wishlist.game
            WHERE wishlist.user=? ORDER BY wishlist.id DESC
        """, (user,)).fetchall()
        conn.close()
        return jsonify([dict(row) for row in rows])
    if not game or not conn.execute('SELECT 1 FROM games WHERE id=?', (game,)).fetchone():
        conn.close()
        return jsonify({'error': 'unknown game'}), 404
    if request.method == 'POST':
        conn.execute('INSERT OR IGNORE INTO wishlist (user, game) VALUES (?, ?)', (user, game))
    else:
        conn.execute('DELETE FROM wishlist WHERE user=? AND game=?', (user, game))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.route('/api/games/<game_id>/reviews', methods=['GET', 'POST'])
def api_game_reviews(game_id):
    conn = get_db()
    if not conn.execute('SELECT 1 FROM games WHERE id=?', (game_id,)).fetchone():
        conn.close()
        return jsonify({'error': 'game not found'}), 404
    if request.method == 'GET':
        rows = conn.execute(
            'SELECT user, rating, comment, created_at FROM reviews WHERE game=? ORDER BY id DESC',
            (game_id,)
        ).fetchall()
        conn.close()
        users = _load_users()
        return jsonify([
            {
                **dict(row),
                'display_name': (users.get(row['user'], {}).get('profile') or {}).get(
                    'display_name'
                ) or row['user']
            }
            for row in rows
        ])
    user = current_user()
    if not user:
        conn.close()
        return jsonify({'error': 'not logged in'}), 401
    payload = request.get_json(silent=True) or {}
    try:
        rating = int(payload.get('rating'))
    except (TypeError, ValueError):
        conn.close()
        return jsonify({'error': 'rating must be 1-5'}), 400
    comment = str(payload.get('comment', '')).strip()
    if rating not in range(1, 6) or len(comment) > 500:
        conn.close()
        return jsonify({'error': 'invalid review'}), 400
    conn.execute("""
        INSERT INTO reviews (user, game, rating, comment) VALUES (?, ?, ?, ?)
        ON CONFLICT(user, game) DO UPDATE SET rating=excluded.rating, comment=excluded.comment
    """, (user, game_id, rating, comment))
    conn.commit()
    conn.close()
    unlock_achievements(user)
    return jsonify({'ok': True})

@app.route('/api/notifications')
def api_notifications():
    user = current_user()
    if not user:
        return jsonify({'error': 'not logged in'}), 401
    conn = get_db()
    rows = conn.execute(
        'SELECT * FROM notifications WHERE user=? ORDER BY id DESC LIMIT 50',
        (user,)
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/notifications/read', methods=['POST'])
def api_notifications_read():
    user = current_user()
    if not user:
        return jsonify({'error': 'not logged in'}), 401
    conn = get_db()
    conn.execute('UPDATE notifications SET is_read=1 WHERE user=?', (user,))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})

@app.route('/api/achievements')
def api_achievements():
    user = current_user()
    if not user:
        return jsonify({'error': 'not logged in'}), 401
    unlock_achievements(user)
    conn = get_db()
    rows = conn.execute(
        'SELECT code, title, created_at FROM achievements WHERE user=? ORDER BY created_at',
        (user,)
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/profile', methods=['GET'])
def api_profile():
    user = current_user()
    if not user:
        return jsonify({'error': 'not logged in'}), 401
    conn = get_db()
    orders = conn.execute(
        'SELECT id, total, status, discount, coupon, created_at FROM orders WHERE user=? ORDER BY id DESC',
        (user,)
    ).fetchall()
    order_data = []
    for order in orders:
        items = conn.execute("""
            SELECT order_items.count, order_items.price, games.title
            FROM order_items
            LEFT JOIN games ON games.id = order_items.game
            WHERE order_items.order_id=?
        """, (order['id'],)).fetchall()
        order_data.append({
            **dict(order),
            'items': [dict(item) for item in items]
        })
    conn.close()
    users = _load_users()
    profile = (users.get(user) or {}).get('profile', {})
    unlock_achievements(user)
    extra_conn = get_db()
    wishlist_count = extra_conn.execute(
        'SELECT COUNT(*) AS count FROM wishlist WHERE user=?', (user,)
    ).fetchone()['count']
    unread_notifications = extra_conn.execute(
        'SELECT COUNT(*) AS count FROM notifications WHERE user=? AND is_read=0', (user,)
    ).fetchone()['count']
    achievements = extra_conn.execute(
        'SELECT code, title, created_at FROM achievements WHERE user=? ORDER BY created_at',
        (user,)
    ).fetchall()
    extra_conn.close()
    avatar_url = profile.get('avatar_url')
    background_url = profile.get('background_url')
    return jsonify({
        'username': user,
        'is_admin': is_admin(),
        'wishlist_count': wishlist_count,
        'unread_notifications': unread_notifications,
        'achievements': [dict(row) for row in achievements],
        'profile': {
            'display_name': profile.get('display_name') or user,
            'bio': profile.get('bio', ''),
            'avatar_color': profile.get('avatar_color', '#e63946'),
            'theme': profile.get('theme', 'dark'),
            'avatar_url': avatar_url,
            'background_url': background_url,
            'background_type': profile.get('background_type')
        },
        'orders': order_data
    })

@app.route('/api/profile/update', methods=['POST'])
def api_profile_update():
    user = current_user()
    if not user:
        return jsonify({'error': 'not logged in'}), 401
    payload = request.get_json(silent=True) or {}
    display_name = str(payload.get('display_name', '')).strip()
    bio = str(payload.get('bio', '')).strip()
    avatar_color = str(payload.get('avatar_color', '')).strip().lower()
    theme = str(payload.get('theme', 'dark')).strip().lower()
    if not 1 <= len(display_name) <= 32:
        return jsonify({'error': 'display name must be 1-32 characters'}), 400
    if len(bio) > 160:
        return jsonify({'error': 'bio must be 160 characters or fewer'}), 400
    if not re.fullmatch(r'#[0-9a-f]{6}', avatar_color):
        return jsonify({'error': 'invalid avatar color'}), 400
    if theme not in {'dark', 'light'}:
        return jsonify({'error': 'invalid theme'}), 400
    users = _load_users()
    if user not in users:
        return jsonify({'error': 'user not found'}), 404
    users[user].setdefault('profile', {})
    users[user]['profile'].update({
        'display_name': display_name,
        'bio': bio,
        'avatar_color': avatar_color,
        'theme': theme
    })
    _save_users(users)
    return jsonify({'ok': True, 'profile': users[user]['profile']})

@app.route('/api/profile/password', methods=['POST'])
def api_profile_password():
    user = current_user()
    if not user:
        return jsonify({'error': 'not logged in'}), 401
    payload = request.get_json(silent=True) or {}
    current_password = str(payload.get('current_password', ''))
    new_password = str(payload.get('new_password', ''))
    if not current_password or not new_password:
        return jsonify({'error': 'Вкажіть поточний і новий пароль.'}), 400
    if len(new_password) < 8:
        return jsonify({'error': 'Новий пароль має містити щонайменше 8 символів.'}), 400
    users = _load_users()
    entry = users.get(user)
    stored_password = entry.get('password', '') if entry else ''
    if not stored_password or not check_password_hash(stored_password, current_password):
        return jsonify({'error': 'Поточний пароль неправильний.'}), 400
    users[user]['password'] = generate_password_hash(new_password)
    _save_users(users)
    return jsonify({'ok': True})


@app.route('/api/profile/media', methods=['POST'])
def api_profile_media():
    user = current_user()
    if not user:
        return jsonify({'error': 'not logged in'}), 401
    upload_type = request.form.get('type', '').strip().lower()
    uploaded_file = request.files.get('file')
    if upload_type not in {'avatar', 'background'}:
        return jsonify({'error': 'invalid media type'}), 400
    if not uploaded_file or not uploaded_file.filename:
        return jsonify({'error': 'file is required'}), 400

    extension = secure_filename(uploaded_file.filename).rsplit('.', 1)[-1].lower()
    allowed_extensions = (
        ALLOWED_AVATAR_EXTENSIONS
        if upload_type == 'avatar'
        else ALLOWED_BACKGROUND_EXTENSIONS
    )
    if extension not in allowed_extensions:
        return jsonify({'error': 'unsupported file type'}), 400

    max_size = 8 * 1024 * 1024 if upload_type == 'avatar' else 30 * 1024 * 1024
    if request.content_length and request.content_length > max_size + 1024 * 1024:
        return jsonify({'error': 'file is too large'}), 413

    users = _load_users()
    if user not in users:
        return jsonify({'error': 'user not found'}), 404
    user_dir = os.path.join(PROFILE_UPLOADS_DIR, secure_filename(user))
    os.makedirs(user_dir, exist_ok=True)
    filename = f'{upload_type}-{secrets.token_urlsafe(12)}.{extension}'
    destination = os.path.join(user_dir, filename)
    uploaded_file.save(destination)
    if os.path.getsize(destination) > max_size:
        os.remove(destination)
        return jsonify({'error': 'file is too large'}), 413

    users[user].setdefault('profile', {})
    old_url_key = f'{upload_type}_url'
    old_url = users[user]['profile'].get(old_url_key)
    if old_url and old_url.startswith(f'/uploads/profiles/{secure_filename(user)}/'):
        old_file = os.path.join(BASE_DIR, 'static', old_url.lstrip('/'))
        if os.path.isfile(old_file):
            os.remove(old_file)
    media_url = f'/uploads/profiles/{secure_filename(user)}/{filename}'
    users[user]['profile'][old_url_key] = media_url
    if upload_type == 'background':
        users[user]['profile']['background_type'] = (
            'video' if extension in {'mp4', 'webm', 'ogg'} else 'image'
        )
    _save_users(users)
    return jsonify({'ok': True, 'profile': users[user]['profile']})


@app.route('/uploads/profiles/<path:filename>')
def profile_upload(filename):
    return send_from_directory(PROFILE_UPLOADS_DIR, filename)

def current_user():
    user = session.get('user')
    if user:
        return user

    token = request.cookies.get(AUTH_COOKIE_NAME)
    if not token:
        return None
    try:
        user = auth_cookie_serializer().loads(token, max_age=AUTH_COOKIE_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return None
    return user if isinstance(user, str) and USERNAME_PATTERN.fullmatch(user) else None

def add_notification(user, title, message):
    conn = get_db()
    conn.execute(
        'INSERT INTO notifications (user, title, message) VALUES (?, ?, ?)',
        (user, title, message)
    )
    conn.commit()
    conn.close()

def unlock_achievements(user):
    conn = get_db()
    checks = [
        ('first-order', 'Перше замовлення',
         conn.execute('SELECT 1 FROM orders WHERE user=? LIMIT 1', (user,)).fetchone()),
        ('first-wishlist', 'Перша гра у списку бажаного',
         conn.execute('SELECT 1 FROM wishlist WHERE user=? LIMIT 1', (user,)).fetchone()),
        ('first-review', 'Перший відгук',
         conn.execute('SELECT 1 FROM reviews WHERE user=? LIMIT 1', (user,)).fetchone()),
        ('five-orders', 'П’ять оформлених замовлень',
         conn.execute('SELECT COUNT(*) AS count FROM orders WHERE user=?', (user,)).fetchone()['count'] >= 5),
    ]
    for code, title, unlocked in checks:
        if unlocked:
            conn.execute(
                'INSERT OR IGNORE INTO achievements (user, code, title) VALUES (?, ?, ?)',
                (user, code, title)
            )
    conn.commit()
    conn.close()

def is_admin():
    return bool(current_user() and current_user() in ADMIN_USERS)

def valid_credentials(username, password):
    return bool(USERNAME_PATTERN.fullmatch(username)) and 8 <= len(password) <= 128

def csrf_token():
    return request.cookies.get('csrf_token')

def require_csrf():
    cookie_token = csrf_token()
    submitted_token = request.form.get('csrf_token') or request.headers.get('X-CSRF-Token')
    if not cookie_token or not submitted_token or not hmac.compare_digest(cookie_token, submitted_token):
        abort(400, description='Invalid CSRF token')

@app.before_request
def protect_state_changing_requests():
    if request.method in {'POST', 'PUT', 'PATCH', 'DELETE'}:
        require_csrf()

@app.after_request
def set_security_headers(response):
    if not csrf_token():
        response.set_cookie(
            'csrf_token',
            secrets.token_urlsafe(32),
            max_age=60 * 60 * 24,
            httponly=False,
            secure=app.config['SESSION_COOKIE_SECURE'],
            samesite='Lax'
        )
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'SAMEORIGIN')
    response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
    return response

def _load_users():
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            app.logger.exception('Users file contains invalid JSON')
            return {}

@app.route('/download/<filename>')
def download(filename):
    # Prevent path traversal and ensure the file exists
    # Normalize and build absolute path
    safe_games_dir = os.path.normpath(GAMES_DIR)
    file_path = os.path.normpath(os.path.join(safe_games_dir, filename))

    # Ensure the resolved path is inside the games directory
    if not file_path.startswith(safe_games_dir + os.sep) and file_path != safe_games_dir:
        abort(400)

    if not os.path.isfile(file_path):
        abort(404)

    # send_from_directory expects the directory and the filename (not a full path)
    return send_from_directory(safe_games_dir, os.path.relpath(file_path, safe_games_dir), as_attachment=True)

def _save_users(d):
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    app.run(
        host=os.environ.get('HOST', '0.0.0.0'),
        port=int(os.environ.get('PORT', '5500')),
        debug=os.environ.get('FLASK_DEBUG', '').lower() == 'true',
        threaded=True
    )
