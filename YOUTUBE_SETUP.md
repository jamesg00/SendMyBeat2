# YouTube Upload Feature - Setup Instructions

## Overview
SendMyBeat now includes direct YouTube upload functionality! Users can upload their beats (audio + thumbnail) directly to YouTube with AI-generated descriptions and tags.

## Google OAuth Setup Required

To enable YouTube uploads, you need to configure Google OAuth credentials:

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"

### Step 2: Enable YouTube Data API v3

1. Go to "APIs & Services" > "Library"
2. Search for "YouTube Data API v3"
3. Click "Enable"

### Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Configure the OAuth consent screen if prompted:
   - User Type: External
   - App name: SendMyBeat
   - User support email: Your email
   - Developer contact: Your email
   - Add scopes:
     - `https://www.googleapis.com/auth/youtube.upload`
     - `https://www.googleapis.com/auth/userinfo.email`

4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: SendMyBeat Production
   
5. **Add Authorized JavaScript origins:**
   ```
   https://tagbeats.preview.emergentagent.com
   ```
   
6. **Add Authorized redirect URIs:**
   ```
   https://tagbeats.preview.emergentagent.com/youtube-callback
   ```

7. Click "Create"
8. Copy your **Client ID** and **Client Secret**

### Step 4: Update Backend Environment Variables

Add the following to `/app/backend/.env`:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
FRONTEND_URL=https://tagbeats.preview.emergentagent.com
```

### Step 5: Restart Backend

```bash
sudo supervisorctl restart backend
```

## How It Works

1. **Connect YouTube Account**: User clicks "Connect YouTube Account" and authorizes the app
2. **Upload Files**: User uploads audio file (MP3/WAV) and thumbnail image (JPG/PNG)
3. **Select Template**: Choose from saved description templates
4. **Select Tags**: Optionally select from generated tag sets
5. **Set Privacy**: Choose Public, Unlisted, or Private
6. **Upload**: Click "Upload to YouTube" to publish

## Current Implementation Status

✅ **Completed:**
- Google OAuth integration
- File upload system (audio + images)
- Template selection (descriptions & tags)
- YouTube API connection
- Privacy status selection

⚠️ **To Complete Production Upload:**
The current implementation uploads files successfully but requires one additional step:

**Install ffmpeg to combine audio + image into video:**
```bash
apt-get update && apt-get install -y ffmpeg
```

Then uncomment and implement the ffmpeg video creation logic in `/app/backend/server.py` at the `upload_to_youtube` endpoint.

Example ffmpeg command to create video from audio + image:
```bash
ffmpeg -loop 1 -i thumbnail.jpg -i audio.mp3 -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -shortest output.mp4
```

## Features Implemented

### 1. Resizable AI Refine Textarea
- AI refine textarea now uses `className="resize-y min-h-[120px] max-h-[400px]"`
- Users can resize vertically to see full AI-generated text

### 2. Save AI Refined Text as Template
- After refining text, a dialog asks "Save Refined Description?"
- Users can save the refined text directly as a template
- Automatically categorized as AI-generated

### 3. YouTube Upload Tab
- New dedicated tab for YouTube uploads
- Connection status display
- File upload for audio and images
- Template and tag selection
- Privacy status options (Public/Unlisted/Private)

### 4. File Upload System
- Audio files: MP3, WAV, M4A, FLAC, OGG
- Image files: JPG, PNG, WEBP
- Files stored in `/app/uploads/` directory
- Metadata tracked in MongoDB

## Security Notes

- OAuth tokens are stored securely in MongoDB
- File uploads are validated by extension
- User authentication required for all operations
- YouTube API access is limited to upload scope

## Testing Without Full Setup

Even without Google OAuth credentials configured, all other features work:
- Tag generation
- Description management
- AI refine and generate
- File uploads
- Template management

The YouTube upload feature will show setup instructions until credentials are configured.

## Support

For issues or questions:
1. Check Google Cloud Console for correct OAuth configuration
2. Verify redirect URIs match exactly
3. Ensure YouTube Data API v3 is enabled
4. Check backend logs: `tail -f /var/log/supervisor/backend.err.log`
