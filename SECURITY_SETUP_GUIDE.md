# Complete Security & API Setup Guide

## Understanding API Keys vs OAuth Tokens

### Important Distinction:
- **YouTube doesn't use a single "API key" for uploads** - it uses OAuth 2.0
- OAuth gives you **access tokens** (short-lived, ~1 hour) and **refresh tokens** (long-lived)
- Refresh tokens let you get new access tokens automatically, even when you're offline

## How OAuth Refresh Tokens Work

### The Problem:
Access tokens expire after ~1 hour. Users would need to re-authenticate constantly.

### The Solution:
When users connect their YouTube account, Google provides:
1. **Access Token** - Used for API calls (expires in 1 hour)
2. **Refresh Token** - Used to get new access tokens (lasts indefinitely until revoked)

### How It Works:
```
User connects YouTube → Google gives refresh_token (one time)
↓
Your backend stores refresh_token in database (encrypted)
↓
When access_token expires → Backend uses refresh_token to get new access_token
↓
User can upload videos anytime, even days/weeks later
```

## Step 1: Get Google OAuth Credentials

### A. Create Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create New Project**
   - Click the project dropdown (top left)
   - Click "New Project"
   - Name: "SendMyBeat Production"
   - Click "Create"

3. **Enable YouTube Data API v3**
   - Go to: "APIs & Services" → "Library"
   - Search: "YouTube Data API v3"
   - Click on it
   - Click "Enable"

4. **Configure OAuth Consent Screen**
   - Go to: "APIs & Services" → "OAuth consent screen"
   - Select "External" (unless you have Google Workspace)
   - Click "Create"
   
   Fill in:
   ```
   App name: SendMyBeat
   User support email: your-email@gmail.com
   App logo: (optional, upload your logo)
   Application home page: https://musicai-11.preview.emergentagent.com
   Authorized domains: emergentagent.com
   Developer contact: your-email@gmail.com
   ```
   
   Click "Save and Continue"
   
5. **Add Scopes**
   - Click "Add or Remove Scopes"
   - Search and add these scopes:
     - `https://www.googleapis.com/auth/youtube.upload`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Click "Update"
   - Click "Save and Continue"

6. **Add Test Users** (for development)
   - Add your Gmail address
   - Add any other Gmail addresses that should test
   - Click "Save and Continue"

7. **Create OAuth 2.0 Credentials**
   - Go to: "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   
   Configure:
   ```
   Application type: Web application
   Name: SendMyBeat Web Client
   
   Authorized JavaScript origins:
   https://musicai-11.preview.emergentagent.com
   
   Authorized redirect URIs:
   https://musicai-11.preview.emergentagent.com/youtube-callback
   ```
   
   Click "Create"

8. **Copy Your Credentials**
   - A popup will show your:
     - **Client ID**: `123456789-abcdefg.apps.googleusercontent.com`
     - **Client Secret**: `GOCSPX-abc123def456`
   - **SAVE THESE SECURELY**

## Step 2: Generate Secret Keys

### A. JWT Secret Key
This is used to sign authentication tokens. Generate a strong random string:

**Option 1: Using Python**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -base64 64
```

Example output:
```
aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9nO1pQ3r
```

### B. Session Secret Key
Used to encrypt session cookies. Generate another random string:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

## Step 3: Add Credentials to Backend

### Update `/app/backend/.env`

```env
# MongoDB (already configured)
MONGO_URL="mongodb://localhost:27017"
DB_NAME="sendmybeat_db"
CORS_ORIGINS="*"

# AI Integration (already configured)
EMERGENT_LLM_KEY=sk-emergent-29c03267211D9D1D5C

# JWT Configuration (REPLACE THESE)
JWT_SECRET_KEY=aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9nO1pQ3r
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080

# Session Configuration (REPLACE THIS)
SESSION_SECRET_KEY=xY9zA1bC3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9n

# Google OAuth (ADD YOUR ACTUAL VALUES)
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_actual_client_secret_here

# Frontend URL (already correct for preview)
FRONTEND_URL=https://musicai-11.preview.emergentagent.com
```

### Important Security Notes:
1. **.env files are NOT committed to git** (they're in .gitignore)
2. **Never share these values publicly**
3. **Each environment (dev/staging/prod) should have different keys**

## Step 4: Implement Token Refresh Logic

The backend needs to automatically refresh expired access tokens. Here's the implementation:

### Current Implementation Status:
✅ We store refresh_token in database
✅ We have OAuth flow working
⚠️ Need to add automatic token refresh

I'll update the backend code to handle token refresh automatically.

## Step 5: Restart Backend

After updating .env:

```bash
sudo supervisorctl restart backend
```

## Security Best Practices

### ✅ DO:
- Store credentials in .env files (never in code)
- Use strong random strings for JWT_SECRET_KEY and SESSION_SECRET_KEY
- Rotate secrets periodically
- Use HTTPS in production
- Store refresh_tokens encrypted in database
- Implement rate limiting for API endpoints

### ❌ DON'T:
- Commit .env files to git
- Share credentials in screenshots or documentation
- Use simple/guessable secrets like "secret123"
- Store tokens in localStorage on frontend (we use httpOnly cookies for sessions)
- Expose API keys in frontend JavaScript

## How Users Can Upload Videos Days Later

### The Flow:
1. **User connects YouTube (one time)**
   - They authorize your app
   - Backend receives and stores refresh_token

2. **Backend stores in MongoDB:**
   ```json
   {
     "user_id": "user123",
     "google_email": "user@gmail.com",
     "access_token": "ya29.a0...",
     "refresh_token": "1//0g...",  ← This is the key!
     "token_expiry": "2025-10-16T19:00:00Z"
   }
   ```

3. **When user uploads video (days later):**
   ```python
   # Backend checks if access_token expired
   if token_expired:
       # Use refresh_token to get new access_token
       new_tokens = refresh_access_token(refresh_token)
       # Update database with new access_token
       # Proceed with upload
   ```

4. **Refresh token stays valid until:**
   - User revokes access
   - 6 months of inactivity (Google's policy)
   - User manually disconnects in your app

## Testing Your Setup

### 1. Verify OAuth Credentials
Visit: https://console.cloud.google.com/apis/credentials

### 2. Test Connection
- Login to your app
- Go to "Upload to YouTube" tab
- Click "Connect YouTube Account"
- Should redirect to Google OAuth
- After authorizing, should redirect back and show "YouTube Connected"

### 3. Test Upload
- Upload an audio file
- Upload an image
- Select description template
- Click "Upload to YouTube"

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Fix:** Make sure redirect URI in Google Console exactly matches:
```
https://musicai-11.preview.emergentagent.com/youtube-callback
```

### Error: "invalid_client"
**Fix:** Double-check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env

### Error: "Access blocked: This app's request is invalid"
**Fix:** Make sure YouTube Data API v3 is enabled in Google Cloud Console

### Tokens expire even with refresh_token
**Fix:** Check if user revoked access at https://myaccount.google.com/permissions

## Production Deployment Notes

When deploying to production:
1. **Change FRONTEND_URL** in .env to your production domain
2. **Update Google OAuth redirect URIs** to production domain
3. **Rotate all secret keys** (JWT, Session)
4. **Enable encryption** for refresh_tokens in database
5. **Implement token refresh** logic (I'll add this next)

## Need Help?

Check these resources:
- Google OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- YouTube Data API: https://developers.google.com/youtube/v3
- FastAPI Security: https://fastapi.tiangolo.com/tutorial/security/

---

**Next Step:** I'll now update the backend code to automatically handle token refresh!
