# SendMyBeat

SendMyBeat is a web app for music producers to generate YouTube tags and descriptions, analyze beats, and upload beats to YouTube with a consistent, arcade-style UI. The goal is to help producers publish faster while keeping metadata clean and SEO-friendly.

## Features
- AI tag generation (focused, non-spammy tags)
- Beat analyzer (strengths/weaknesses + suggestions)
- Description templates (create, refine, generate, save)
- YouTube upload (audio + image → video)
- Thumbnail checker (AI feedback on CTR/clarity)
- Matrix/arcade themed UI with light/dark support
- AdSense ad slots for free users

## Tech Stack
- Frontend: React + CRACO + Tailwind CSS
- Backend: FastAPI
- Database: MongoDB
- Media: FFmpeg
- Auth: JWT + Google OAuth
- AI: OpenAI + Grok (x.ai)

## Project Structure
```
SendMyBeat2/
  backend/                # FastAPI app
  frontend/               # React app
  README.md
```

## Local Development

### Backend
1) Create a virtual env and install deps:
```
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
```

2) Create `backend/.env` (not committed) and set required values.

3) Start the server:
```
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
1) Install deps:
```
cd frontend
npm install --legacy-peer-deps
```

2) Create `frontend/.env` (not committed).

3) Start dev server:
```
npm start
```

## Environment Variables

### Backend (`backend/.env`)
```
MONGO_URL=your_mongo_url
DB_NAME=sendmybeat_db

JWT_SECRET_KEY=your_secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080
SESSION_SECRET_KEY=your_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

YOUTUBE_API_KEY=your_youtube_api_key

LLM_PROVIDER=openai|grok
OPENAI_API_KEY=your_openai_key
GROK_API_KEY=your_grok_key
GROK_BASE_URL=https://api.x.ai/v1
GROK_MODEL=grok-4-1-fast-reasoning
```

### Frontend (`frontend/.env`)
```
REACT_APP_API_BASE_URL=https://api.sendmybeat.com
REACT_APP_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXX
```

## Deployment Notes
- Frontend: Vercel (set `REACT_APP_*` env vars in Vercel).
- Backend: systemd service on a Linux instance.
- AdSense:
  - Script tag in `frontend/public/index.html`
  - `ads.txt` in `frontend/public/ads.txt`

## Scripts
Frontend:
- `npm start`
- `npm run build`

Backend:
- `uvicorn server:app --reload`

## Troubleshooting
- If ads are not showing: verify site approval in AdSense and ensure `https://your-domain/ads.txt` is reachable.
- If tag generation fails: check LLM API keys and provider settings.
- If YouTube search fails: verify `YOUTUBE_API_KEY` validity.
