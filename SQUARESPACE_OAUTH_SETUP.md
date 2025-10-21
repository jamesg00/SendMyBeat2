# OAuth Setup for Squarespace Domain

## Your Domain Configuration

Since you're hosting on **Squarespace**, you need to determine your actual domain first.

### Step 1: Find Your Domain

1. **Log into Squarespace**
2. Go to **Settings → Domains**
3. Find your primary domain (e.g., `www.sendmybeat.com` or `sendmybeat.com`)

### Step 2: Determine Your Redirect URI

Your OAuth redirect URI will be:
```
https://YOUR-DOMAIN/youtube-callback
```

**Examples:**
- If your domain is `www.sendmybeat.com` → `https://www.sendmybeat.com/youtube-callback`
- If your domain is `sendmybeat.com` → `https://sendmybeat.com/youtube-callback`
- If you're using a custom domain like `mybeats.com` → `https://mybeats.com/youtube-callback`

### Step 3: Add Redirect URI to Google Cloud Console

1. **Go to Google Cloud Console**:
   - URL: https://console.cloud.google.com/apis/credentials
   - Sign in with your Google account

2. **Select Your Project**:
   - Project: "sendmybeat"
   - Project ID: `135258136885`

3. **Edit OAuth 2.0 Client**:
   - Click on "Credentials" in left sidebar
   - Find your OAuth 2.0 Client ID (starts with `135258136885-...`)
   - Click on the client ID name to edit

4. **Add Authorized Redirect URIs**:
   - Scroll to "Authorized redirect URIs" section
   - Click "+ ADD URI"
   - Enter your redirect URI: `https://YOUR-DOMAIN/youtube-callback`
   - Click "SAVE"

### Step 4: Update Backend .env

You need to update the `FRONTEND_URL` in your backend `.env` file to match your Squarespace domain.

**Current value in /app/backend/.env:**
```env
FRONTEND_URL=https://www.sendmybeat.com
```

**If your actual domain is different, change it to:**
```env
FRONTEND_URL=https://your-actual-domain.com
```

Then restart the backend:
```bash
sudo supervisorctl restart backend
```

---

## Example Setup

**If your Squarespace domain is:** `www.sendmybeat.com`

**Then:**
1. **Google Cloud Console** → Add redirect URI: `https://www.sendmybeat.com/youtube-callback`
2. **Backend .env** → Keep: `FRONTEND_URL=https://www.sendmybeat.com`
3. **Restart backend** → `sudo supervisorctl restart backend`

---

## Squarespace Domain Types

### Primary Domain (www)
- Most common: `www.yourdomain.com`
- Redirect URI: `https://www.yourdomain.com/youtube-callback`

### Apex Domain (no www)
- Some use: `yourdomain.com`
- Redirect URI: `https://yourdomain.com/youtube-callback`

### Custom Domain
- If you connected a custom domain: `mybeats.com`
- Redirect URI: `https://mybeats.com/youtube-callback`

### Squarespace Subdomain (temporary)
- Format: `yoursite.squarespace.com`
- Redirect URI: `https://yoursite.squarespace.com/youtube-callback`

---

## Testing OAuth After Setup

1. **Go to your Squarespace site**
2. **Navigate to Dashboard**
3. **Click "Connect YouTube"**
4. **Should redirect to Google OAuth**
5. **Accept permissions**
6. **Should redirect back to:** `https://your-domain.com/youtube-callback`
7. **Then redirect to:** `https://your-domain.com/dashboard`

---

## Common Issues

### Error: "redirect_uri_mismatch"
**Cause:** The redirect URI in Google Console doesn't match exactly

**Solution:**
- Check for `http` vs `https` (must be `https`)
- Check for `www` vs no `www` (must match exactly)
- Check for trailing slash (don't add one)
- Make sure domain spelling is exact

### Error: "invalid_request"
**Cause:** FRONTEND_URL in backend .env doesn't match your actual domain

**Solution:**
- Update `/app/backend/.env` → `FRONTEND_URL=https://your-actual-domain.com`
- Restart backend: `sudo supervisorctl restart backend`

### Error: Page not found after OAuth
**Cause:** Squarespace doesn't know about the `/youtube-callback` route

**Solution:**
- This is handled by your React app routing
- Make sure your Squarespace site points to your React app
- If using Squarespace, you might need to deploy your React app separately

---

## Important Notes for Squarespace

⚠️ **Squarespace Limitation:**
Squarespace is primarily a website builder and doesn't natively support React apps with backend APIs.

**You have a few options:**

### Option 1: Use Vercel/Netlify for Frontend
- Deploy your React frontend to Vercel/Netlify
- Keep backend on current server
- Update `REACT_APP_BACKEND_URL` to point to backend
- Use Vercel/Netlify domain for OAuth redirect

### Option 2: Custom Domain with External Hosting
- Point your Squarespace domain to your server
- Host both frontend and backend on your server
- Use that domain for OAuth

### Option 3: Use Squarespace as Landing Page Only
- Keep Squarespace for marketing/landing page
- Host actual app on subdomain (e.g., `app.sendmybeat.com`)
- Use app subdomain for OAuth

---

## What's Your Setup?

**Please tell me:**
1. What's your Squarespace domain? (e.g., `www.sendmybeat.com`)
2. Are you deploying the React app TO Squarespace, or separately?
3. Where is your backend hosted? (current server? different server?)

Once I know this, I can give you exact instructions for your setup!

---

## Quick Fix for Testing

If you just want to test OAuth quickly without Squarespace:

1. Use the preview URL: `https://bdb6cf77-6bad-4c14-9c72-62d2368cfda7.e1-us-east-azure.vercel-ai-testing.click`
2. Add to Google Console: `https://bdb6cf77-6bad-4c14-9c72-62d2368cfda7.e1-us-east-azure.vercel-ai-testing.click/youtube-callback`
3. Test OAuth flow
4. Then set up proper domain later
