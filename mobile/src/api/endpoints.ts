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

export type TagRun = { id: string; query: string; tags: string[]; created_at?: string };
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
  social_links?: Record<string, string | null | undefined>;
  verification_status?: string;
  spotlight_tier?: string;
  spotlight_score?: number;
  current_streak?: number;
  /** In-app hearts and follows (separate from YouTube likes). */
  app_likes?: number;
  followers?: number;
};
export type ProducerBeat = { title?: string; url?: string | null; views?: number; likes?: number; published_at?: string };
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
