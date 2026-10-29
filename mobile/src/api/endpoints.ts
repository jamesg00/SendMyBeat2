import { api, runJob } from './client';

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

export type ChannelAnalytics = {
  channel_name: string;
  subscriber_count: number;
  total_views: number;
  total_videos: number;
  recent_videos: { title?: string; views?: number; likes?: number; comments?: number }[];
  insights: {
    what_works?: string[];
    needs_improvement?: string[];
    recommendations?: string[];
    [key: string]: unknown;
  };
};

export type Producer = {
  user_id: string;
  username: string;
  avatar_url?: string | null;
  bio?: string;
  tags?: string[];
  likes?: number;
  views?: number;
  spotlight_tier?: string;
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
export const generateTags = (query: string) =>
  runJob<TagRun>('/tags/generate', { query, custom_tags: [] }, 2500);
export const descriptions = () => api<Description[]>('/descriptions');
export const youtubeStatus = () => api<YouTubeStatus>('/youtube/status');
export const analyzeChannel = () => runJob<ChannelAnalytics>('/youtube/analytics', {}, 3000);
export const spotlight = () => api<Spotlight>('/producers/spotlight');

export const createDescription = (title: string, content: string) =>
  api<Description>('/descriptions', { body: { title, content } });

// A picked file. On web the picker also hands back a real File object.
export type PickedFile = { uri: string; name: string; mimeType: string; file?: Blob };

function fileForm(f: PickedFile) {
  const form = new FormData();
  if (f.file) form.append('file', f.file, f.name);
  // React Native's FormData accepts {uri, name, type} for local files
  else form.append('file', { uri: f.uri, name: f.name, type: f.mimeType } as unknown as Blob);
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
