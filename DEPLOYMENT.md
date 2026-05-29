# Movigo FieldOps v2 — Complete cPanel Deployment Guide
# Domain: movigoinnovations.com
# Backend path: ~/public_html/app
# Admin dashboard path: ~/public_html/movigo-fieldops-ai

---

## PHASE 1 — Create Database in cPanel

1. Login to cPanel
2. Click "MySQL Databases" (or "MariaDB Databases")
3. Under "Create New Database":
   - Type: movigoin_fieldops
   - Click Create Database
4. Under "MySQL Users" → Add New User:
   - Username: movigoin_user
   - Click Generate Password → COPY IT SOMEWHERE SAFE
   - Click Create User
5. Under "Add User To Database":
   - User: movigoin_user
   - Database: movigoin_fieldops
   - Click Add
   - Check "ALL PRIVILEGES" → Make Changes

---

## PHASE 2 — Prepare Backend on Your Computer

On your Windows/Mac computer:

```bash
cd movigo-v2/backend
npm install
npm run build
```

This creates a dist/ folder.

Create a .env file in the backend/ folder:

```
NODE_ENV=production
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=movigoin_fieldops
DB_USER=movigoin_user
DB_PASSWORD=PASTE_YOUR_DB_PASSWORD_HERE
JWT_ACCESS_SECRET=PASTE_64_CHAR_RANDOM_STRING_HERE
JWT_REFRESH_SECRET=PASTE_DIFFERENT_64_CHAR_RANDOM_STRING_HERE
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=https://movigoinnovations.com
BASE_URL=https://movigoinnovations.com/app
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
FCM_SERVER_KEY=your_fcm_key
COMPANY_NAME=Movigo Innovations
RATE_LIMIT_MAX=200
AUTH_RATE_LIMIT_MAX=10
ADMIN_EMAIL=admin@movigoinnovations.com
ADMIN_PASSWORD=Movigo@2024
ADMIN_NAME=Super Admin
```

To generate JWT secrets, run this in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Run it twice — use one for JWT_ACCESS_SECRET and another for JWT_REFRESH_SECRET.

Create a ZIP containing:
- dist/
- package.json
- package-lock.json
- .env
- ecosystem.config.js
- logs/ (empty folder)

---

## PHASE 3 — Upload Backend to cPanel

1. Login to cPanel → File Manager
2. Navigate to public_html/app/
3. Upload the ZIP file
4. Right-click the ZIP → Extract
5. Make sure you see: dist/, package.json, .env, ecosystem.config.js

---

## PHASE 4 — Install Dependencies (cPanel Terminal)

```bash
cd ~/public_html/app
npm install --production
```

---

## PHASE 5 — Setup Node.js App in cPanel

1. In cPanel home → search "Node.js" → click "Setup Node.js App"
2. Click "Create Application"
3. Fill in:
   - Node.js version: 18 or 20 (pick highest available)
   - Application mode: Production
   - Application root: public_html/app
   - Application URL: movigoinnovations.com/app
   - Application startup file: dist/server.js
4. Click Create
5. Click "Run NPM Install"

---

## PHASE 6 — Start with PM2

```bash
cd ~/public_html/app

# Install PM2
npm install -g pm2

# Start the app
pm2 start ecosystem.config.js --env production

# Check it's running
pm2 status
# Should show: movigo-api | online

# See startup logs
pm2 logs movigo-api --lines 50

# Save PM2 config
pm2 save

# Enable auto-start on server reboot
pm2 startup
# Run the command it prints
```

---

## PHASE 7 — Create First Admin User

```bash
cd ~/public_html/app
node dist/config/seedAdmin.js
```

This creates:
- Email: admin@movigoinnovations.com
- Password: Movigo@2024

CHANGE THIS PASSWORD immediately after first login!

---

## PHASE 8 — Test Backend

```bash
# Test health check
curl https://movigoinnovations.com/app/health
# Expected: {"success":true,"status":"healthy",...}

# Test API
curl https://movigoinnovations.com/app/api/v1/app-config/public
# Expected: JSON with officeTimings, features etc.

# Check database tables were created
mysql -u movigoin_user -p movigoin_fieldops -e "SHOW TABLES;"
# Should show 25+ tables
```

---

## PHASE 9 — Build Admin Dashboard on Your Computer

```bash
cd movigo-v2/admin-dashboard

# Copy env file
cp .env.local.example .env.local
# The API URL is already set to https://movigoinnovations.com/app/api/v1

npm install
npm run build
# This creates an 'out/' folder
```

---

## PHASE 10 — Upload Admin Dashboard to cPanel

1. cPanel → File Manager → public_html/movigo-fieldops-ai/
2. DELETE all existing files in this folder
3. Upload the ZIP of the 'out/' folder contents
4. Extract
5. You should see: index.html, _next/, etc.

---

## PHASE 11 — Create .htaccess for Admin Dashboard

In cPanel File Manager, create a file at:
public_html/movigo-fieldops-ai/.htaccess

With this content:
```
RewriteEngine On
RewriteBase /movigo-fieldops-ai/

# Handle Next.js static export routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /movigo-fieldops-ai/index.html [L]
```

---

## PHASE 12 — Create .htaccess for Backend API

In cPanel File Manager, create a file at:
public_html/app/.htaccess

With this content:
```
RewriteEngine On

# WebSocket support
RewriteCond %{HTTP:Upgrade} websocket [NC]
RewriteCond %{HTTP:Connection} upgrade [NC]
RewriteRule ^/?(.*) "ws://127.0.0.1:5000/$1" [P,L]

# Proxy all requests to Node.js
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:5000/$1 [P,L]

# Block direct PHP execution in uploads
<FilesMatch "\.(php|pl|py|cgi|sh)$">
  Deny from all
</FilesMatch>
```

---

## PHASE 13 — SSL Certificate

1. cPanel → SSL/TLS → Let's Encrypt SSL (or AutoSSL)
2. Click "Run AutoSSL"
3. Wait 2-3 minutes
4. Verify https://movigoinnovations.com loads with padlock

---

## PHASE 14 — Test Full App

Open browser:
- Admin dashboard: https://movigoinnovations.com/movigo-fieldops-ai/
- Login with: admin@movigoinnovations.com / Movigo@2024
- CHANGE PASSWORD immediately!

Test employee login via API:
```bash
curl -X POST https://movigoinnovations.com/app/api/v1/auth/employee/login \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"FO-001","password":"test123"}'
```

---

## PHASE 15 — Build Flutter App (APK for employees)

On your computer:
```bash
cd movigo-v2/mobile-app
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs

flutter build apk --release \
  --dart-define=API_BASE_URL=https://movigoinnovations.com/app/api/v1 \
  --dart-define=SOCKET_URL=https://movigoinnovations.com/app
```

APK is at: build/app/outputs/flutter-apk/app-release.apk

Share this APK with your 20 employees via WhatsApp or direct download.
Employees install it → login with Employee ID + password you created.

---

## QUICK REFERENCE — All URLs

| What | URL |
|------|-----|
| Admin Dashboard | https://movigoinnovations.com/movigo-fieldops-ai/ |
| Backend API | https://movigoinnovations.com/app/api/v1 |
| Health Check | https://movigoinnovations.com/app/health |

---

## TROUBLESHOOTING

**App not starting:**
```bash
pm2 logs movigo-api --lines 100
# Look for red ERROR lines
```

**Database connection failed:**
```bash
# Check credentials
mysql -u movigoin_user -p
# Type password when asked — if this works, DB is accessible
```

**502 Bad Gateway:**
```bash
pm2 status
# If movigo-api shows "stopped", run:
pm2 restart movigo-api
```

**Admin dashboard shows blank page:**
- Check .htaccess file is in movigo-fieldops-ai/
- Check browser console for errors (F12 → Console)
- Check API URL in .env.local matches your backend

**Employee can't login:**
- Verify employee was created in admin panel
- Check they're using Employee ID (like FO-001), not name
- Try resetting password from admin panel

**Points not updating:**
- Points update in real-time on every submission
- Check pm2 logs for any cron job errors

**CORS error:**
```bash
# Check .env has your exact domain
cat ~/public_html/app/.env | grep CORS
# Should show: CORS_ORIGIN=https://movigoinnovations.com
pm2 restart movigo-api
```
