# 🚀 Quick Start - Get Your API Keys in 10 Minutes

This guide will walk you through getting all the credentials you need.

## ✅ Step 1: Generate Secret Keys (2 minutes)

### Run the key generator:
```bash
python3 /app/scripts/generate_secrets.py
```

This will output something like:
```
JWT_SECRET_KEY=gcuqOiiLDbEWFVF6ftihkLKQ__Qf...
SESSION_SECRET_KEY=3c8rKlfO580P3drHSup79a3xGT...
```

**Save these** - you'll need them in Step 4.

---

## ✅ Step 2: Get Google OAuth Credentials (5 minutes)

### A. Create Google Cloud Project

1. **Visit:** https://console.cloud.google.com/
2. **Sign in** with your Google account
3. Click **"New Project"** (top left, near project dropdown)
   - Name: `SendMyBeat`
   - Click **"Create"**

### B. Enable YouTube API

1. In the left sidebar, go to: **"APIs & Services"** → **"Library"**
2. Search for: **"YouTube Data API v3"**
3. Click on it, then click **"ENABLE"**

### C. Configure OAuth Consent Screen

1. Go to: **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** (unless you have Google Workspace)
3. Click **"CREATE"**

4. Fill in the form:
   ```
   App name: SendMyBeat
   User support email: [your email]
   Developer contact: [your email]
   ```
   
5. Click **"SAVE AND CONTINUE"**

6. On "Scopes" page:
   - Click **"ADD OR REMOVE SCOPES"**
   - Scroll down and manually add:
     - `https://www.googleapis.com/auth/youtube.upload`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Click **"UPDATE"**
   - Click **"SAVE AND CONTINUE"**

7. On "Test users" page:
   - Click **"ADD USERS"**
   - Add your Gmail address
   - Click **"ADD"**
   - Click **"SAVE AND CONTINUE"**

### D. Create OAuth Credentials

1. Go to: **"APIs & Services"** → **"Credentials"**
2. Click **"+ CREATE CREDENTIALS"** (top)
3. Select **"OAuth 2.0 Client ID"**

4. Configure:
   ```
   Application type: Web application
   Name: SendMyBeat Web Client
   ```

5. **Authorized JavaScript origins:**
   Click "+ ADD URI" and enter:
   ```
   https://musicai-11.preview.emergentagent.com
   ```

6. **Authorized redirect URIs:**
   Click "+ ADD URI" and enter:
   ```
   https://musicai-11.preview.emergentagent.com/youtube-callback
   ```

7. Click **"CREATE"**

8. **COPY YOUR CREDENTIALS:**
   A popup will show:
   - **Client ID**: `123456789-abc...xyz.apps.googleusercontent.com`
   - **Client secret**: `GOCSPX-abc123xyz789`
   
   **⚠️ Save these somewhere safe!**

---

## ✅ Step 3: Update Environment Variables (1 minute)

Edit `/app/backend/.env` and replace these values:

```bash
# JWT Configuration (from Step 1)
JWT_SECRET_KEY=YOUR_GENERATED_JWT_SECRET_HERE
SESSION_SECRET_KEY=YOUR_GENERATED_SESSION_SECRET_HERE

# Google OAuth (from Step 2)
GOOGLE_CLIENT_ID=YOUR_ACTUAL_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_ACTUAL_CLIENT_SECRET_HERE
```

### Complete .env file should look like:
```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="sendmybeat_db"
CORS_ORIGINS="*"
EMERGENT_LLM_KEY=sk-emergent-29c03267211D9D1D5C

JWT_SECRET_KEY=gcuqOiiLDbEWFVF6ftihkLKQ__QfnlEYNmPUv8c2aJLduRs6_6L1BXlo6VI9Ab1YF-2JlfAN4tBJzR4ssyh9EA
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080

SESSION_SECRET_KEY=3c8rKlfO580P3drHSup79a3xGTtQtYiNzjCyUA98kp3F-Kpfuinp2g4TX6Au-gVTZvbJxk3x8Z_1pUMQUWgO1w

GOOGLE_CLIENT_ID=123456789-abcdefghijk.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz789def

FRONTEND_URL=https://musicai-11.preview.emergentagent.com
```

---

## ✅ Step 4: Restart Backend (30 seconds)

```bash
sudo supervisorctl restart backend
```

Wait a few seconds, then check if it's running:
```bash
tail -f /var/log/supervisor/backend.err.log
```

You should see:
```
INFO:     Application startup complete.
```

Press `Ctrl+C` to exit the log viewer.

---

## ✅ Step 5: Test It! (1 minute)

1. **Go to your app:**
   https://musicai-11.preview.emergentagent.com

2. **Register/Login** to your account

3. **Go to "Upload to YouTube" tab**

4. **Click "Connect YouTube Account"**
   - You'll be redirected to Google
   - Sign in and authorize the app
   - You'll be redirected back
   - Should show: "YouTube Connected ✓"

5. **Test Upload:**
   - Upload an audio file (MP3/WAV)
   - Upload a thumbnail image (JPG/PNG)
   - Enter video title
   - Select a description template
   - Click "Upload to YouTube"

---

## 🎉 You're All Set!

Your app now has:
- ✅ Secure JWT authentication
- ✅ Google OAuth integration
- ✅ YouTube upload capability
- ✅ Automatic token refresh (works for days/weeks)

---

## 🔧 Troubleshooting

### Error: "redirect_uri_mismatch"
**Problem:** Google redirect URI doesn't match

**Fix:** Go to Google Cloud Console → Credentials → Edit your OAuth client
Make sure it has EXACTLY:
```
https://musicai-11.preview.emergentagent.com/youtube-callback
```

### Error: "invalid_client"
**Problem:** Client ID or Secret is wrong

**Fix:** Double-check you copied the correct values from Google Console to .env

### Error: "Access blocked"
**Problem:** YouTube API not enabled or app not in test mode

**Fix:**
1. Make sure YouTube Data API v3 is enabled
2. Add your Gmail to "Test users" in OAuth consent screen

### YouTube button says "Not Connected"
**Problem:** OAuth credentials not configured

**Fix:** Make sure you updated .env with real Google credentials (not placeholder values)

---

## 📚 Additional Resources

- **Full Security Guide:** `/app/SECURITY_SETUP_GUIDE.md`
- **YouTube Setup Details:** `/app/YOUTUBE_SETUP.md`
- **Generate New Keys:** `python3 /app/scripts/generate_secrets.py`

---

## 🔐 Security Reminders

- ✅ Never commit .env files to git
- ✅ Never share your Client Secret publicly
- ✅ Use different credentials for dev/staging/production
- ✅ Rotate keys every 6-12 months
- ✅ If compromised, revoke and regenerate immediately

---

## Need Help?

If something isn't working:
1. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
2. Check Google Cloud Console for configuration
3. Verify .env file has no typos
4. Make sure backend restarted after .env changes
