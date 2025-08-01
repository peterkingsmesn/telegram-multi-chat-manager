"""
License Server for Telegram Multi Chat Manager
"""

from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
import sqlite3
import hashlib
import secrets
import os
from datetime import datetime, timedelta
import json
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__, template_folder='../templates', static_folder='../static')
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))

# Enable CORS for deploy server
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:*", "http://127.0.0.1:*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Database setup
DATABASE = 'licenses.db'

def init_db():
    """Initialize database tables"""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    # Licenses table
    c.execute('''CREATE TABLE IF NOT EXISTS licenses
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  license_key TEXT UNIQUE NOT NULL,
                  user_id TEXT NOT NULL,
                  email TEXT,
                  license_type TEXT DEFAULT 'basic',
                  max_accounts INTEGER DEFAULT 30,
                  hardware_id TEXT,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  expires_at TIMESTAMP,
                  is_active BOOLEAN DEFAULT 1,
                  memo TEXT)''')
    
    # Usage logs table
    c.execute('''CREATE TABLE IF NOT EXISTS usage_logs
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  license_key TEXT NOT NULL,
                  hardware_id TEXT NOT NULL,
                  action TEXT NOT NULL,
                  ip_address TEXT,
                  user_agent TEXT,
                  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (license_key) REFERENCES licenses (license_key))''')
    
    # Admin users table
    c.execute('''CREATE TABLE IF NOT EXISTS admin_users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Create default admin if not exists
    admin_exists = c.execute("SELECT COUNT(*) FROM admin_users WHERE username='admin'").fetchone()[0]
    if admin_exists == 0:
        default_password = 'admin123'
        password_hash = hashlib.sha256(default_password.encode()).hexdigest()
        c.execute("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)",
                  ('admin', password_hash))
        logger.info("Created default admin user (username: admin, password: admin123)")
    
    conn.commit()
    conn.close()

def generate_license_key():
    """Generate a unique license key"""
    return f"{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"

# API Routes

@app.route('/api/verify', methods=['POST'])
def verify_license():
    """Verify license key and hardware ID"""
    data = request.json
    license_key = data.get('license_key')
    hardware_id = data.get('hardware_id')
    api_key = data.get('api_key')
    
    # Log the verification attempt
    ip_address = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')
    
    if not license_key or not hardware_id:
        return jsonify({
            'success': False,
            'error': 'License key and hardware ID required'
        }), 400
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Get license info
    license_info = c.execute('''SELECT * FROM licenses 
                                WHERE license_key = ? AND is_active = 1''', 
                             (license_key,)).fetchone()
    
    if not license_info:
        # Log failed attempt
        c.execute('''INSERT INTO usage_logs (license_key, hardware_id, action, ip_address, user_agent)
                     VALUES (?, ?, ?, ?, ?)''',
                  (license_key, hardware_id, 'VERIFY_FAILED', ip_address, user_agent))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': False,
            'error': 'Invalid or inactive license key'
        }), 401
    
    # Check expiration
    if license_info['expires_at']:
        expires_at = datetime.fromisoformat(license_info['expires_at'])
        if datetime.now() > expires_at:
            c.execute('''INSERT INTO usage_logs (license_key, hardware_id, action, ip_address, user_agent)
                         VALUES (?, ?, ?, ?, ?)''',
                      (license_key, hardware_id, 'VERIFY_EXPIRED', ip_address, user_agent))
            conn.commit()
            conn.close()
            
            return jsonify({
                'success': False,
                'error': 'License has expired'
            }), 401
    
    # Check hardware ID
    stored_hw_id = license_info['hardware_id']
    if stored_hw_id and stored_hw_id != hardware_id:
        c.execute('''INSERT INTO usage_logs (license_key, hardware_id, action, ip_address, user_agent)
                     VALUES (?, ?, ?, ?, ?)''',
                  (license_key, hardware_id, 'VERIFY_WRONG_HW', ip_address, user_agent))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': False,
            'error': 'License is registered to different hardware'
        }), 401
    
    # If no hardware ID stored, update it
    if not stored_hw_id:
        c.execute('UPDATE licenses SET hardware_id = ? WHERE license_key = ?',
                  (hardware_id, license_key))
    
    # Log successful verification
    c.execute('''INSERT INTO usage_logs (license_key, hardware_id, action, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?)''',
              (license_key, hardware_id, 'VERIFY_SUCCESS', ip_address, user_agent))
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'user_id': license_info['user_id'],
        'license_type': license_info['license_type'],
        'max_accounts': license_info['max_accounts'],
        'expires_at': license_info['expires_at']
    })

# Admin Routes

@app.route('/')
def admin_login():
    """Admin login page"""
    return render_template('login.html')

@app.route('/admin')
def admin_dashboard():
    """Admin dashboard"""
    if 'admin_logged_in' not in session:
        return render_template('login.html')
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Get all licenses
    licenses = c.execute('''SELECT * FROM licenses ORDER BY created_at DESC''').fetchall()
    
    # Get recent logs
    recent_logs = c.execute('''SELECT l.*, lic.user_id 
                               FROM usage_logs l
                               LEFT JOIN licenses lic ON l.license_key = lic.license_key
                               ORDER BY l.timestamp DESC 
                               LIMIT 100''').fetchall()
    
    # Get statistics
    stats = {
        'total_licenses': len(licenses),
        'active_licenses': sum(1 for l in licenses if l['is_active']),
        'expired_licenses': sum(1 for l in licenses if l['expires_at'] and datetime.fromisoformat(l['expires_at']) < datetime.now()),
        'today_verifications': c.execute('''SELECT COUNT(*) FROM usage_logs 
                                            WHERE date(timestamp) = date('now') 
                                            AND action = 'VERIFY_SUCCESS' ''').fetchone()[0]
    }
    
    conn.close()
    
    return render_template('dashboard.html', 
                         licenses=licenses, 
                         recent_logs=recent_logs,
                         stats=stats)

@app.route('/api/admin/login', methods=['POST'])
def admin_login_api():
    """Admin login API"""
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'success': False, 'error': 'Username and password required'}), 400
    
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    admin = c.execute('SELECT * FROM admin_users WHERE username = ? AND password_hash = ?',
                      (username, password_hash)).fetchone()
    
    conn.close()
    
    if admin:
        session['admin_logged_in'] = True
        session['admin_username'] = username
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    """Admin logout"""
    session.clear()
    return jsonify({'success': True})

@app.route('/api/admin/licenses', methods=['GET'])
def get_licenses():
    """Get all licenses"""
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    licenses = c.execute('SELECT * FROM licenses ORDER BY created_at DESC').fetchall()
    conn.close()
    
    return jsonify({
        'success': True,
        'licenses': [dict(l) for l in licenses]
    })

@app.route('/api/admin/licenses', methods=['POST'])
def create_license():
    """Create new license"""
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    user_id = data.get('user_id')
    email = data.get('email')
    license_type = data.get('license_type', 'basic')
    max_accounts = data.get('max_accounts', 30)
    expires_days = data.get('expires_days')
    memo = data.get('memo', '')
    
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID required'}), 400
    
    license_key = generate_license_key()
    expires_at = None
    
    if expires_days:
        expires_at = (datetime.now() + timedelta(days=int(expires_days))).isoformat()
    
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    try:
        c.execute('''INSERT INTO licenses (license_key, user_id, email, license_type, 
                     max_accounts, expires_at, memo)
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                  (license_key, user_id, email, license_type, max_accounts, expires_at, memo))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'license_key': license_key
        })
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'success': False, 'error': 'Failed to create license'}), 500

@app.route('/api/admin/licenses/<license_key>', methods=['PUT'])
def update_license(license_key):
    """Update license"""
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.json
    
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    # Build update query dynamically
    update_fields = []
    values = []
    
    if 'is_active' in data:
        update_fields.append('is_active = ?')
        values.append(data['is_active'])
    
    if 'memo' in data:
        update_fields.append('memo = ?')
        values.append(data['memo'])
    
    if 'max_accounts' in data:
        update_fields.append('max_accounts = ?')
        values.append(data['max_accounts'])
    
    if 'hardware_id' in data:
        update_fields.append('hardware_id = ?')
        values.append(data['hardware_id'])
    
    if update_fields:
        values.append(license_key)
        query = f"UPDATE licenses SET {', '.join(update_fields)} WHERE license_key = ?"
        c.execute(query, values)
        conn.commit()
    
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/admin/licenses/<license_key>', methods=['DELETE'])
def delete_license(license_key):
    """Delete license"""
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    c.execute('DELETE FROM licenses WHERE license_key = ?', (license_key,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

@app.route('/api/admin/logs/<license_key>')
def get_license_logs(license_key):
    """Get usage logs for specific license"""
    if 'admin_logged_in' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
    
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    logs = c.execute('''SELECT * FROM usage_logs 
                        WHERE license_key = ? 
                        ORDER BY timestamp DESC 
                        LIMIT 100''', (license_key,)).fetchall()
    conn.close()
    
    return jsonify({
        'success': True,
        'logs': [dict(l) for l in logs]
    })

if __name__ == '__main__':
    init_db()
    logger.info("License server starting on http://localhost:5001")
    app.run(host='0.0.0.0', port=5001, debug=False)