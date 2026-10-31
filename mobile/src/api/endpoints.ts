import { File } from 'expo-file-system';

import { api, runJob, type JobProgress } from './client';

// Shapes follow the Pydantic models in backend/server.py and backend/models_spotlight.py.
export type User = { id: string; username: string; is_admin?: boolean; email?: string | null };
export type TokenResponse = { access_token: string; token_type: string; user: User };

export type SubscriptionStatus = {
  is_subscribed: boolean;
  plan: 'free' | 'plus' | 'max' | 'pro';
  daily_credits_remaining: number;
  daily_credits_total: number;
  upload_credits_remaining: number;
  upload_credits_total: number;
  resets_at?: string | null;
};

export type TagLevel = 'high' | 'medium' | 'low' | 'unknown';
/** The server's score for one tag: demand from YouTube search suggestions, competition from YouTube results. */
export type ScoredTag = {
  tag: string;
  score: number;
  reason?: string;
  /** `record`: how videos uploaded with this tag did against their channels' normal (once enough exist). */
  signals?: { demand: TagLevel; competition: TagLevel; record?: 'proven' | 'weak'; record_videos?: number };
};
export type TagRun = { id: string; query: string; tags: string[]; scored_tags?: ScoredTag[]; created_at?: string };
export type Description = { id: string; title: string; content: string; is_ai_generated?: boolean };
export type YouTubeStatus = { connected: boolean; email?: string | null; name?: string | null };

export type ChannelVideo = {
  id?: string;
  title?: string;
  views?: number;
  likes?: number;
  comments?: number;
  published_at?: string;
};
/** One AI review per recent upload; index 1 is the newest upload. */
export type VideoReview = { index: number; verdict?: string; reason?: string; fix?: string; better_title?: string };
export type ChannelAnalytics = {
  channel_name: string;
  subscriber_count: number;
  total_views: number;
  total_videos: number;
  /** Newest first. */
  recent_videos: ChannelVideo[];
  insights: {
    channel_health_score?: string;
    title_patterns?: { winning?: string; losing?: string };
    video_reviews?: VideoReview[];
    what_works?: string[];
    critical_issues?: string[];
    immediate_actions?: string[];
    [key: string]: unknown;
  };
};

/** A profile's showcase beat: a YouTube video or an uploaded audio file the server streams. */
export type TopBeat = {
  /** link = any other web page (BeatStars, SoundCloud…), opened in the browser. */
  kind: 'youtube' | 'audio' | 'link';
  url: string;
  title?: string;
  thumbnail?: string;
  video_id?: string;
  file_id?: string;
};
export type Producer = {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  bio?: string;
  tags?: string[];
  likes?: number;
  views?: number;
  featured?: boolean;
  role_tag?: string | null;
  top_beat_url?: string | null;
  top_beat?: TopBeat | null;
  social_links?: Record<string, string | null | undefined>;
  verification_status?: string;
  /** Why a request was approved or rejected (shown to you on your own profile). */
  verification_note?: string | null;
  spotlight_tier?: string;
  spotlight_score?: number;
  current_streak?: number;
  /** In-app hearts and follows (separate from YouTube likes). */
  app_likes?: number;
  followers?: number;
};
export type ProducerBeat = { title?: string; url?: string | null; views?: number; likes?: number; published_at?: string; thumbnail?: string | null };
export type ProducerStats = {
  profile: Producer;
  stats: { likes?: number; views?: number; current_streak?: number; longest_streak?: number; total_days_completed?: number };
  top_beats?: ProducerBeat[];
  channel_top_beats?: ProducerBeat[];
  channel?: { connected?: boolean; name?: string | null; performance?: { subscriber_count?: number; total_views?: number; total_videos?: number } };
  member_since?: string;
};
export type Spotlight = {
  featured_producers: Producer[];
  trending_producers: Producer[];
  new_producers: Producer[];
  all_producers?: Producer[];
};

export const login = (username: string, password: string) =>
  api<TokenResponse>('/auth/login', { body: { username, password } });
export const register = (username: string, password: string) =>
  api<TokenResponse>('/auth/register', { body: { username, password } });
export const me = () => api<User>('/auth/me');

export const subscriptionStatus = () => api<SubscriptionStatus>('/subscription/status');
export const tagHistory = () => api<TagRun[]>('/tags/history');
export const deleteTagRun = (id: string) => api<unknown>(`/tags/history/${id}`, { method: 'DELETE' });
export type TitleIdea = { title: string; keywords: string[]; coverage: number; length: number };
/** Video titles built from a run's best keywords (no credit used). */
export const titleIdeas = (runId: string, beatName: string) =>
  api<{ titles: TitleIdea[] }>(`/tags/history/${runId}/titles?beat_name=${encodeURIComponent(beatName)}`);
// Starts tag generation; returns either the finished run or a job to follow with pollJob.
export const startTagGeneration = (query: string) =>
  api<{ job?: { id: string } } & Partial<TagRun>>('/tags/generate', { body: { query, custom_tags: [] } });

// Removed tags are sent as excluded so future runs for this artist learn from them, like the website.
export const updateTags = (id: string, tags: string[], removed: string[], added: string[]) =>
  api<TagRun>(`/tags/history/${id}`, { method: 'PATCH', body: { tags, excluded_tags: removed, added_tags: added } });
export const descriptions = () => api<Description[]>('/descriptions');
export const youtubeStatus = () => api<YouTubeStatus>('/youtube/status');
export const analyzeChannel = (onProgress?: JobProgress) => runJob<ChannelAnalytics>('/youtube/analytics', {}, 3000, onProgress);
export const spotlight = () => api<Spotlight>('/producers/spotlight');
export const producerStats = (userId: string) => api<ProducerStats>(`/producers/${userId}/stats`);
export const myProducer = () => api<Producer>('/producers/me');
export type VerificationRequest = { stage_name?: string; main_platform_url?: string; notable_work?: string; reason: string; pro_id?: string };
export const applyForVerification = (body: VerificationRequest) => api<Producer>('/producers/verification/apply', { body });
export type VerificationApplication = {
  user_id: string;
  username?: string;
  avatar_url?: string | null;
  verification_applied_at?: string;
  verification_application?: Partial<VerificationRequest> & { submitted_at?: string };
  pro_name?: string | null;
};
export const pendingVerifications = () => api<{ applications: VerificationApplication[] }>('/producers/verification/pending');
export const reviewVerification = (userId: string, action: 'approve' | 'reject', note?: string) =>
  api<Producer>('/producers/verification/review', { body: { user_id: userId, action, note } });
export type ProfileUpdate = { bio?: string; tags?: string[]; social_links?: Record<string, string> };
export const updateMyProducer = (body: ProfileUpdate) => api<Producer>('/producers/me', { method: 'PUT', body });
export const uploadAvatar = (f: PickedFile) => api<{ avatar_url: string }>('/producers/avatar', { body: fileForm(f) });
export const uploadBanner = (f: PickedFile) => api<{ banner_url: string }>('/producers/banner', { body: fileForm(f) });
export const setTopBeatLink = (url: string, title?: string) =>
  api<{ top_beat: TopBeat }>('/producers/top-beat', { method: 'PUT', body: { url, title } });
export function uploadTopBeatAudio(f: PickedFile, title: string) {
  const form = fileForm(f);
  form.append('title', title);
  return api<{ top_beat: TopBeat }>('/producers/top-beat/audio', { body: form });
}
export const clearTopBeat = () => api<{ top_beat: null }>('/producers/top-beat', { method: 'DELETE' });
export const mySpotlightSocial = () => api<{ liked: string[]; following: string[] }>('/producers/me/social');
export const setLike = (userId: string, on: boolean) =>
  api<{ liked: boolean; app_likes: number }>(`/producers/${userId}/like`, { method: on ? 'POST' : 'DELETE' });
export const setFollow = (userId: string, on: boolean) =>
  api<{ following: boolean; followers: number }>(`/producers/${userId}/follow`, { method: on ? 'POST' : 'DELETE' });

export const createDescription = (title: string, content: string) =>
  api<Description>('/descriptions', { body: { title, content } });

export const updateDescription = (id: string, title: string, content: string) =>
  api<Description>(`/descriptions/${id}`, { method: 'PUT', body: { title, content } });

export const deleteDescription = (id: string) => api<unknown>(`/descriptions/${id}`, { method: 'DELETE' });

// A picked file. On web the picker also hands back a real File object.
export type PickedFile = { uri: string; name: string; mimeType: string; file?: Blob };

function fileForm(f: PickedFile) {
  const form = new FormData();
  if (f.file) form.append('file', f.file, f.name);
  // Expo's fetch can't send {uri} parts; it takes any part with bytes(), name and type.
  else {
    const local = new File(f.uri);
    form.append('file', { name: f.name, type: f.mimeType, bytes: () => local.bytes() } as unknown as Blob);
  }
  return form;
}

export type UploadedFile = { file_id: string; media_kind?: string };
export const uploadAudio = (f: PickedFile) => api<UploadedFile>('/upload/audio', { body: fileForm(f) });
export const uploadImage = (f: PickedFile) => api<UploadedFile>('/upload/image', { body: fileForm(f) });

export type YouTubeUploadOptions = {
  title: string;
  descriptionId: string;
  descriptionOverride?: string;
  tagsId?: string;
  privacy: 'public' | 'unlisted' | 'private';
  audioFileId: string;
  imageFileId: string;
  aspectRatio: '16:9' | '1:1' | '9:16' | '4:5';
  imageScale: number;
  imageRotation: number;
  background: 'black' | 'white' | 'blurred';
  renderFps: '2' | '30' | '60';
  removeWatermark: boolean;
};

export type UploadJob = {
  id: string;
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled' | string;
  progress?: number;
  message?: string;
  error?: string;
  result?: { video_url?: string; message?: string };
};

// Same form fields the website's UploadStudio sends (visualizer off; the server renders the artwork).
export async function startYouTubeUpload(o: YouTubeUploadOptions) {
  const form = new FormData();
  form.append('title', o.title);
  form.append('description_id', o.descriptionId);
  form.append('tags_id', o.tagsId ?? '');
  form.append('privacy_status', o.privacy);
  form.append('audio_file_id', o.audioFileId);
  form.append('image_file_id', o.imageFileId);
  if (o.descriptionOverride) form.append('description_override', o.descriptionOverride);
  form.append('remove_watermark', String(o.removeWatermark));
  form.append('aspect_ratio', o.aspectRatio);
  form.append('image_scale', String(o.imageScale));
  form.append('image_scale_x', String(o.imageScale));
  form.append('image_scale_y', String(o.imageScale));
  form.append('image_pos_x', '0');
  form.append('image_pos_y', '0');
  form.append('image_rotation', String(o.imageRotation));
  form.append('background_color', o.background);
  form.append('render_fps', o.renderFps);
  form.append('visualizer_enabled', 'false');
  form.append('visualizer_settings', '{}');
  return api<{ job?: UploadJob; video_url?: string; message?: string }>('/youtube/upload', { body: form });
}

export const uploadJob = (id: string) => api<{ job?: UploadJob }>(`/youtube/upload-jobs/${id}`);
/** Stop one of your jobs: queued ones cancel at once, running ones at their next step. */
export const cancelJob = (id: string) => api<{ cancelled: boolean; job?: UploadJob }>(`/jobs/${id}/cancel`, { method: 'POST' });

// ---- Pros: producers who made it on YouTube, and plans to copy their moves
export type ProCard = {
  id: string;
  name: string;
  group: string;
  tagline: string;
  sound: string[];
  photo?: string | null;
  /** Set when the photo is a press photo used with permission, not the YouTube channel picture. */
  photo_credit?: string | null;
  /** press: a press photo used with permission; youtube: their channel picture; video: the still from their top upload. */
  photo_source?: 'press' | 'youtube' | 'video' | null;
  /** The still from their most-viewed upload. */
  cover?: string | null;
  banner?: string | null;
  subscribers?: number | null;
  channel_url: string;
  channel_title?: string | null;
  why?: string | null;
  /** How close your uploads are to theirs, 0-100; null until you've uploaded through SendMyBeat. */
  match?: number | null;
  /** SendMyBeat confirmed which YouTube channel is theirs. */
  verified?: boolean;
  /** Their SendMyBeat user id, once they claimed the profile and it was approved. */
  claimed_by?: string | null;
};
export type TitlePatterns = {
  uploads: number;
  lead_artist_pct: number | null;
  quotes_pct: number | null;
  year_pct: number | null;
  pair_pct: number | null;
  per_week: number | null;
  weekdays: number[];
  /** [weekday][night, morning, afternoon, evening] in UTC. */
  heatmap?: number[][];
};
export type ProBreakdown = {
  views: number[];
  breakout_index: number[];
  top_share_pct: number | null;
  median_views: number;
  breakouts: { video_id: string; title: string; views: number; times_median: number | null }[];
};
export type StyleTrait = { id: string; label: string; you: number | null; them: number; you_pos: number; them_pos: number };
export type StyleGap = { trait: string; label: string; move_id: string | null; move: string | null };
export type StyleMatch = { them: TitlePatterns; you: TitlePatterns; match: number | null; traits: StyleTrait[]; gaps: StyleGap[] };
export type ProUpload = { video_id: string; title: string; published_at?: string; thumbnail?: string; views?: number };
export type ProDetail = ProCard & {
  story: string[];
  notable: { year: string; text: string }[];
  moves: { id: string; title: string; body: string; steps: string[]; uploads: number }[];
  sources: { label: string; url: string }[];
  total_views?: number | null;
  latest_uploads: ProUpload[];
  patterns: TitlePatterns;
  breakdown: ProBreakdown;
};
export type PlanStep = {
  id: string;
  kind: 'manual' | 'uploads' | 'title_formula' | 'title_pair';
  text: string;
  move: string;
  done: boolean;
  target?: number;
  count?: number;
  link?: 'descriptions';
};
export type StylePlan = { pro_id: string; pro_name: string; created_at: string; steps: PlanStep[]; done: number; total: number; next: PlanStep | null };

export const pros = () => api<{ pros: ProCard[] }>('/pros');
export const pro = (id: string) => api<ProDetail>(`/pros/${id}`);
export const analyzePro = (id: string) => api<StyleMatch>(`/pros/${id}/analyze`);
/** Admin only: a press photo (used with permission) and credit, or a pinned channel id. Empty string clears. */
export const updatePro = (id: string, body: { photo?: string; photo_credit?: string; channel_id?: string }) =>
  api<ProCard>(`/admin/pros/${id}`, { method: 'PATCH', body });
export const stylePlan = () => api<{ plan: StylePlan | null }>('/pros/plan');
export const createStylePlan = (id: string, moves: string[]) =>
  api<{ plan: StylePlan }>(`/pros/${id}/plan`, { method: 'POST', body: { moves } });
export const tickPlanStep = (stepId: string, done: boolean) =>
  api<{ plan: StylePlan }>(`/pros/plan/steps/${stepId}`, { method: 'PATCH', body: { done } });
export const endStylePlan = () => api<{ plan: null }>('/pros/plan', { method: 'DELETE' });
/** What the plan agent did for a step. A description step is already saved (applied): your
 * description now holds `content`, and `previous_content` is there to undo it. */
export type PlanAssist =
  | { mode: 'titles'; step_id: string; summary: string; titles: string[] }
  | {
      mode: 'description';
      step_id: string;
      summary: string;
      title: string;
      content: string;
      applied?: boolean;
      description_id?: string;
      previous_content?: string;
      created?: boolean;
    }
  | { mode: 'help'; step_id: string; summary: string; content: string };
/** Have the plan agent do a step (1 AI credit, refunded if it fails); follow the job with pollJob.
 * Pass the description Upload Studio is using so the agent changes that one. */
export const assistPlanStep = (stepId: string, description?: { id?: string; content?: string }) =>
  api<{ job: { id: string } }>(`/pros/plan/steps/${stepId}/assist`, {
    method: 'POST',
    body: { description_id: description?.id, description: description?.content },
  });
