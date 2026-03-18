# SendMyBeat

SendMyBeat is a producer workflow app for generating metadata, finding artwork, analyzing beats and channels, and uploading beats to YouTube from one place.

The product is built around a fast publish loop:
- generate tags and descriptions
- find or import artwork
- check thumbnail quality
- render audio + artwork into video
- upload directly to YouTube

## Current Product Areas
- Upload Studio: audio upload, artwork upload/import, metadata editing, preview layout, watermark controls, YouTube upload
- AI metadata tools: tag generation, tag join, description generation, description refine
- Beat tools: beat analysis, beat fix, thumbnail check
- Artwork finder: web image/artwork search for artist and project-inspired visuals
- YouTube analytics: channel analysis with AI growth recommendations
- BeatHelper: queue-based planning and upload workflow helpers
- Producer Spotlight: public producer profiles with fallback avatars and optional Google connection
- Growth tools: `Grow in 120` challenge and streak tracking

## Recent Changes
- Background job architecture added for heavy flows:
  - YouTube upload
  - channel analytics
  - beat analysis / beat fix
  - thumbnail check
  - tag generation / tag join
  - image search
- Admin ops and launch hardening added:
  - health endpoints
  - queue visibility
  - overload mode
  - feature kill switches
  - per-feature rate limits
- Spotlight no longer requires Google connection to appear
- Upload Studio close/reopen behavior fixed
- Image search ranking and query building updated repeatedly to improve result relevance
- Subscription plans changed to capped fair-use tiers instead of unlimited Max

## Current Pricing Logic
Frontend pricing and backend limits are aligned to:

- Free:
  - 2 AI generations per day
  - 1 YouTube upload per day
- Plus:
  - $5/month
  - 150 AI generations per month
  - 60 YouTube uploads per month
- Max:
  - $12/month
  - 500 AI generations per month
  - 150 YouTube uploads per month

Backend billing notes:
- Plus and Max are both metered monthly plans
- Max is no longer unlimited
- Plus and Max both use monthly LLM cost guardrails

## Tech Stack
- Frontend: React + CRACO + Tailwind CSS
- Backend: FastAPI
- Database: MongoDB
- Media: FFmpeg
- Auth: JWT + Google OAuth
- Billing: Stripe
- AI: Grok by default, OpenAI fallback for some vision/model failures
- Infra: Docker Compose deployment supported

## Repo Structure
```text
SendMyBeat2/
  backend/
    server.py
    services/
      background_jobs.py
      spotlight_service.py
    storage.py
  frontend/
    src/
  docker-compose.yml
  README.md
  DEPLOY.md
  GROWTH_PLAN.md
```

## Architecture Notes

### Backend
`backend/server.py` is still the main route surface, but some shared systems were extracted:
- `backend/services/background_jobs.py`: persisted async job processing
- `backend/services/spotlight_service.py`: Spotlight caching / refresh helpers
- `backend/storage.py`: media storage abstraction

### Async Job Flows
These flows now queue work instead of doing everything inline in the request:
- YouTube upload
- channel analytics
- beat analysis
- beat fix
- thumbnail check
- tag generation
- tag join
- image search

Current limitation:
- the worker is still in-process with the API app
- this is safer than the old synchronous model, but not yet a separate durable worker deployment

### Storage
- media storage is abstracted
- current implementation is still local storage
- object storage is the next scaling step

## Local Development

### Backend
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

## Docker Compose
The repo includes a local/prod-style Docker Compose setup for:
- `mongo`
- `backend`
- `frontend`

Typical rebuild:
```bash
docker compose up -d --build backend frontend
```

Check status:
```bash
docker compose ps
```

Check backend logs:
```bash
docker compose logs -f backend
```

## Important Backend Env Vars

### Core
```env
MONGO_URL=mongodb://mongo:27017
DB_NAME=production

JWT_SECRET_KEY=your_secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080
SESSION_SECRET_KEY=your_secret
```

### Google / YouTube
```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
YOUTUBE_API_KEY=...
```

### AI
```env
LLM_PROVIDER=grok
LLM_MODEL=grok-2-latest

GROK_API_KEY=...
GROK_BASE_URL=https://api.x.ai/v1
GROK_MODEL=...
GROK_VISION_MODEL=...

OPENAI_API_KEY=...
OPENAI_MODEL=...
OPENAI_VISION_MODEL=...
```

### Stripe
```env
STRIPE_SECRET_KEY=...
STRIPE_PUBLISHABLE_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_ID_PLUS=...
STRIPE_PRICE_ID_MAX=...
```

Legacy fallback still supported:
```env
STRIPE_PRICE_ID=...
```

### Ops / Launch Hardening
```env
OPS_DEFAULT_MAX_QUEUED_JOBS=60
OPS_DEFAULT_MAX_PROCESSING_JOBS=8
OPS_DEFAULT_MAX_USER_ACTIVE_JOBS=4
OPS_HEALTH_WARN_QUEUE_DEPTH=25
OPS_HEALTH_FAIL_QUEUE_DEPTH=80
OPS_FAIL_OPEN_HEALTH_SECONDS=120
```

### Cost / Plan Tuning
```env
HOSTING_COST_USD=12

FREE_DAILY_AI_CREDITS=2
FREE_DAILY_UPLOAD_CREDITS=1

PLUS_MONTHLY_AI_CREDITS=150
PLUS_MONTHLY_UPLOAD_CREDITS=60
PLUS_MONTHLY_LLM_COST_CAP_USD=2.50

MAX_MONTHLY_AI_CREDITS=500
MAX_MONTHLY_UPLOAD_CREDITS=150
MAX_MONTHLY_LLM_COST_CAP_USD=7.50
```

## Health And Ops Endpoints
- `/api/health`
- `/api/health/ready`
- `/api/admin/ops`
- `/api/admin/costs`

These support:
- health monitoring
- queue visibility
- overload mode
- heavy-feature toggles
- rough cost tracking

## Known Operational Risks
- background jobs still run in-process
- media is still local-storage-backed
- Spotlight can still do expensive work on cache miss
- `backend/server.py` is still a large monolith despite recent extraction work

## Subscription / Billing Notes
- user plan state comes from Stripe + Mongo user linkage
- a manual subscription sync endpoint exists at `/api/subscription/sync`
- if a paid user appears as free, first verify the Stripe subscription is still active, then refresh billing status

## Troubleshooting
- If a heavy feature seems slow:
  - check queue depth in admin ops
  - check overload mode / feature toggles
  - check backend logs
- If image search quality regresses:
  - restart backend after image-search logic changes
  - remember image-search behavior is query-sensitive between artist mode and project mode
- If thumbnail check fails:
  - confirm the selected visual is a still image, not a video
  - confirm the configured vision model exists
- If billing looks wrong:
  - verify Stripe subscription status
  - verify `stripe_customer_id` and `stripe_subscription_id` are linked on the user record

## Related Docs
- [DEPLOY.md](/c:/Users/James/Desktop/SendMyBeat/SendMyBeat2/DEPLOY.md)
- [GROWTH_PLAN.md](/c:/Users/James/Desktop/SendMyBeat/SendMyBeat2/GROWTH_PLAN.md)
