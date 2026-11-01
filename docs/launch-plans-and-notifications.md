# Launch guide: new plans, paywall and job notifications

Three parts, in order. Part 1 puts the new plans live. Parts 2 and 3 are only for phone notifications.

---

## Part 1: Redeploy the backend (Lightsail + Docker)

**1. Merge the `pros-facts` PR into `main` on GitHub.**
(If you'd rather test it first, use `git checkout pros-facts` instead of `git pull` in step 3.)

**2. SSH into the server** (Lightsail console → your instance → "Connect using SSH"), then go to the app:

```bash
cd ~/app
```

**3. Fix the free credits in the env file.**

```bash
nano backend/.env
```

Delete these two lines (or set both to `0`). If you leave them, free accounts keep getting 2 generations and 1 upload a day:

```
FREE_DAILY_AI_CREDITS=2
FREE_DAILY_UPLOAD_CREDITS=1
```

You can leave the `PLUS_MONTHLY_*` lines (220/90). They aren't used any more.
Save with Ctrl+X, then Y, then Enter.

**4. Pull the code and rebuild only the backend.** Mongo and the website keep running.

```bash
git pull
```

```bash
docker compose up -d --build backend
```

**5. Watch it start.** Press Ctrl+C once you see Uvicorn running.

```bash
docker compose logs -f backend
```

**6. Check the Stripe webhook.** In the Stripe Dashboard, go to Developers → Webhooks and open your `api.sendmybeat.com` endpoint. Make sure it sends:

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

You don't need to create any prices. The server creates the $5, $10 and $40/year prices on the first checkout.

**7. Test it.** Open the app and pull to refresh Workflow: a $5 subscriber should show 50/50.
Then, in Stripe test mode, try the trial, an upgrade to Pro, the founding member offer and a tip.

---

## Part 2: Link the app to EAS (once)

You need a free Expo account (expo.dev). Run these in `mobile/`:

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

`init` writes a `projectId` into `app.json`. Commit that change: without it the app quietly skips notifications.

### Android: Firebase (needed for Android notifications)

1. At console.firebase.google.com, create a project and add an Android app. Use the package name you'll give EAS in Part 3 (for example `com.sendmybeat.app`).
2. Download `google-services.json` into `mobile/`.
3. In `app.json`, inside the `"android"` block, add:
   `"googleServicesFile": "./google-services.json"`
4. In Firebase, go to Project settings → Service accounts → **Generate new private key**.
5. Upload that key to EAS: run the command below, then choose Android → Google Service Account → **FCM V1** and pick the key file.

```bash
npx eas-cli@latest credentials
```

### iPhone

You need a paid Apple Developer account ($99/year). During the first iOS build, EAS asks "Generate a new Apple Push Notifications service key?". Say **yes**. There's nothing else to set up.

---

## Part 3: Make a development build

`expo-notifications` adds native code, so Expo Go can't receive these notifications. You need your own build.

Run these in `mobile/`:

```bash
npx expo install expo-dev-client
```

```bash
npx eas-cli@latest build:configure
```

Commit the new `eas.json` and the `expo-dev-client` change.

**iPhone:** register your phone first (open the link it shows on the phone), then build:

```bash
npx eas-cli@latest device:create
```

```bash
npx eas-cli@latest build --profile development --platform ios
```

**Android:**

```bash
npx eas-cli@latest build --profile development --platform android
```

The build runs on Expo's servers and takes about 10–20 minutes. When it finishes, open the link or scan the QR code on your phone to install it.

Then start the dev server and open the **new app** (not Expo Go):

```bash
npx expo start --dev-client
```

**Test notifications:** sign in, allow notifications when asked, and start a tag generation. Then leave the app. You should get "Your tags are ready", and tapping it opens Workflow.

---

## Good to know

- **Website:** it follows the new rules too, but its pricing page still shows the old plan names and prices.
- **App Store:** paying through Stripe instead of Apple's in-app purchase is only allowed in the US storefront. Decide how to handle other countries before you submit.
- **Old subscribers:** $5 subscribers keep their price and now get 50 generations / 50 uploads a month. Pro features are on the $10 plan only.
