# License Server for Telegram Multi Chat Manager

## Overview
This is the license server for managing and validating licenses for the Telegram Multi Chat Manager.

## Installation

1. Install Python 3.8 or higher
2. Run `START_LICENSE_SERVER.bat`

## Features

### Admin Dashboard
- View all licenses and their status
- Create new licenses with custom settings
- Edit existing licenses and memos
- View usage logs for each license
- Monitor real-time verification attempts

### License Management
- **License Types**: Basic, Pro, Enterprise
- **Max Accounts**: Configurable per license
- **Expiration**: Optional expiration date
- **Hardware Lock**: Licenses bound to specific hardware
- **Memo System**: Add notes for each license

### Security
- Hardware ID verification
- IP logging for all verification attempts
- Admin authentication required
- Session-based security

## Usage

### First Time Setup
1. Run `START_LICENSE_SERVER.bat`
2. Browser opens automatically at http://localhost:5001
3. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`
4. **IMPORTANT**: Change the admin password in the database

### Creating a License
1. Click "Create New License"
2. Enter required information:
   - User ID (required)
   - Email (optional)
   - License Type
   - Max Accounts
   - Expiration (days, optional)
   - Memo (optional)
3. Click Save
4. Copy the generated license key

### Managing Licenses
- **Edit**: Modify license details and memo
- **Logs**: View all verification attempts
- **Delete**: Remove license permanently
- **Status**: Active, Inactive, or Expired

### Statistics Dashboard
- Total licenses count
- Active licenses
- Expired licenses
- Today's verification count

## Database

The server uses SQLite database (`licenses.db`) with three tables:
- `licenses`: License information
- `usage_logs`: Verification history
- `admin_users`: Admin credentials

## API Endpoints

### Public API
- `POST /api/verify`: Verify license key and hardware ID

### Admin API (requires authentication)
- `GET /api/admin/licenses`: List all licenses
- `POST /api/admin/licenses`: Create new license
- `PUT /api/admin/licenses/<key>`: Update license
- `DELETE /api/admin/licenses/<key>`: Delete license
- `GET /api/admin/logs/<key>`: Get license logs

## Troubleshooting

### Port Already in Use
If port 5001 is already in use, edit `license_server.py` and change:
```python
app.run(host='0.0.0.0', port=5001, debug=False)
```

### Database Locked
Stop the server and restart if database is locked.

### Reset Admin Password
Delete `licenses.db` and restart server to reset to defaults.

## Security Notes

1. Change default admin password immediately
2. Keep `licenses.db` file secure
3. Use HTTPS in production
4. Restrict access to admin panel
5. Regular database backups recommended