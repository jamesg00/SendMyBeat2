import axios from "axios";

// Every call the signed-in app makes, one function per endpoint (the mobile app's
// src/api/endpoints.ts has the same list). The auth header is added in App.js.

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_BASE_URL;
export const API = `${(BACKEND_URL || window.location.origin).replace(/\/$/, "")}/api`;

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// FastAPI's `detail` is a string, {message, code} or a list of validation errors.
export function messageOf(error, fallback = "Something went wrong. Try again.") {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object" && detail.message) return String(detail.message);
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  if (error instanceof ApiError) return error.message;
  if (error?.response) return fallback;
  return error?.message === "Network Error" || !error?.message ? "Could not reach SendMyBeat. Check your connection." : error.message;
}

// Anything that needs a plan answers 402 with a code; the app shows the plans for it.
const PAYWALL_CODES = new Set(["needs_plan", "needs_pro", "trial_limit"]);
let onPaywall = null;
export const setPaywallHandler = (fn) => {
  onPaywall = fn;
};

async function call(method, path, body, config) {
  try {
    const res = await axios({ method, url: `${API}${path}`, data: body, ...config });
    return res.data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    const status = error?.response?.status ?? 0;
    const detail = error?.response?.data?.detail;
    const code = detail && typeof detail === "object" && typeof detail.code === "string" ? detail.code : undefined;
    const message = messageOf(error, `Request failed (${status})`);
    if (code && PAYWALL_CODES.has(code) && (status === 402 || status === 429)) onPaywall?.(code, message);
    throw new ApiError(message, status, code);
  }
}
const get = (path, config) => call("get", path, undefined, config);
const post = (path, body, config) => call("post", path, body, config);
const put = (path, body) => call("put", path, body);
const patch = (path, body) => call("patch", path, body);
const del = (path, body) => call("delete", path, body);

function readableJobError(error) {
  if (!error) return "Something went wrong. Try again.";
  if (/quota|rateLimitExceeded|HttpError 429/i.test(error)) return "YouTube's daily limit for SendMyBeat was reached. Try again tomorrow.";
  if (/HttpError 40[13]/.test(error)) return "YouTube didn't allow this request. Reconnect YouTube and try again.";
  if (/HttpError \d{3}/.test(error)) return "YouTube is not responding right now. Try again in a few minutes.";
  return error;
}

/** Follow a background job until it finishes; onProgress(progress, message) reports along the way. */
export async function pollJob(jobId, { intervalMs = 2500, maxAttempts = 180, onProgress, signal } = {}) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (signal?.aborted) throw new ApiError("Cancelled", 0, "cancelled");
    const { job } = await get(`/jobs/${jobId}`);
    if (!job) throw new ApiError("Job status response missing job data", 500);
    if (job.status === "succeeded") return job.result;
    if (job.status === "failed") throw new ApiError(readableJobError(job.error), 500);
    if (job.status === "cancelled") throw new ApiError("Cancelled", 0, "cancelled");
    onProgress?.(job.progress ?? 0, job.message);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new ApiError("This is taking longer than expected. Try again in a minute.", 408);
}

/** Endpoints that either answer directly or hand back {job: {id}} to poll. */
export async function runJob(path, body, options) {
  const res = await post(path, body);
  if (res?.job?.id) return pollJob(res.job.id, options);
  if (res?.result) return res.result;
  return res;
}

const form = (file, extra) => {
  const data = new FormData();
  data.append("file", file);
  Object.entries(extra ?? {}).forEach(([k, v]) => data.append(k, v));
  return data;
};

// ---- account and plan
export const login = (username, password) => post("/auth/login", { username, password });
export const register = (username, password) => post("/auth/register", { username, password });
export const me = () => get("/auth/me");
export const subscriptionStatus = () => get("/subscription/status");
export const syncSubscription = () => post("/subscription/sync");
export const billingConfig = () => get("/subscription/config");
export const createCheckout = (plan, trial) =>
  post("/subscription/create-checkout", {
    plan,
    trial: !!trial,
    success_url: `${window.location.origin}/dashboard?upgraded=true`,
    cancel_url: `${window.location.origin}/dashboard`,
  });
export const createTip = (amountCents) =>
  post("/support/tip", {
    amount_cents: amountCents,
    success_url: `${window.location.origin}/profile?thanks=1`,
    cancel_url: `${window.location.origin}/profile`,
  });
export const billingPortal = () => post("/subscription/portal");

// ---- tags and descriptions
export const tagHistory = () => get("/tags/history");
export const deleteTagRun = (id) => del(`/tags/history/${id}`);
export const startTagGeneration = (query, customTags = []) => post("/tags/generate", { query, custom_tags: customTags, llm_provider: "grok" });
export const updateTags = (id, tags, removed, added) => patch(`/tags/history/${id}`, { tags, excluded_tags: removed, added_tags: added });
export const saveTagRun = (query, tags) => post("/tags/history", { query, tags });
/** Merge several runs into one tag list with AI (1 credit). */
export const joinTags = (queries, candidateTags, options) =>
  runJob("/tags/join-ai", { queries, candidate_tags: candidateTags, max_tags: 70, llm_provider: "grok" }, options);
export const descriptions = () => get("/descriptions");
export const createDescription = (title, content) => post("/descriptions", { title, content });
export const updateDescription = (id, title, content) => put(`/descriptions/${id}`, { title, content });
export const deleteDescription = (id) => del(`/descriptions/${id}`);

// ---- YouTube
export const youtubeStatus = () => get("/youtube/status");
export const youtubeAuthUrl = () => get("/youtube/auth-url");
export const youtubeDisconnect = () => del("/youtube/disconnect");
export const analyzeChannel = (onProgress) => runJob("/youtube/analytics", undefined, { intervalMs: 3000, onProgress });
export const cancelJob = (id) => post(`/jobs/${id}/cancel`);

// ---- Spotlight
export const spotlight = () => get("/producers/spotlight");
export const producerStats = (userId) => get(`/producers/${userId}/stats`);
export const myProducer = () => get("/producers/me");
export const updateMyProducer = (body) => put("/producers/me", body);
export const uploadAvatar = (file) => post("/producers/avatar", form(file));
export const uploadBanner = (file) => post("/producers/banner", form(file));
export const setTopBeatLink = (url, title) => put("/producers/top-beat", { url, title });
export const uploadTopBeatAudio = (file, title) => post("/producers/top-beat/audio", form(file, { title }));
export const clearTopBeat = () => del("/producers/top-beat");
export const mySpotlightSocial = () => get("/producers/me/social");
export const setLike = (userId, on) => call(on ? "post" : "delete", `/producers/${userId}/like`);
export const setFollow = (userId, on) => call(on ? "post" : "delete", `/producers/${userId}/follow`);
export const applyForVerification = (body) => post("/producers/verification/apply", body);

// ---- Pros: producers who made it on YouTube, and plans to copy their moves
export const pros = () => get("/pros");
export const pro = (id) => get(`/pros/${id}`);
export const analyzePro = (id) => get(`/pros/${id}/analyze`);
export const stylePlan = () => get("/pros/plan");
export const createStylePlan = (id, moves) => post(`/pros/${id}/plan`, { moves });
export const tickPlanStep = (stepId, done) => patch(`/pros/plan/steps/${stepId}`, { done });
export const endStylePlan = () => del("/pros/plan");

// ---- feedback
export const sendFeedback = (body) => post("/feedback", body);
export const myFeedback = () => get("/feedback/mine");
export const allFeedback = () => get("/admin/feedback?status=all");
export const updateFeedback = (id, status) => patch(`/admin/feedback/${encodeURIComponent(id)}`, { status });
