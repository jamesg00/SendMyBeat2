# Fix "Access blocked: emergentagent.com has not completed Google verification" Error

## Why This Happens:

Your app is in **"Testing" mode** on Google Cloud Console. Apps in testing mode can only be accessed by users you explicitly add as "Test Users".

## 🔧 Quick Fix (2 minutes):

### Step 1: Go to OAuth Consent Screen

1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Make sure you're in the correct project (SendMyBeat)

### Step 2: Add Test Users

1. Under **"Test users"** section, click **"+ ADD USERS"**
2. Enter your Gmail address (the one you're trying to connect with)
3. Click **"ADD"**
4. Click **"SAVE"**

### Step 3: Try Connecting Again

1. Go back to your app: https://tagbeats.preview.emergentagent.com
2. Go to "Upload to YouTube" tab
3. Click **"Connect YouTube Account"** again
4. This time it should work! ✅

## 📸 Visual Guide:

```
Google Cloud Console
  → APIs & Services
    → OAuth consent screen
      → Scroll down to "Test users"
        → Click "+ ADD USERS"
          → Enter: your-email@gmail.com
            → Click "ADD"
              → Click "SAVE"
```

## Alternative: Publish Your App (For Production)

If you want **anyone** to connect (not just test users), you need to publish your app:

### Option A: Stay in Testing (Recommended for now)
- ✅ Quick setup
- ✅ Works for you and up to 100 test users
- ❌ Need to manually add each user

### Option B: Publish App (For Public Use)
1. Go to OAuth consent screen
2. Click **"PUBLISH APP"** button
3. Google will review your app (can take days/weeks)
4. Once approved, anyone can connect

**For now, use Option A (add test users)**

## Common Issues:

### "I added myself but still getting error"
- Wait 1-2 minutes for changes to propagate
- Clear browser cache/cookies
- Try incognito/private window
- Make sure you're using the EXACT same email you added

### "Can't find the Test Users section"
- Make sure you selected "External" not "Internal" user type
- Scroll down on the OAuth consent screen page
- It's below the App information section

### "Want to add multiple users"
- Click "+ ADD USERS" again
- Add up to 100 test users for free
- Each email on a new line

## After Adding Yourself:

Once you're added as a test user and connect successfully, you'll see:

```
✅ YouTube Connected
   your-email@gmail.com
   [Disconnect button]
```

Then you can:
- Upload audio files
- Upload thumbnails
- Create video uploads to YouTube
- Use all the features!

## For Your Users (When App is Ready):

When you're ready to let real users connect:

1. Complete OAuth consent screen fully:
   - App name
   - Support email
   - App logo (optional but recommended)
   - Privacy policy URL (required for publishing)
   - Terms of service URL (optional)
   - Authorized domains

2. Click "PUBLISH APP"

3. Submit for Google verification (required for sensitive scopes like YouTube upload)

4. Wait for approval (1-6 weeks typically)

5. Once approved, remove "Testing" restriction

But for now, just add yourself as a test user and you're good to go! 🚀
