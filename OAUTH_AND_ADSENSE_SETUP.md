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

---

## 💰 Google AdSense Setup (Advertisement System)

### Step 1: Get Your AdSense Publisher ID

1. Go to: https://www.google.com/adsense
2. Apply for AdSense if you haven't
3. Once approved, get your Publisher ID (ca-pub-XXXXXXXXXXXXXXXX)

### Step 2: Add to Frontend .env

```bash
cd /app/frontend
```

Edit `.env` and add:
```env
REACT_APP_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
```

Then restart:
```bash
sudo supervisorctl restart frontend
```

### Current Features

✅ Ads show ONLY for free users
✅ Pro subscribers see NO ads
✅ Ad banner below subscription banner
✅ Placeholder shows until you add real AdSense ID

---

## 📋 What's Changed

- **Free Tier**: 2 → **3 daily credits** (AI + uploads)
- **Image Upload**: Now supports **.webm** format
- **Ads**: Integrated (needs your AdSense ID)
- **Homepage**: Added Google OAuth explanation at bottom

---

## 🎯 Next Steps

1. **Add OAuth Redirect URI** in Google Cloud Console
2. **Get AdSense ID** and add to frontend/.env
3. **Test YouTube connection** from dashboard
4. **Verify ads** appear for free users only
