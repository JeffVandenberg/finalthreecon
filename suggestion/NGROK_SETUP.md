# ngrok Remote Access Setup Guide

## Quick Start

This guide shows how to expose your local development environment to remote users using ngrok (free tier).

### Prerequisites
- ✅ ngrok installed: `C:\ProgramData\chocolatey\bin\ngrok.exe`
- ✅ Backend running on port 3000
- ✅ Frontend running on port 5173
- ✅ ngrok account (free tier)

---

## 1. Setup ngrok Authentication (One-time)

If you haven't already:

1. Sign up at https://dashboard.ngrok.com/signup
2. Get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
3. **IMPORTANT**: Update `suggestion/ngrok.yml` with your authtoken:
```yaml
authtoken: YOUR_ACTUAL_AUTH_TOKEN_HERE
```
4. Or configure globally:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

---

## 2. Start Your Development Servers

### Terminal 1: Backend
```bash
cd C:\projects\finalthreecon\suggestion\backend
npm run dev
```

**Expected output:**
```
Server running on port 3000
Environment: development
Accepting connections from all interfaces (ngrok-ready)
```

### Terminal 2: Frontend
```bash
cd C:\projects\finalthreecon\suggestion\frontend
npm run dev
```

**Expected output:**
```
VITE v6.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

---

## 3. Start ngrok Tunnels (BOTH Backend + Frontend)

### Terminal 3: ngrok (Two Tunnels)

**Option A: Using config file (Recommended)**
```bash
cd C:\projects\finalthreecon\suggestion
ngrok start --all --config=ngrok.yml
```

**Option B: Using batch script**
```bash
cd C:\projects\finalthreecon\suggestion
start-ngrok.bat
```

**You'll see output like:**
```
ngrok

Session Status                online
Account                       your-email@example.com
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040

Forwarding (backend)          https://aaaa-1111.ngrok-free.app -> http://localhost:3000
Forwarding (frontend)         https://bbbb-2222.ngrok-free.app -> http://localhost:5173

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

---

## 4. Configure Frontend to Use Backend ngrok URL

**CRITICAL STEP:** Update the frontend environment variable to point to the backend ngrok URL.

1. Open `C:\projects\finalthreecon\suggestion\frontend\.env`
2. Update `VITE_API_URL` with your **backend** ngrok URL (the one forwarding to port 3000):

```env
VITE_API_URL=https://aaaa-1111.ngrok-free.app/api
```

3. **Restart the frontend** (Terminal 2):
```bash
Ctrl+C
npm run dev
```

---

## 5. Share Access URL

**Share the FRONTEND ngrok URL** (the one forwarding to port 5173) with remote users:
```
https://bbbb-2222.ngrok-free.app
```

### Important Notes for Users:

⚠️ **First-time visitors will see an ngrok warning page:**
- This is normal for free tier
- Click "Visit Site" button to continue
- This appears once per tunnel, per session

📱 **What users will experience:**
1. Visit frontend URL → Click "Visit Site" on ngrok warning
2. See your login page
3. Login (JWT auth)
4. Backend API calls go through backend ngrok tunnel automatically

---

## 6. Monitoring & Troubleshooting

### ngrok Web Interface

While ngrok is running, visit: **http://127.0.0.1:4040**

This shows:
- All HTTP requests to BOTH tunnels
- Request/response details
- Replay requests
- Connection statistics

### Common Issues

#### ❌ "Network Error" or "Failed to fetch"
**Cause:** Frontend environment variable not updated
**Solution:**
1. Check `frontend/.env` has `VITE_API_URL=https://your-backend-ngrok-url.ngrok-free.app/api`
2. Restart frontend dev server
3. Hard refresh browser (Ctrl+Shift+R)

#### ❌ "CORS error in browser console"
**Cause:** Backend doesn't recognize ngrok origin
**Solution:** Backend is already configured to accept `*.ngrok-free.app` origins. If you see this:
1. Verify backend is running
2. Check backend logs for CORS errors
3. Verify both tunnels are active in ngrok

#### ❌ "Blocked request. This host is not allowed"
**Cause:** Vite host checking
**Solution:** Already fixed in `vite.config.ts` with `allowedHosts: true`. If you still see it:
1. Verify you restarted frontend after config changes
2. Check `vite.config.ts` has `allowedHosts: true`

#### ❌ ngrok tunnels closed unexpectedly
**Solution:**
1. Free tier has connection limits (40 connections/min)
2. ngrok may disconnect after inactivity
3. Restart ngrok and **update `frontend/.env`** with new backend URL
4. Restart frontend

---

## 7. Laptop Hosting Checklist

Since you're hosting on your laptop:

- [ ] **Disable sleep mode** (Windows Settings → System → Power & sleep → Never)
- [ ] **Connect power adapter** (don't run on battery)
- [ ] **Stable internet connection** (prefer ethernet over WiFi)
- [ ] **Both terminals (backend + frontend) running**
- [ ] **ngrok terminal showing 2 active tunnels**
- [ ] **Frontend .env updated** with backend ngrok URL

---

## 8. Complete Startup Checklist

Every time you want to expose your dev environment:

- [ ] 1. Update `ngrok.yml` with your authtoken (one-time)
- [ ] 2. Terminal 1: Start backend (`npm run dev`)
- [ ] 3. Terminal 2: Start frontend (`npm run dev`)
- [ ] 4. Terminal 3: Start ngrok (`ngrok start --all --config=ngrok.yml`)
- [ ] 5. Copy **backend** ngrok URL from Terminal 3 output (port 3000)
- [ ] 6. Update `frontend/.env` with `VITE_API_URL=https://backend-url.ngrok-free.app/api`
- [ ] 7. Restart frontend (Ctrl+C, then `npm run dev`)
- [ ] 8. Copy **frontend** ngrok URL from Terminal 3 output (port 5173)
- [ ] 9. Share frontend URL with users

---

## 9. Stopping the Tunnels

When you're done sharing:

```bash
# In ngrok terminal (Terminal 3)
Ctrl+C
```

Both tunnels shut down immediately. Remote users can no longer access.

---

## 10. ngrok Free Tier Limitations

### Current Setup (Free):
- ✅ HTTPS tunnels
- ✅ No bandwidth limits
- ✅ Web inspection interface
- ⚠️ **Random URLs each restart** (need to update `.env` every time)
- ⚠️ Interstitial warning page for visitors
- ⚠️ 40 connections/minute rate limit per tunnel
- ⚠️ 2 tunnels shown in web interface (max on free tier is 1 at a time)

**Note:** Free tier officially supports 1 tunnel at a time. If you need simultaneous tunnels reliably, consider upgrading to ngrok Pro ($8/mo).

### Upgrade to Pro ($8/mo) Benefits:
- ✅ **Static domains** (e.g., `https://finalthreecon-api.ngrok.app`, `https://finalthreecon.ngrok.app`)
- ✅ No interstitial page
- ✅ Multiple simultaneous tunnels
- ✅ Custom branded domains
- ✅ IP restrictions

---

## 11. Security Notes

### Already Protected:
- ✅ JWT authentication (users must login)
- ✅ HTTPS encryption (ngrok provides SSL)
- ✅ Role-based access (admin features require admin role)
- ✅ Helmet.js security headers
- ✅ CORS restricts to ngrok domains

### Best Practices:
- 🔒 Only share URLs with trusted staff
- 🔒 Change JWT secret if compromised
- 🔒 Monitor ngrok web interface (http://127.0.0.1:4040) for suspicious activity
- 🔒 Kill ngrok tunnels when not needed (`Ctrl+C`)
- 🔒 URLs change on restart - old URLs stop working automatically

---

## 12. Quick Reference

| Component | Local URL | ngrok URL | Notes |
|-----------|-----------|-----------|-------|
| Backend API | http://localhost:3000 | https://[random].ngrok-free.app | Update in frontend `.env` |
| Frontend App | http://localhost:5173 | https://[random].ngrok-free.app | Share with users |
| ngrok Inspector | http://127.0.0.1:4040 | - | Local monitoring only |

---

## 13. Example Session

```bash
# Terminal 1
cd C:\projects\finalthreecon\suggestion\backend
npm run dev
# Backend starts on port 3000

# Terminal 2
cd C:\projects\finalthreecon\suggestion\frontend
npm run dev
# Frontend starts on port 5173

# Terminal 3
cd C:\projects\finalthreecon\suggestion
ngrok start --all --config=ngrok.yml
# Output shows:
# Backend:  https://1a2b-3c4d.ngrok-free.app -> localhost:3000
# Frontend: https://5e6f-7g8h.ngrok-free.app -> localhost:5173

# Update frontend/.env:
VITE_API_URL=https://1a2b-3c4d.ngrok-free.app/api

# Restart frontend (Terminal 2):
Ctrl+C
npm run dev

# Share with users:
Frontend URL: https://5e6f-7g8h.ngrok-free.app
```

---

## 14. Current Access Information

**Last Started:** _[Update when you start ngrok]_

**Current URLs:**
- Backend:  `https://____-____.ngrok-free.app` (port 3000)
- Frontend: `https://____-____.ngrok-free.app` (port 5173)

**Active Staff Users:**
- User 1: staff1@example.com
- User 2: staff2@example.com

---

## Need Help?

1. Check ngrok inspector: http://127.0.0.1:4040
2. Check backend logs in `backend/logs/app.log`
3. Check frontend console (F12 in browser)
4. Verify all 3 terminals are running
5. Verify frontend `.env` has correct backend ngrok URL
6. Verify both tunnels are active in ngrok output

---

## Stopping Everything

```bash
# Terminal 1 (Backend): Ctrl+C
# Terminal 2 (Frontend): Ctrl+C
# Terminal 3 (ngrok): Ctrl+C
```

All remote access stops immediately. Old URLs become invalid.
