<p align="center">
  <img src="docs/icon.png" width="128" alt="SendMyBeat icon: a mint-to-blue S with a send arrow and a drum-pad trail" />
</p>

# SendMyBeat

**Tags, descriptions and YouTube uploads for beat producers.**

SendMyBeat finds the tags that rank, writes the description, renders your beat and cover art into a video and uploads it to your channel. Then it shows you what to fix next. It runs on the web at [sendmybeat.com](https://www.sendmybeat.com) and as an iOS / Android app built with Expo, both on the same account and API.

<p align="center">
  <img src="docs/screenshots/web/landing.png" width="820" alt="sendmybeat.com: Made a beat? Get it found, with a live tag demo" />
</p>

## The website

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/web/dashboard.png" width="400" alt="Create: generate tags and pick a description" /><br /><sub><b>Create</b><br />Generate tags, pick a description, recent runs</sub></td>
    <td align="center"><img src="docs/screenshots/web/ranking.png" width="400" alt="Tag ranking on the web" /><br /><sub><b>Tag ranking</b><br />Every tag scored on demand and competition</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/web/analytics.png" width="400" alt="Channel analytics on the web" /><br /><sub><b>Analytics</b><br />Channel health, views against your average</sub></td>
    <td align="center"><img src="docs/screenshots/web/spotlight.png" width="400" alt="Producer Spotlight on the web" /><br /><sub><b>Spotlight</b><br />Featured producers, streaks and leaderboard</sub></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><img src="docs/screenshots/web/pricing.png" width="600" alt="Pricing: 3-day free trial, Plus $5, Pro $10" /><br /><sub><b>Pricing</b><br />A slider suggests the plan that fits how often you upload</sub></td>
  </tr>
</table>

## The mobile app

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/landing.png" width="200" alt="Landing screen" /><br /><sub><b>Welcome</b><br />Live tag-run demo</sub></td>
    <td align="center"><img src="docs/screenshots/workflow.png" width="200" alt="Workflow tab" /><br /><sub><b>Workflow</b><br />Tags, description, upload</sub></td>
    <td align="center"><img src="docs/screenshots/tag-ranking.png" width="200" alt="Tag ranking" /><br /><sub><b>Ranking</b><br />Score, demand, competition, track record</sub></td>
    <td align="center"><img src="docs/screenshots/upload-studio.png" width="200" alt="Upload Studio" /><br /><sub><b>Upload Studio</b><br />Beat + artwork → video → YouTube</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/analytics.png" width="200" alt="Analytics" /><br /><sub><b>Analytics</b><br />Views per upload and what to fix</sub></td>
    <td align="center"><img src="docs/screenshots/spotlight.png" width="200" alt="Spotlight" /><br /><sub><b>Spotlight</b><br />Producer of the week, trending, leaderboard</sub></td>
    <td align="center"><img src="docs/screenshots/producer-profile.png" width="200" alt="Producer profile" /><br /><sub><b>Profiles</b><br />Likes, follows, top beat, uploads</sub></td>
    <td align="center"><img src="docs/screenshots/themes.png" width="200" alt="Appearance: theme gallery" /><br /><sub><b>Themes</b><br />Eleven looks with a cross-fade</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/app-icon.png" width="200" alt="App icon picker in the Sunset theme" /><br /><sub><b>App icons</b><br />50 holiday and event icons</sub></td>
    <td align="center"><img src="docs/screenshots/spotlight-ocean.png" width="200" alt="Spotlight in the Ocean theme" /><br /><sub><b>Ocean theme</b><br />Every screen follows the theme</sub></td>
    <td colspan="2" valign="middle"><sub>Screenshots are the website and the app's web build running against sample data, not real accounts (`docs/screenshots/`). On a phone the tab bar is the system one.</sub></td>
  </tr>
</table>

## What it does
- **Tags:** type an artist or vibe and get 60 to 80 ranked tags that always fit YouTube's 500-character limit. Edit them as chips or in the **Ranking** view, join two runs into one, and see why each tag scored what it did. Runs keep going in the background and pick back up after the app restarts.
- **Descriptions and titles:** start from a template (type beat, beat sales, free for profit) or your own, and build a description from the tag run with your buy link and hashtags. Titles are scored as you type (artist first, length, top keyword, beat name).
- **Upload Studio:** choose a beat and artwork, preview it live, set the format (16:9, 1:1, 9:16, 4:5), frame rate, background and privacy, and upload. Optional: one of 21 audio visualizers (8 free, 13 Pro), a custom thumbnail, a scheduled publish time, and adding the video to the artist's playlist. The render log shows each stage, and a job can be cancelled or retried.
- **AI checks:** before an upload, score the title, tags and description against your channel and check the artwork as a thumbnail.
- **Analytics:** views across your latest uploads against your own average, a channel health score, the title patterns that win and lose, and a better title for each weak upload. Pro.
- **Pros:** how the biggest type-beat producers grew, how close your uploads are to their style, and a 14-day plan to copy their moves, with an agent that does steps for you. Pro.
- **Spotlight:** the producer community. Producer of the week, trending producers, a leaderboard driven by upload streaks, likes and follows, verified badges, and profiles with a top beat and latest uploads.
- **Themes (mobile):** Console (the default: true black, hairlines, white buttons) plus Light, Dark, Noir, Paper, Mint, Midnight, Ocean, Sunset, Rose and Match system. Changing theme cross-fades the whole app.

### Holiday app icons (mobile)
<p align="center">
  <img src="docs/screenshots/holiday-icons.png" width="660" alt="The 50 holiday and event versions of the SendMyBeat icon" />
</p>

The home screen icon changes on its own for holidays and events: Halloween, Thanksgiving, Black Friday, Christmas, Hanukkah, Diwali, Lunar New Year, Pride Month, Hip-Hop Day and more. Everyone gets these on their days. Paying users can also pick any of the 50 as their everyday icon in **Profile → App icon**, and turn the holiday switch off if they'd rather keep their pick.

- The dates live in `mobile/src/data/icon-calendar.ts`. Fixed dates and rules (the 4th Thursday of November, Easter) work every year. Holidays that move with the moon (Lunar New Year, Diwali, Hanukkah, Eid) come from tables that run to 2030.
- iOS only allows the change while the app is open and shows its own note when it happens. Android switches when you leave the app, since changing it while open can close the app on some phones.
- It needs a development or store build (`expo-alternate-app-icons`), not Expo Go. The icon art is generated into `mobile/assets/app-icons/` (iOS 1024 px, Android adaptive layers, 180 px previews) and wired up in `mobile/app.config.js`.

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
| | Free | 3-day trial | Plus | Pro |
|---|---|---|---|---|
| Price | $0 | $0, then Plus | $5 / month | $10 / month |
| AI generations | – | 3 a day | 50 a month | 100 a month |
| YouTube uploads | – | 3 a day | 50 a month | 100 a month |
| Watermark-free uploads | – | ✓ | ✓ | ✓ |
| Channel analytics, Pros, Pro visualizers | – | – | – | ✓ |
| Background jobs at once | – | 1 | 1 | Queue |
| Pick your app icon | – | ✓ | ✓ | ✓ |

Free accounts can browse, build descriptions and use Spotlight; generating and uploading need the trial or a plan. There's also a founding-member offer: a year of Pro for $40, for the first 50. People who subscribed before these plans keep their old limits. Limits are env-configurable (see [Cost / plan tuning](#cost--plan-tuning)), upload credits are only spent once a video is live on YouTube, and billing runs through Stripe on the website.

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
    src/state/                # draft, Upload Studio, likes/follows, app icon
    src/data/                 # app icon list and holiday calendar
    src/theme.ts              # palettes, useColors(), makeStyles()
    assets/app-icons/         # 50 holiday and event icons (iOS, Android layers, previews)
    app.config.js             # registers the alternate icons
    scripts/fetch-fonts.mjs   # downloads the Fontshare fonts on install
  docs/screenshots/           # mobile; web/ for the website
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

App icon switching and other native modules need a development build (`npx expo run:ios` / `npx expo run:android`, or an EAS build); in Expo Go the App icon screen shows the icons but can't change them.

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
STRIPE_PRICE_ID_PLUS_V2=...     # optional: created in Stripe on first checkout when unset
STRIPE_PRICE_ID_PRO_V2=...
STRIPE_PRICE_ID_FOUNDING=...
```
Older subscriptions still use `STRIPE_PRICE_ID_PLUS`, `STRIPE_PRICE_ID_MAX` and the legacy `STRIPE_PRICE_ID`.

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

TRIAL_DAYS=3
TRIAL_DAILY_AI_CREDITS=3
TRIAL_DAILY_UPLOAD_CREDITS=3

PLUS_V2_MONTHLY_AI_CREDITS=50
PLUS_V2_MONTHLY_UPLOAD_CREDITS=50
PRO_V2_MONTHLY_AI_CREDITS=100
PRO_V2_MONTHLY_UPLOAD_CREDITS=100
FOUNDING_MEMBER_LIMIT=50

# Older subscriptions (before plan version 2) keep these limits
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
- Don't expose MongoDB (`dbkey`) publicly; only publish `port` behind a reverse proxy.
- Don't use `CORS_ORIGINS=*` in production.
- `APP_ENCRYPTION_KEY` is required in production so stored YouTube tokens are encrypted at rest.
- User links are checked before opening (https only, known social sites), and likes, follows, tag generation and job cancels are rate limited.

## Related docs
- [DEPLOY.md](DEPLOY.md): self-hosting on AWS Lightsail
- [GROWTH_PLAN.md](GROWTH_PLAN.md)
