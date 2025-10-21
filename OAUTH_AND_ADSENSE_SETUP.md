# OAuth & AdSense Setup Guide for SendMyBeat

## 🔐 Google OAuth Setup (YouTube Integration)

### Step 1: Add Redirect URI to Google Cloud Console

1. **Go to Google Cloud Console**:
   - URL: https://console.cloud.google.com/apis/credentials
   - Make sure you're logged into the Google account that owns the project

2. **Select Your Project**:
   - Project Name: "sendmybeat"
   - Project ID: `135258136885`

3. **Navigate to Credentials**:
   - Click on "Credentials" in the left sidebar
   - Find your OAuth 2.0 Client ID (should start with `135258136885-...`)

4. **Edit OAuth Client**:
   - Click on your OAuth 2.0 Client ID name
   - Scroll to "Authorized redirect URIs" section

5. **Add Redirect URI**:
   - Click "+ ADD URI"
   - Enter exactly: `https://www.sendmybeat.com/youtube-callback`
   - Click "SAVE" at the bottom

6. **Verify**:
   - Your redirect URI should now appear in the list
   - It may take a few minutes to propagate

### Current OAuth Configuration

```
✅ Client ID: 135258136885-4so5b7bbjln64960dk0b36jl46johnir.apps.googleusercontent.com
✅ Client Secret: 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
✅ Frontend URL: https://www.sendmybeat.com
✅ Redirect URI: https://www.sendmybeat.com/youtube-callback
```

### Troubleshooting OAuth Errors

**Error: "redirect_uri_mismatch"**
- The redirect URI in Google Console doesn't match exactly
- Make sure there are NO trailing slashes
- Check for http vs https
- Verify the domain matches exactly

**Error: "access_denied"**
- User declined the authorization
- Try reconnecting YouTube from dashboard

---

## 💰 Google AdSense Setup (Advertisement System)

### Overview

SendMyBeat includes an ad system that shows ads ONLY to free users. Pro subscribers never see ads.

### Step 1: Create Google AdSense Account

1. **Go to AdSense**:
   - URL: https://www.google.com/adsense
   - Sign in with your Google account

2. **Apply for AdSense**:
   - Fill out the application form
   - Add your website: `www.sendmybeat.com`
   - Wait for approval (can take 1-3 days)

3. **Get Your Publisher ID**:
   - Once approved, go to "Account" → "Settings"
   - Find your Publisher ID (format: `ca-pub-XXXXXXXXXXXXXXXX`)

### Step 2: Configure AdSense in SendMyBeat

1. **Update Frontend .env**:
   ```bash
   cd /app/frontend
   nano .env
   ```

2. **Add AdSense Client ID**:
   ```env
   REACT_APP_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
   ```
   Replace `XXXXXXXXXXXXXXXX` with your actual AdSense Publisher ID

3. **Restart Frontend**:
   ```bash
   sudo supervisorctl restart frontend
   ```

### Step 3: Create Ad Units (Optional)

1. **Go to AdSense Dashboard**:
   - Click "Ads" → "By site"
   
2. **Create Display Ad Unit**:
   - Name: "SendMyBeat Dashboard Banner"
   - Type: Display ads
   - Ad format: Responsive
   
3. **Get Ad Slot ID**:
   - After creating, you'll see an ad slot ID (e.g., `1234567890`)
   - You can customize the AdBanner component to use specific ad slots

### Current Ad Implementation

**Where Ads Appear**:
- ✅ Dashboard page (below subscription banner)
- ✅ Only for free users (NOT pro subscribers)
- ✅ Responsive banner format

**Ad Component Location**:
- File: `/app/frontend/src/components/AdBanner.js`
- Props:
  - `isSubscribed`: Hide ads for pro users
  - `adSlot`: Your AdSense ad slot ID
  - `format`: Ad format (auto, rectangle, etc.)

**Placeholder Mode**:
- Currently shows "Advertisement Space" placeholder
- Once you add your AdSense ID, real ads will appear
- In development, always shows placeholder

### Step 4: Verify Ads Are Working

1. **Build for Production**:
   ```bash
   cd /app/frontend
   yarn build
   ```

2. **Check Browser Console**:
   - Open DevTools (F12)
   - Look for AdSense errors
   - Verify ads are loading

3. **Test with Free Account**:
   - Login as free user
   - Navigate to dashboard
   - Ad should appear below subscription banner

4. **Test with Pro Account**:
   - Subscribe to pro plan
   - Verify NO ads appear

---

## 📋 Checklist

### OAuth Setup
- [ ] Added redirect URI in Google Cloud Console
- [ ] Verified redirect URI is exactly: `https://www.sendmybeat.com/youtube-callback`
- [ ] Tested YouTube connection from dashboard
- [ ] Successfully uploaded a test video

### AdSense Setup
- [ ] Applied for Google AdSense
- [ ] Received AdSense approval
- [ ] Got Publisher ID (ca-pub-...)
- [ ] Added to frontend/.env as `REACT_APP_ADSENSE_CLIENT_ID`
- [ ] Restarted frontend
- [ ] Verified ads show for free users
- [ ] Verified ads DON'T show for pro users

---

## 🎯 Current Free Tier Limits

**Updated to 3 credits per day (from 2)**:
- ✅ 3 AI Tag Generations per day
- ✅ 3 YouTube Uploads per day
- ✅ 3 AI Description Generations per day
- ✅ Resets daily at midnight UTC

**Pro Tier**:
- ✅ Unlimited everything
- ✅ No advertisements
- ✅ Priority support

---

## 🆘 Support

If you encounter issues:

1. **Check Backend Logs**:
   ```bash
   tail -f /var/log/supervisor/backend.err.log
   ```

2. **Check Frontend Logs**:
   ```bash
   tail -f /var/log/supervisor/frontend.err.log
   ```

3. **Restart Services**:
   ```bash
   sudo supervisorctl restart all
   ```

4. **Contact Support**:
   - If OAuth issues persist, check Google Cloud Console audit logs
   - For AdSense issues, check AdSense dashboard for policy violations
