// A stand-in for the backend, for looking at the website without MongoDB, Stripe or YouTube.
// It answers /api/* with sample data and passes everything else to the React dev server, so the
// page and its API share one origin (the page's Content-Security-Policy only allows that).
//
//   npm start                      (the React dev server, port 3000)
//   node dev/mock-api.js           (this, port 3100) then open http://localhost:3100
//
// MOCK_PLAN=free|trial|plus|max picks the plan (default max, i.e. Pro). Any username and
// password signs in. Nothing here is real data and nothing is saved.

const http = require("http");

const PORT = Number(process.env.MOCK_PORT || 3100);
const APP = { host: "localhost", port: Number(process.env.APP_PORT || 3000) };
const PLAN = process.env.MOCK_PLAN || "max";

const svg = (label, a, b) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="640" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" font-family="sans-serif" font-size="200" font-weight="700" fill="rgba(255,255,255,0.35)">${label}</text></svg>`,
  )}`;
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

const sub = {
  free: { is_subscribed: false, plan: "free", daily_credits_remaining: 0, daily_credits_total: 0, upload_credits_remaining: 0, upload_credits_total: 0, trial_available: true, pro_access: false },
  trial: { is_subscribed: true, plan: "plus", trial: true, trial_ends_at: daysAgo(-2), daily_credits_remaining: 2, daily_credits_total: 3, upload_credits_remaining: 3, upload_credits_total: 3, pro_access: false },
  plus: { is_subscribed: true, plan: "plus", daily_credits_remaining: 38, daily_credits_total: 50, upload_credits_remaining: 41, upload_credits_total: 50, pro_access: false },
  max: { is_subscribed: true, plan: "max", daily_credits_remaining: 83, daily_credits_total: 100, upload_credits_remaining: 91, upload_credits_total: 100, pro_access: true },
}[PLAN];
Object.assign(sub, { founding_member: false, founding_spots_left: 37, plan_version: 2 });

// MOCK_ADMIN=1 signs you in as an admin (admin links and /admin pages).
const user = { id: "u-you", username: "jamesbeats", is_admin: process.env.MOCK_ADMIN === "1" };
const opsControls = {
  overload_mode_enabled: false,
  global_disable_new_heavy_jobs: false,
  disabled_features: { youtube_upload: false, channel_analytics: false, thumbnail_check: false, tag_generation: false, tag_join: false, beat_analysis: true, beat_fix: false },
};
const adminUsers = Array.from({ length: 31 }, (_, i) => ({
  id: `0b5f${(1000 + i).toString(16)}-7c2e-4f1a-9d3b-${(0xa1b2c3d4e5f0 + i * 7919).toString(16)}`,
  username: ["deadat18", "prodtrustt", "sync440", "LKS", "BillyElePe", "dznbeats", "veli", "xanbeats", "luka", "milsi"][i % 10] + (i >= 10 ? String(i) : ""),
  email: i % 3 === 0 ? null : `producer${i}@example.com`,
  created_at: daysAgo(i * 3 + 1),
  auth_provider: i % 2 ? "google" : "password",
  deleted: i === 4,
  status: i === 4 ? "disabled" : "active",
}));

const scored = (tag, score, demand, competition, record) => ({
  tag,
  score,
  reason: `People search “${tag}” often and few uploads target it exactly, so a new video can rank.`,
  signals: { demand, competition, ...(record ? { record, record_videos: 14 } : null) },
});
const TAGS = [
  scored("capoxxo type beat", 87, "high", "low", "proven"),
  scored("dreamcache type beat", 79, "high", "medium"),
  scored("capoxxo x oaf1 type beat", 79, "high", "low"),
  scored("4u type beat", 74, "high", "medium"),
  scored("d1v type beat", 74, "high", "medium"),
  scored("capoxxo pvscale", 73, "high", "low"),
  scored("hinoni type beat", 63, "medium", "low"),
  scored("forever type beat", 63, "medium", "high"),
  scored("prod 50g", 62, "medium", "medium"),
  scored("pluggnb type beat 2026", 58, "medium", "high"),
  scored("free capoxxo type beat", 55, "low", "medium"),
  scored("underground type beat", 41, "low", "high", "weak"),
];
const run = (id, query, days, extra = []) => ({ id, query, tags: [...TAGS.map((t) => t.tag), ...extra], scored_tags: TAGS, created_at: daysAgo(days) });
let history = [run("r1", "capoxxo", 0), run("r2", "ken carson x destroy lonely", 1, ["opium type beat", "rage beat"]), run("r3", "dark trap", 4), run("r4", "pluggnb", 9)];
let descriptions = [{ id: "d1", title: "My store links", content: "🛒 Buy / Lease: https://example.com/store\n\n🎵 BPM: 150\n🎹 Key: F# minor\n\n📩 Contact: beats@example.com\n\nFree for non-profit use only.\nCredit: Prod. by jamesbeats" }];

const producer = (id, username, score, extra = {}) => ({
  user_id: id,
  username,
  avatar_url: svg(username.charAt(0).toUpperCase(), "#1f2f27", "#0b1510"),
  banner_url: null,
  bio: "",
  tags: [],
  spotlight_score: score,
  spotlight_tier: score > 300 ? "Gold" : score > 150 ? "Silver" : "Bronze",
  current_streak: Math.round(score / 30),
  app_likes: Math.round(score / 4),
  followers: Math.round(score * 1.7),
  verification_status: "none",
  social_links: {},
  ...extra,
});
const me = producer("u-you", "jamesbeats", 188, { bio: "Dark trap and pluggnb. Uploading every other day.", tags: ["dark trap", "pluggnb"], social_links: { youtube: "https://youtube.com/@jamesbeats" } });
const producers = [
  producer("u1", "mariobeats", 412, {
    bio: "Dark trap and plugg. 14-day streak.",
    tags: ["dark trap", "plugg", "drill"],
    banner_url: svg("", "#14281e", "#0a1510"),
    verification_status: "approved",
    top_beat: { kind: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "night drive – dark trap type beat", thumbnail: svg("▶", "#2a1a4a", "#0a0614") },
  }),
  producer("u2", "prodkenji", 386, { verification_status: "approved" }),
  producer("u3", "lowend.audio", 351),
  producer("u4", "nightshift", 290),
  producer("u5", "kairo beats", 244),
  producer("u6", "808 mafia jr", 201),
  me,
  producer("u7", "wavy.wav", 160),
  producer("u8", "prod. solace", 133),
  producer("u9", "tapedeck", 98),
  producer("u10", "ghostnote", 71),
  producer("u11", "sub.zero", 52),
];

const PROS = [
  { id: "internetmoney", name: "Internet Money", group: "Collective", colors: ["#3b1d6e", "#0d0620"], subs: 3_400_000, match: 62, sound: ["melodic trap", "guitar loops", "collabs"], why: "They treated type beats like a label: one channel, many producers, an upload every single day." },
  { id: "cashmoneyap", name: "CashMoneyAP", group: "Solo producer", colors: ["#6e3b1d", "#200d06"], subs: 2_100_000, match: 48, sound: ["Pop Smoke", "trap", "rising-artist titles"], why: "He named beats after artists just before they blew up, so his videos were waiting when the searches arrived." },
  { id: "mjnichols", name: "MjNichols", group: "Solo producer", colors: ["#1d4a6e", "#061320"], subs: 1_300_000, match: 71, sound: ["type beats", "beat store", "artist titles"], why: "Clean titles, one formula, and a beat store linked in every description." },
  { id: "menace", name: "Menace", group: "Solo producer", colors: ["#6e1d3b", "#200612"], subs: 900_000, match: null, sound: ["dark trap", "UK producer", "artist-named titles"], why: "One beat sold for $30 became “Panda”. He kept uploading the same dark style until an artist found it." },
];
const proCard = (p) => ({
  id: p.id,
  name: p.name,
  group: p.group,
  tagline: p.why,
  sound: p.sound,
  photo: svg(p.name.charAt(0), p.colors[0], p.colors[1]),
  photo_source: "youtube",
  subscribers: p.subs,
  channel_url: "https://www.youtube.com/",
  channel_title: p.name,
  why: p.why,
  match: PLAN === "free" ? null : p.match,
  verified: true,
  claimed_by: null,
});
// Without Pro the server sends a preview only (backend/server.py _pro_teaser).
const proTeaser = (p) => ({
  ...proCard(p),
  subscribers: null,
  total_views: null,
  channel_url: null,
  channel_title: null,
  match: null,
  story: [],
  notable: [],
  moves: [],
  sources: [],
  latest_uploads: [],
  patterns: null,
  breakdown: null,
  locked: true,
});
const needsPro = (what) => [402, { detail: { code: "needs_pro", message: `${what} is part of Pro.` } }];
const patterns = (uploads) => ({
  uploads,
  lead_artist_pct: 92,
  quotes_pct: 78,
  year_pct: 12,
  pair_pct: 41,
  per_week: 6.5,
  weekdays: [9, 8, 7, 9, 10, 4, 3],
  heatmap: [
    [0, 2, 5, 2],
    [0, 1, 6, 1],
    [1, 2, 3, 1],
    [0, 3, 5, 1],
    [0, 2, 7, 1],
    [0, 1, 2, 1],
    [0, 0, 2, 1],
  ],
});
const proDetail = (p) => {
  const views = Array.from({ length: 50 }, (_, i) => Math.round(18000 + 14000 * Math.abs(Math.sin(i * 1.7)) + (i === 7 ? 900000 : i === 23 ? 520000 : i === 38 ? 340000 : 0)));
  const locked = !sub.pro_access;
  return {
    ...proCard(p),
    story: [
      "Started uploading type beats with no following and a simple, repeatable title.",
      "Kept the same formula for months, so every upload added to the same searches.",
      "A handful of uploads broke out and pulled the whole channel up with them.",
      `Today ${p.name} is one of the most searched producer names on YouTube.`,
    ],
    notable: [
      { year: "2016", text: "First upload to pass a million views" },
      { year: "2019", text: "Placement on a platinum single" },
      { year: "2023", text: "Passed a billion channel views" },
    ],
    moves: [
      { id: "m1", title: "Artist first", body: "Lead every title with the artist’s name.", steps: ["Name the artist first in your next 5 titles"], uploads: 5 },
      { id: "m2", title: "Upload rhythm", body: "Post on a fixed rhythm, at least 5 a week.", steps: ["Upload 10 beats in 14 days"], uploads: 10 },
      { id: "m3", title: "Pair two artists", body: "Use “X x Y type beat” to catch two searches.", steps: ["Pair two artists in 3 titles"], uploads: 3 },
      { id: "m4", title: "Store link up top", body: "Put the purchase link in the first line of the description.", steps: ["Move your store link to line one of your description"], uploads: 0 },
    ],
    sources: [
      { label: "YouTube channel", url: "https://www.youtube.com/" },
      { label: "Interview", url: "https://www.youtube.com/" },
    ],
    total_views: 1_250_000_000,
    latest_uploads: [1, 2, 3, 4, 5].map((n) => ({ video_id: `vid${n}`, title: `(FREE) Travis Scott x Don Toliver Type Beat – "Orbit ${n}"`, thumbnail: svg("▶", p.colors[0], p.colors[1]), views: 40000 * n, published_at: daysAgo(n) })),
    patterns: locked ? null : patterns(50),
    breakdown: locked
      ? null
      : {
          views,
          breakout_index: [7, 23, 38],
          top_share_pct: 61,
          median_views: 24000,
          breakouts: [
            { video_id: "b1", title: '(FREE) Juice WRLD Type Beat – "Lucid"', views: 918000, times_median: 38 },
            { video_id: "b2", title: 'Travis Scott x Drake Type Beat – "Sicko"', views: 538000, times_median: 22 },
            { video_id: "b3", title: 'Lil Tecca Type Beat – "Ransom"', views: 357000, times_median: 15 },
          ],
        },
    locked,
  };
};
const analysis = (p) => ({
  them: patterns(50),
  you: { ...patterns(14), lead_artist_pct: 57, quotes_pct: 21, pair_pct: 7, per_week: 2.5 },
  match: p.match,
  traits: [
    { id: "per_week", label: "Uploads a week", you: 2.5, them: 6.5, you_pos: 0.3, them_pos: 0.82 },
    { id: "lead_artist", label: "Artist named first", you: 57, them: 92, you_pos: 0.57, them_pos: 0.92 },
    { id: "pair", label: "Two artists paired", you: 7, them: 41, you_pos: 0.07, them_pos: 0.41 },
    { id: "quotes", label: "Beat name in quotes", you: 21, them: 78, you_pos: 0.21, them_pos: 0.78 },
  ],
  gaps: [
    { trait: "per_week", label: "Uploads a week", move_id: "m2", move: "Upload rhythm" },
    { trait: "quotes", label: "Beat name in quotes", move_id: null, move: null },
    { trait: "pair", label: "Two artists paired", move_id: "m3", move: "Pair two artists" },
  ],
});
let plan =
  PLAN === "max"
    ? {
        pro_id: "mjnichols",
        pro_name: "MjNichols",
        created_at: daysAgo(3),
        steps: [
          { id: "s1", kind: "title_formula", text: "Name the artist first in your next 5 titles", move: "Artist first", done: false, target: 5, count: 2 },
          { id: "s2", kind: "uploads", text: "Upload 10 beats in 14 days", move: "Upload rhythm", done: false, target: 10, count: 4 },
          { id: "s3", kind: "manual", text: "Move your store link to line one of your description", move: "Store link up top", done: true },
        ],
      }
    : null;
const planView = () => (plan ? { ...plan, done: plan.steps.filter((s) => s.done).length, total: plan.steps.length, next: plan.steps.find((s) => !s.done) ?? null } : null);

const analytics = {
  channel_name: "jamesbeats",
  subscriber_count: 4820,
  total_views: 1_240_000,
  total_videos: 212,
  recent_videos: [
    ["capoxxo type beat – “dreams”", 2140],
    ["night drive", 610],
    ["ken carson x destroy lonely type beat – “vamp”", 1890],
    ["beat 47 (prod me)", 380],
    ["dark trap type beat – “no sleep”", 1320],
    ["pluggnb type beat – “clouds”", 1480],
    ["yeat type beat – “tonka”", 1710],
    ["untitled 3", 290],
    ["opium type beat – “ritual”", 1250],
    ["free trap beat 2026", 930],
  ].map(([title, views], i) => ({ id: `v${i}`, title, views, likes: Math.round(views / 20), comments: Math.round(views / 200), published_at: daysAgo(i * 2 + 1) })),
  insights: {
    channel_health_score: "72/100 – Growing, held back by a few weak titles",
    title_patterns: { winning: "Artist name first, then “type beat”, then the beat name in quotes.", losing: "Titles with no artist: “night drive”, “untitled 3”, “beat 47”." },
    video_reviews: [
      { index: 1, verdict: "strong", reason: "The artist is first and the beat has a name, so it matches what people type.", fix: "", better_title: "" },
      { index: 2, verdict: "weak", reason: "Nobody searches “night drive”. There is no artist or genre to find it by.", fix: "Add the artist and “type beat”.", better_title: "Future Type Beat – “Night Drive” | Dark Trap Instrumental 2026" },
      { index: 4, verdict: "weak", reason: "A number and your own name tell YouTube nothing about the sound.", fix: "Lead with the artist you made it for.", better_title: "Playboi Carti Type Beat – “Beat 47”" },
      { index: 8, verdict: "weak", reason: "“untitled” gets no searches.", fix: "Name the artist and the mood.", better_title: "Destroy Lonely Type Beat – “Untitled” | Opium Instrumental" },
    ],
    what_works: ["Your artist-first titles get 2.4× the views of the rest.", "Uploading every other day keeps you in recommendations."],
    critical_issues: ["3 of your last 10 titles have no artist name.", "Your descriptions put the store link below the fold."],
    immediate_actions: ["Rename “night drive”, “beat 47” and “untitled 3” with the titles suggested here.", "Use two artists in every title this week.", "Move your store link to the first line of the description."],
    growth_roadmap: "Reach 2,000 average views by naming an artist in every title. Track weekly views per artist tag.",
    seo_optimization: ["Front-load two artist names.", "Always include your producer tag."],
    content_strategy: ["Make one collab-style beat a week.", "Upload three times a week."],
    discoverability_tactics: ["Target the tags your best upload ranks for.", "Test “free” in the title."],
    internet_money_lessons: ["Artist names beat mood words."],
  },
};

const jobs = new Map();
const startJob = (seconds, result) => {
  const id = `job${jobs.size + 1}`;
  jobs.set(id, { id, started: Date.now(), seconds, result });
  return { job: { id, status: "queued" } };
};

const routes = [
  ["POST", /^\/auth\/(login|register)$/, () => ({ access_token: "mock-token", token_type: "bearer", user })],
  ["GET", /^\/auth\/me$/, () => user],
  ["GET", /^\/admin\/ops$/, () => (user.is_admin ? {
    health: { status: "ok", ready: true, jobs: { queued: 3, processing: 1, failed_last_hour: 2 }, controls: opsControls },
    recent_jobs: [
      { id: "job-91a", type: "youtube_upload", status: "processing", stage: "uploading", progress: 64, last_heartbeat_at: daysAgo(0.0004), updated_at: daysAgo(0.0004) },
      { id: "job-91b", type: "tags", status: "succeeded", stage: "done", progress: 100, last_heartbeat_at: daysAgo(0.01), updated_at: daysAgo(0.01) },
      { id: "job-91c", type: "channel_analytics", status: "queued", stage: null, progress: 0, last_heartbeat_at: null, updated_at: daysAgo(0.002) },
      { id: "job-91d", type: "plan_assist", status: "failed", stage: "drafting", progress: 55, last_heartbeat_at: daysAgo(0.04), updated_at: daysAgo(0.04) },
      { id: "job-91e", type: "beat_analysis", status: "succeeded", stage: "done", progress: 100, last_heartbeat_at: daysAgo(0.2), updated_at: daysAgo(0.2) },
    ],
    jobs_by_type: [],
  } : [403, { detail: "Admin access only" }])],
  ["PUT", /^\/admin\/ops\/controls$/, (m, body) => {
    if (!user.is_admin) return [403, { detail: "Admin access only" }];
    if (typeof body.overload_mode_enabled === "boolean") opsControls.overload_mode_enabled = body.overload_mode_enabled;
    if (typeof body.global_disable_new_heavy_jobs === "boolean") opsControls.global_disable_new_heavy_jobs = body.global_disable_new_heavy_jobs;
    Object.assign(opsControls.disabled_features, body.disabled_features || {});
    return { controls: opsControls };
  }],
  ["POST", /^\/admin\/ops\/clear-jobs$/, () => ({ cleared: 1 })],
  ["POST", /^\/admin\/ops\/clear-job\/([^/]+)$/, () => ({ cleared: 1 })],
  ["GET", /^\/admin\/costs$/, () => (user.is_admin ? {
    total_estimated_cost: 14.83, hosting_cost: 12, llm_cost: 2.8312,
    details: [
      { _id: "tag_generation", count: 412, total_tokens_in: 820431, total_tokens_out: 120554, total_cost: 1.8463 },
      { _id: "channel_analytics", count: 37, total_tokens_in: 210992, total_tokens_out: 40211, total_cost: 0.8241 },
      { _id: "plan_assist", count: 22, total_tokens_in: 40210, total_tokens_out: 8022, total_cost: 0.1608 },
    ],
  } : [403, { detail: "Admin access only" }])],
  ["GET", /^\/admin\/users$/, (m, body, query) => {
    if (!user.is_admin) return [403, { detail: "Admin access only" }];
    const q = String(query?.get?.("search") || "").toLowerCase();
    const page = Number(query?.get?.("page") || 1);
    const list = adminUsers.filter((u) => !q || [u.username, u.email, u.id].some((v) => String(v || "").toLowerCase().includes(q)));
    return { users: list.slice((page - 1) * 25, page * 25), pagination: { page, page_size: 25, total: list.length, total_pages: Math.max(1, Math.ceil(list.length / 25)) } };
  }],
  ["POST", /^\/admin\/users\/([^/]+)\/disable$/, (m) => {
    const u = adminUsers.find((x) => x.id === m[1]);
    if (u) Object.assign(u, { deleted: true, status: "disabled" });
    return { ok: true };
  }],
  ["DELETE", /^\/admin\/users\/([^/]+)$/, (m) => {
    const i = adminUsers.findIndex((x) => x.id === m[1]);
    if (i >= 0) adminUsers.splice(i, 1);
    return { ok: true };
  }],
  ["GET", /^\/subscription\/status$/, () => sub],
  ["POST", /^\/subscription\/sync$/, () => sub],
  [
    "GET",
    /^\/subscription\/config$/,
    () => ({
      plans: [
        { id: "plus", name: "Plus", price_cents: 500, interval: "month", generations: 50, uploads: 50 },
        { id: "max", name: "Pro", price_cents: 1000, interval: "month", generations: 100, uploads: 100 },
      ],
      trial: { days: 3, daily_generations: 3, daily_uploads: 3 },
      founding: { price_cents: 4000, interval: "year", limit: 50 },
      tip_amounts_cents: [300, 500, 1000],
    }),
  ],
  ["POST", /^\/subscription\/(create-checkout|portal)$/, () => [409, { detail: "Payments are switched off in the mock server." }]],
  ["POST", /^\/support\/tip$/, () => [409, { detail: "Payments are switched off in the mock server." }]],
  ["GET", /^\/tags\/history$/, () => history],
  ["POST", /^\/tags\/history$/, (m, body) => {
    const saved = run(`r${Date.now()}`, body.query, 0);
    saved.tags = body.tags;
    history = [saved, ...history];
    return saved;
  }],
  ["PATCH", /^\/tags\/history\/([^/]+)$/, (m, body) => {
    const item = history.find((r) => r.id === m[1]);
    if (!item) return [404, { detail: "Not found" }];
    item.tags = body.tags;
    return item;
  }],
  ["DELETE", /^\/tags\/history\/([^/]+)$/, (m) => {
    history = history.filter((r) => r.id !== m[1]);
    return { ok: true };
  }],
  ["POST", /^\/tags\/generate$/, (m, body) => {
    const made = run(`r${Date.now()}`, body.query, 0);
    history = [made, ...history];
    return startJob(12, made);
  }],
  ["POST", /^\/tags\/join-ai$/, () => startJob(6, { tags: TAGS.map((t) => t.tag), scored_tags: TAGS })],
  ["GET", /^\/jobs\/([^/]+)$/, (m) => {
    const job = jobs.get(m[1]);
    if (!job) return [404, { detail: "Not found" }];
    const t = (Date.now() - job.started) / 1000 / job.seconds;
    return { job: t >= 1 ? { id: job.id, status: "succeeded", progress: 100, result: job.result } : { id: job.id, status: "processing", progress: Math.round(t * 100) } };
  }],
  ["POST", /^\/jobs\/([^/]+)\/cancel$/, (m) => ({ cancelled: jobs.delete(m[1]) })],
  ["GET", /^\/descriptions$/, () => descriptions],
  ["POST", /^\/descriptions$/, (m, body) => {
    const d = { id: `d${Date.now()}`, ...body };
    descriptions = [d, ...descriptions];
    return d;
  }],
  ["PUT", /^\/descriptions\/([^/]+)$/, (m, body) => {
    const d = descriptions.find((x) => x.id === m[1]);
    return d ? Object.assign(d, body) : [404, { detail: "Not found" }];
  }],
  ["DELETE", /^\/descriptions\/([^/]+)$/, (m) => {
    descriptions = descriptions.filter((x) => x.id !== m[1]);
    return { ok: true };
  }],
  ["GET", /^\/youtube\/status$/, () => ({ connected: true, email: "jamesbeats@example.com", name: "jamesbeats", profile_picture: svg("J", "#7a1f1f", "#200606") })],
  ["POST", /^\/youtube\/analytics$/, () => startJob(8, analytics)],
  ["POST", /^\/upload\/(audio|image)$/, (m) => ({ file_id: `mock-${m[1]}`, media_kind: m[1] })],
  ["POST", /^\/youtube\/upload$/, () => ({ job: { id: "upload1", status: "queued", progress: 0 } })],
  ["GET", /^\/youtube\/upload-jobs\/([^/]+)$/, () => ({ job: { id: "upload1", status: "processing", progress: 42, message: "Rendering video…" } })],
  ["GET", /^\/producers\/spotlight$/, () => ({ featured_producers: [producers[0]], trending_producers: producers.slice(0, 8), new_producers: producers.slice(8), all_producers: producers })],
  ["GET", /^\/producers\/me$/, () => me],
  ["PUT", /^\/producers\/me$/, (m, body) => Object.assign(me, body)],
  ["GET", /^\/producers\/me\/social$/, () => ({ liked: ["u1"], following: ["u2"] })],
  ["POST", /^\/producers\/([^/]+)\/like$/, () => ({ liked: true, app_likes: 104 })],
  ["DELETE", /^\/producers\/([^/]+)\/like$/, () => ({ liked: false, app_likes: 103 })],
  ["POST", /^\/producers\/([^/]+)\/follow$/, () => ({ following: true, followers: 701 })],
  ["DELETE", /^\/producers\/([^/]+)\/follow$/, () => ({ following: false, followers: 700 })],
  ["GET", /^\/producers\/([^/]+)\/stats$/, (m) => {
    const p = producers.find((x) => x.user_id === m[1]);
    if (!p) return [404, { detail: "Producer not found" }];
    return {
      profile: p,
      stats: { current_streak: p.current_streak, longest_streak: p.current_streak + 6 },
      channel: { connected: true, performance: { subscriber_count: p.followers * 12, total_views: p.followers * 900 } },
      channel_top_beats: [1, 2, 3, 4].map((n) => ({ title: `${p.username} type beat – “vol. ${n}”`, url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", views: 1200 * (5 - n), published_at: daysAgo(n * 3), thumbnail: svg("▶", "#1b2a3a", "#06090f") })),
    };
  }],
  ["GET", /^\/pros$/, () => (sub.pro_access ? { pros: PROS.map(proCard) } : { pros: PROS.map(proTeaser), locked: true })],
  ["GET", /^\/pros\/plan$/, () => (sub.pro_access ? { plan: planView() } : { plan: null, locked: true })],
  ["DELETE", /^\/pros\/plan$/, () => {
    plan = null;
    return { plan: null };
  }],
  ["PATCH", /^\/pros\/plan\/steps\/([^/]+)$/, (m, body) => {
    if (!sub.pro_access) return needsPro("Your style plan");
    const step = plan?.steps.find((s) => s.id === m[1]);
    if (step) step.done = !!body.done;
    return { plan: planView() };
  }],
  ["GET", /^\/pros\/([^/]+)\/analyze$/, (m) => (sub.pro_access ? analysis(PROS.find((p) => p.id === m[1]) ?? PROS[0]) : needsPro("Comparing your uploads"))],
  ["POST", /^\/pros\/([^/]+)\/plan$/, (m, body) => {
    if (!sub.pro_access) return needsPro("Copying a pro's style");
    const p = PROS.find((x) => x.id === m[1]) ?? PROS[0];
    const moves = proDetail(p).moves.filter((mv) => body.moves.includes(mv.id));
    plan = { pro_id: p.id, pro_name: p.name, created_at: new Date().toISOString(), steps: moves.map((mv, i) => ({ id: `s${i}`, kind: mv.uploads ? "uploads" : "manual", text: mv.steps[0], move: mv.title, done: false, ...(mv.uploads ? { target: mv.uploads, count: 0 } : null) })) };
    return { plan: planView() };
  }],
  ["GET", /^\/pros\/([^/]+)$/, (m) => {
    const p = PROS.find((x) => x.id === m[1]);
    if (!p) return [404, { detail: "Not found" }];
    return sub.pro_access ? proDetail(p) : proTeaser(p);
  }],
  ["GET", /^\/feedback\/mine$/, () => ({ items: [{ id: "f1", kind: "idea", message: "Let me schedule uploads for later in the week.", status: "planned", created_at: daysAgo(5) }] })],
  ["POST", /^\/feedback$/, () => ({ ok: true, id: "f2" })],
  ["POST", /^\/producers\/verification\/apply$/, () => Object.assign(me, { verification_status: "pending" })],
];

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (!url.pathname.startsWith("/api/")) {
      // Everything else is the React dev server's.
      const proxy = http.request({ ...APP, path: req.url, method: req.method, headers: { ...req.headers, host: `${APP.host}:${APP.port}` } }, (upstream) => {
        res.writeHead(upstream.statusCode, upstream.headers);
        upstream.pipe(res);
      });
      proxy.on("error", () => {
        res.writeHead(502, { "Content-Type": "text/plain" });
        res.end(`The React dev server is not running on port ${APP.port}. Start it with: npm start`);
      });
      req.pipe(proxy);
      return;
    }
    const path = url.pathname.slice(4);
    const route = routes.find(([method, pattern]) => method === req.method && pattern.test(path));
    const body = await readBody(req);
    let status = 200;
    let payload = route ? route[2](path.match(route[1]), body, url.searchParams) : [404, { detail: `The mock server has no ${req.method} ${path}` }];
    if (Array.isArray(payload) && typeof payload[0] === "number") [status, payload] = payload;
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  })
  .listen(PORT, () => console.log(`Mock SendMyBeat API on http://localhost:${PORT} (plan: ${PLAN})`));
