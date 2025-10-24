# YouTube Connection Debugging Guide

## Step-by-Step Testing

### Step 1: Verify Your Google OAuth Setup

Your credentials are configured:
```
GOOGLE_CLIENT_ID=135258136885-4so5b7bbjln64960dk0b36jl46johnir.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### Step 2: Check Google Cloud Console Configuration

Go to: https://console.cloud.google.com/apis/credentials

Make sure you have added **EXACTLY** these redirect URIs:
```
https://musicai-11.preview.emergentagent.com/youtube-callback
```

**Common mistakes:**
- ❌ `http://` instead of `https://`
- ❌ Missing `/youtube-callback`
- ❌ Trailing slash: `/youtube-callback/`
- ❌ Wrong domain

### Step 3: Test YouTube Connection Flow

1. **Login to your app:**
   - Go to: https://musicai-11.preview.emergentagent.com
   - Login with username/password

2. **Go to Upload to YouTube tab**

3. **Click "Connect YouTube Account"**
   - Should redirect you to Google login page
   - If you see an error about "redirect_uri_mismatch" → Check Step 2

4. **Authorize the app**
   - Sign in with Google
   - Click "Allow" to give permissions

5. **Get redirected back**
   - Should return to your dashboard
   - Should show "YouTube Connected ✓"
   - Should show your Gmail address

### Step 4: Understanding the 400 Error on Upload

The 400 error on "Upload to YouTube" button happens when:

**Cause 1: YouTube Not Connected**
- You haven't completed the OAuth flow yet
- Solution: Complete Steps 1-3 above first

**Cause 2: Missing Files**
- You haven't uploaded audio or image files yet
- Solution: Upload both files before clicking upload

**Cause 3: Missing Template**
- You haven't selected a description template
- Solution: Create and select a description template first

### Step 5: Complete Upload Flow (After Connection)

Once YouTube is connected:

1. **Upload Audio File**
   - Click "Click to upload audio"
   - Select MP3/WAV file
   - Wait for "✓ Audio uploaded!" message

2. **Upload Image File**
   - Click "Click to upload image"
   - Select JPG/PNG file
   - Wait for "✓ Image uploaded!" message

3. **Fill Upload Details**
   - Video Title: Enter your beat title
   - Select Description Template: Choose from dropdown
   - Select Tags (optional): Choose from dropdown
   - Privacy Status: Public/Unlisted/Private

4. **Click "Upload to YouTube"**
   - Should show success message
   - Note: Actual video upload requires ffmpeg installation

## Troubleshooting Specific Errors

### Error: "redirect_uri_mismatch"

**Problem:** Google redirect URI doesn't match

**Fix:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", add:
   ```
   https://musicai-11.preview.emergentagent.com/youtube-callback
   ```
4. Click "Save"
5. Wait 1-2 minutes for changes to propagate
6. Try connecting again

### Error: "Google OAuth not configured"

**Problem:** Backend can't read credentials

**Fix:**
1. Check `/app/backend/.env` has correct values
2. Restart backend: `sudo supervisorctl restart backend`
3. Try again

### Error: "400 Bad Request" on Upload

**Check these:**
- [ ] YouTube account connected? (shows green checkmark)
- [ ] Audio file uploaded? (shows filename)
- [ ] Image file uploaded? (shows filename)
- [ ] Video title filled in?
- [ ] Description template selected?

### Error: "YouTube account not connected" in backend logs

**Problem:** OAuth flow not completed

**Fix:**
1. Go to "Upload to YouTube" tab
2. Click "Connect YouTube Account"
3. Complete Google authorization
4. Verify status changes to "Connected"

## Testing Backend API Directly

Test if backend can generate OAuth URL:

```bash
# Login first
TOKEN=$(curl -s -X POST https://musicai-11.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser123","password":"password123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# Get YouTube auth URL
curl -s -H "Authorization: Bearer $TOKEN" \
  https://musicai-11.preview.emergentagent.com/api/youtube/auth-url | python3 -m json.tool
```

Should output:
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

If you see an error, check backend logs:
```bash
tail -f /var/log/supervisor/backend.err.log
```

## Current Status Check

Run this to check your setup:

```bash
echo "=== Backend Status ==="
sudo supervisorctl status backend

echo ""
echo "=== Environment Variables ==="
grep GOOGLE /app/backend/.env

echo ""
echo "=== Recent Logs ==="
tail -n 20 /var/log/supervisor/backend.out.log | grep youtube
```

## Next Steps

1. ✅ Verify Google Cloud Console redirect URI
2. ✅ Click "Connect YouTube Account" 
3. ✅ Complete Google OAuth flow
4. ✅ Upload audio + image files
5. ✅ Fill in all required fields
6. ✅ Click "Upload to YouTube"

**Still having issues?** Share:
- The exact error message you see
- Screenshot of the error
- Backend logs: `tail -n 50 /var/log/supervisor/backend.err.log`
