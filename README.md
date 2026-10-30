# SendMyBeat

**Tags, descriptions and YouTube uploads for beat producers.**

SendMyBeat finds the tags that rank, writes the description, renders your beat and cover art into a video and uploads it to your channel. There's a web app at [sendmybeat.com](https://www.sendmybeat.com) and an iOS / Android app built with Expo.

<p align="center">
  <img src="docs/screenshots/landing.png" width="240" alt="Landing screen: Tags, descriptions and uploads for every beat" />
  <img src="docs/screenshots/workflow.png" width="240" alt="Workflow tab with tag generation and description templates" />
  <img src="docs/screenshots/tag-ranking.png" width="240" alt="Tag ranking: every tag numbered with its score, demand and competition" />
</p>

## The mobile app

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/upload-studio.png" width="230" alt="Upload Studio" /><br /><sub><b>Upload Studio</b><br />Beat + artwork → video → YouTube</sub></td>
    <td align="center"><img src="docs/screenshots/analytics.png" width="230" alt="Analytics" /><br /><sub><b>Analytics</b><br />Views per upload and what to fix</sub></td>
    <td align="center"><img src="docs/screenshots/spotlight.png" width="230" alt="Spotlight" /><br /><sub><b>Spotlight</b><br />Producer of the week, trending, leaderboard</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/producer-profile.png" width="230" alt="Producer profile" /><br /><sub><b>Producer profile</b><br />Likes, follows, top beat, uploads</sub></td>
    <td align="center"><img src="docs/screenshots/themes.png" width="230" alt="Appearance: theme gallery" /><br /><sub><b>Themes</b><br />Eleven looks with a cross-fade</sub></td>
    <td align="center"><img src="docs/screenshots/spotlight-ocean.png" width="230" alt="Spotlight in the Ocean theme" /><br /><sub><b>Ocean theme</b><br />Every screen follows the theme</sub></td>
  </tr>
</table>

<sub>Screenshots are the app's web build with sample data (`docs/screenshots/`). On a phone the tab bar is the system one.</sub>

### What it does
- **Workflow:** type an artist or vibe and get a ranked tag set that always fits YouTube's 500-character limit. Review and edit tags as chips or in the **Ranking** view, pick or write a description, then hand it all to Upload Studio. Tag runs keep going in the background and pick back up after the app restarts.
- **Upload Studio:** choose a beat and artwork, hear it under the live preview, set the format (16:9, 1:1, 9:16, 4:5), frame rate, background and privacy, and upload. The render log shows each stage. From Workflow you can swipe the job away to cancel it, or retry a failed one.
- **Analytics:** views across your latest uploads, a channel health score, and AI reviews of weak titles with better ones to try. Plus and Max plans.
- **Spotlight:** the producer community. Producer of the week, trending producers, a leaderboard, likes and follows, and profiles with a top beat (YouTube link or uploaded audio) and latest uploads. Pull down to refresh. Edit your own profile, picture and banner in place.
- **Themes:** Console (the default: true black, hairlines, white buttons) plus Light, Dark, Noir, Paper, Mint, Midnight, Ocean, Sunset, Rose and Match system. Changing theme cross-fades the whole app.

## How tag ranking works
Every generated tag gets a 0–100 score, and the final set is picked to make the best use of YouTube's 500 characters.

1. **Candidates.** Tags come from YouTube search results for the artist, Spotify and SoundCloud track names, your own custom tags and AI suggestions grounded in that context.
2. **Demand.** Each tag is checked against YouTube's search autocomplete, typed one word at a time. A phrase YouTube suggests after only a word or two, near the top, is searched a lot; one it never suggests isn't. This uses no API quota and is cached for a week.
3. **Competition.** The most promising tags get a YouTube search: how many results there are, and how many top videos already use the exact phrase in their title.
4. **Relevance.** How closely the tag matches your search and artist, plus what you kept or removed in earlier runs.
5. **Track record.** Seven and 28 days after a video is uploaded through SendMyBeat, its views are compared with that producer's usual upload. Tags behind at least 3 tracked videos gain or lose up to 10 points ("Proven on 5 uploads").
6. **Picking the set.** The best tag goes in first. Then each next tag is chosen by score, by how much it adds over what's already picked, and by the mix: core artist tags, crossovers, sound/mood tags and long-tail phrases. It stops when 500 characters are used, counted the way YouTube counts them.

A generation spends **at most 300 YouTube API units** (`TAG_QUOTA_BUDGET_UNITS`). Artist lookups and search results are cached and shared across users, so repeat artists cost nothing.

## Plans
| | Free | Plus | Max |
|---|---|---|---|
| Price | $0 | $5 / month | $12 / month |
| AI generations | 2 a day | 150 a month | 500 a month |
| YouTube uploads | 1 a day | 60 a month | 150 a month |
| Channel analytics | – | ✓ | ✓ |
| Watermark-free uploads | – | ✓ | ✓ |

Limits are env-configurable (see [Cost / plan tuning](#cost--plan-tuning)). Plus and Max also have monthly LLM cost guardrails. Upload credits are only spent once a video is live on YouTube. Billing runs through Stripe on the website.

## What it uses

| Part | Built with |
|---|---|
| **Mobile app** (`mobile/`) | Expo SDK 58, React Native, React 19 with the React Compiler, TypeScript, Expo Router (native tabs), Reanimated, react-native-svg, expo-audio, expo-image, expo-file-system, expo-secure-store, react-native-view-shot (theme cross-fade) |
| **Mobile type** | Satoshi and Clash Grotesk from [Fontshare](https://www.fontshare.com) (downloaded on `npm install`, not committed: their license doesn't allow publishing them in a public repo), Geist Mono for numbers |
| **Web app** (`frontend/`) | React, CRACO, Tailwind CSS |
| **API** (`backend/`) | FastAPI on Python, MongoDB via Motor, in-process background job worker |
| **YouTube** | YouTube Data API v3 (search, uploads, channel stats), Google OAuth, YouTube search autocomplete for tag demand |
| **AI** | Grok (xAI) by default, OpenAI as fallback for some vision/model calls |
| **Media** | FFmpeg / ffprobe for rendering beat + artwork into video |
| **Payments** | Stripe subscriptions |
| **Hosting** | Docker Compose on AWS Lightsail behind nginx (see [DEPLOY.md](DEPLOY.md)) |

## Repo structure
```text
SendMyBeat2/
  backend/
    server.py                 # FastAPI routes (still the main surface)
    models_spotlight.py
    storage.py                # media storage abstraction (local today)
    services/
      background_jobs.py      # persisted async jobs
      spotlight_service.py    # Spotlight cache and refresh loop
      tag_metrics.py          # tag scoring, labels and set selection
      tag_autocomplete.py     # search demand from YouTube autocomplete
      tag_outcomes.py         # upload results → tag track records
  frontend/                   # web app (React)
  mobile/                     # iOS / Android app (Expo)
    src/app/                  # screens (Expo Router)
    src/components/           # shared UI, editors, producer cards, theme transition
    src/state/                # draft, Upload Studio, likes/follows
    src/theme.ts              # palettes, useColors(), makeStyles()
    scripts/fetch-fonts.mjs   # downloads the Fontshare fonts on install
  docs/screenshots/
  docker-compose.yml
  DEPLOY.md
  GROWTH_PLAN.md
```

## Local development

### Backend
```bash
cd backend
python -m venv .venv
.venv/Scripts/activate        # macOS / Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

Tests:
```bash
pip install pytest pytest-asyncio
python -m pytest -q --continue-on-collection-errors
```

### Web app
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

### Mobile app
Needs **Node 22.13 or newer**.
```bash
cd mobile
npm install          # also downloads the Satoshi / Clash Grotesk fonts
npx expo start -c    # scan the QR code with your phone
```
It talks to `https://api.sendmybeat.com` by default; set `EXPO_PUBLIC_API_URL` to use a local backend. Before a PR: `npx tsc --noEmit` and `npx eslint src`.

Colors always come from the active theme. Use `useColors()` for colors, and `makeStyles((C) => ({ ... }))` instead of `StyleSheet.create`, so screens re-render when the theme changes.

## Docker Compose
Services: `mongo`, `backend`, `frontend`.
```bash
docker compose up -d --build backend frontend   # rebuild
docker compose ps                                # status
docker compose logs -f backend                   # backend logs
```
Deploying a backend change on the server: `git pull`, then `docker compose up -d --build backend`.

## Important backend env vars

### Core
```env
MONGO_INITDB_ROOT_USERNAME=sendmybeat_root
MONGO_INITDB_ROOT_PASSWORD=replace_with_strong_mongo_password
MONGO_URL=mongodb://sendmybeat_root:replace_with_strong_mongo_password@mongo:27017/production?authSource=admin
DB_NAME=production

JWT_SECRET_KEY=your_secret
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=1440
SESSION_SECRET_KEY=your_secret
APP_ENCRYPTION_KEY=base64_fernet_key
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
Legacy fallback still supported: `STRIPE_PRICE_ID=...`

### Tag ranking
```env
TAG_QUOTA_BUDGET_UNITS=300              # YouTube API units per generation
TAG_AUTOCOMPLETE_MAX_FETCHES=80         # uncached autocomplete lookups per generation
TAG_AUTOCOMPLETE_CACHE_TTL_SECONDS=604800
TAG_METRICS_CACHE_TTL_SECONDS=1209600   # YouTube search results per tag
TAG_MIN_PUBLISH_SCORE=58
TAG_OUTCOME_MIN_VIDEOS=3                # tracked uploads before a tag's record counts
TAG_OUTCOME_MAX_BOOST=10
TAG_OUTCOME_COLLECT_INTERVAL_SECONDS=21600
```

### Spotlight
```env
SPOTLIGHT_REFRESH_INTERVAL_SECONDS=1800  # metrics refresh (uses YouTube quota)
SPOTLIGHT_PAYLOAD_MAX_AGE_SECONDS=60     # list rebuilt from the database (no quota)
```

### Ops / launch hardening
```env
OPS_DEFAULT_MAX_QUEUED_JOBS=60
OPS_DEFAULT_MAX_PROCESSING_JOBS=8
OPS_DEFAULT_MAX_USER_ACTIVE_JOBS=4
OPS_HEALTH_WARN_QUEUE_DEPTH=25
OPS_HEALTH_FAIL_QUEUE_DEPTH=80
OPS_FAIL_OPEN_HEALTH_SECONDS=120

JOB_WATCHDOG_INTERVAL_SECONDS=60
JOB_STAGE_TIMEOUT_SECONDS=300
JOB_FFMPEG_STAGE_TIMEOUT_SECONDS=300
JOB_YOUTUBE_STAGE_TIMEOUT_SECONDS=900
JOB_HEARTBEAT_INTERVAL_SECONDS=15
```

### YouTube render tuning
```env
YOUTUBE_RENDER_TIMEOUT_SECONDS=240
YOUTUBE_RENDER_PRESET=veryfast
YOUTUBE_RENDER_CRF=26
YOUTUBE_RENDER_MAX_HEIGHT=720
YOUTUBE_RENDER_FPS=30
YOUTUBE_MAX_AUDIO_DURATION_SECONDS=900
PRIORITIZE_YOUTUBE_UPLOAD_JOBS=true
```

### Cost / plan tuning
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

## Health and ops endpoints
- `/api/health`, `/api/health/ready`: health monitoring
- `/api/admin/ops`: queue visibility, overload mode, heavy-feature toggles
- `/api/admin/costs`: rough cost tracking
- `/api/jobs/{id}/cancel`: users stop their own jobs (queued ones cancel at once with the credit returned; running ones stop at the next checkpoint)

Admin clear-job sets `cancel_requested=true` and marks the job terminal immediately. If FFmpeg is already running, the worker stops at the next cancellation checkpoint, before the YouTube upload continues.

## Known operational risks
- Background jobs still run in-process with the API.
- Media is still stored locally.
- `backend/server.py` is still a large monolith despite the extracted services.
- YouTube search autocomplete is an undocumented endpoint. If it's blocked, tag demand falls back to neutral and generation keeps working.

## Troubleshooting
- **A heavy feature seems slow:** check queue depth in admin ops, the job's `stage` and `last_heartbeat_at`, overload mode / feature toggles, and backend logs.
- **YouTube upload jobs fail while rendering:**
  - Confirm FFmpeg and ffprobe exist in the backend container.
  - Confirm the audio is shorter than `YOUTUBE_MAX_AUDIO_DURATION_SECONDS`.
  - The default render profile is fast 720p/30 FPS. Use `YOUTUBE_RENDER_FPS=60` only when you accept slower renders.
  - Run `python tools/check_youtube_render_sample.py` to verify 16:9 artwork renders as 1280×720 without borders.
- **Tag demand looks flat:** from the server, run `curl "https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=future%20type"`. It should return JSON. Generation logs show per-run autocomplete stats under `tag_metrics.autocomplete`.
- **Mobile app won't bundle:** run `npm install` in `mobile/` (new dependencies, fonts), use Node 22.13+, and restart with `npx expo start -c`.
- **Thumbnail check fails:** confirm the visual is a still image and the configured vision model exists.
- **Billing looks wrong:**
  - Verify the Stripe subscription status and the user's `stripe_customer_id` / `stripe_subscription_id`.
  - `/api/subscription/sync` forces a refresh.

## Security notes
- Don't expose MongoDB (`27017`) publicly; only publish `80/443` behind a reverse proxy.
- Don't use `CORS_ORIGINS=*` in production.
- `APP_ENCRYPTION_KEY` is required in production so stored YouTube tokens are encrypted at rest.
- User links are checked before opening (https only, known social sites), and likes, follows, tag generation and job cancels are rate limited.

## Related docs
- [DEPLOY.md](DEPLOY.md): self-hosting on AWS Lightsail
- [GROWTH_PLAN.md](GROWTH_PLAN.md)
