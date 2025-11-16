# FFmpeg Installation for Deployment

## Automatic Installation

The backend now includes automatic FFmpeg installation when needed.

### How it works:

1. **On First Upload**: When a user attempts to upload to YouTube, the backend checks for FFmpeg
2. **Auto-Install**: If not found, it automatically runs `apt-get install ffmpeg`
3. **No Downtime**: The installation happens on-demand, no manual intervention needed

### Manual Installation (Optional)

If you want to pre-install FFmpeg before deployment:

```bash
# Run the installation script
python3 /app/backend/install_ffmpeg.py
```

Or install manually:

```bash
apt-get update
apt-get install -y ffmpeg
```

### Verification

Check if FFmpeg is installed:

```bash
which ffmpeg
# Should output: /usr/bin/ffmpeg

ffmpeg -version
# Should show version info
```

### For Deployment

The app will automatically install FFmpeg on first use. However, for faster first-time experience, you can:

1. Add to your Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

2. Or add to a startup script:
```bash
#!/bin/bash
python3 /app/backend/install_ffmpeg.py
python3 -m uvicorn server:app --host 0.0.0.0 --port 8001
```

### Error Handling

If FFmpeg installation fails, users will see:
> "FFmpeg not available. Please contact support or install FFmpeg on the server."

The backend logs will show detailed installation errors for debugging.

---

**Note**: FFmpeg is required for combining audio + image into video for YouTube uploads.
