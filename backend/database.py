import sqlite3
import os
from werkzeug.security import generate_password_hash, check_password_hash

# WARNING: On Vercel, /tmp is ephemeral. Data will be lost on cold starts.
# For production, you MUST use an external DB (Postgres/MySQL).
if os.environ.get('VERCEL'):
    DB_PATH = '/tmp/partflow.db'
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), 'partflow.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    try:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                role TEXT DEFAULT 'rep',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create default admin if not exists
        cursor = conn.execute('SELECT * FROM users WHERE username = ?', ('admin',))
        if not cursor.fetchone():
            password_hash = generate_password_hash('admin123')
            conn.execute('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
                         ('admin', password_hash, 'Administrator', 'admin'))
        
        conn.commit()
    finally:
        conn.close()

def create_user(username, password, full_name=None, role='rep'):
    # Ensure DB exists (Fix for Vercel ephemeral storage)
    if not os.path.exists(DB_PATH):
        init_db()
        
    password_hash = generate_password_hash(password)
    conn = None
    try:
        conn = get_db_connection()
        conn.execute('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
                     (username, password_hash, full_name, role))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        if conn:
            conn.close()

def authenticate_user(username, password):
    # Ensure DB exists (Fix for Vercel ephemeral storage)
    if not os.path.exists(DB_PATH):
        init_db()

    conn = get_db_connection()
    try:
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        if user and check_password_hash(user['password_hash'], password):
            return {
                "id": user['id'],
                "username": user['username'],
                "full_name": user['full_name'],
                "role": user['role']
            }
    finally:
        conn.close()
    return None

if __name__ == '__main__':
    init_db()
    print("Database initialized.")