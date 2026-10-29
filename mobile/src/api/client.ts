import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Same backend the website uses (frontend/.env REACT_APP_BACKEND_URL). Override with EXPO_PUBLIC_API_URL for a local backend.
export const API_BASE = `${(process.env.EXPO_PUBLIC_API_URL || 'https://api.sendmybeat.com').replace(/\/$/, '')}/api`;

const TOKEN_KEY = 'smb_token';
let memoryToken: string | null = null;

// SecureStore is native-only; the web preview falls back to localStorage.
export async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      memoryToken = globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    } catch {
      memoryToken = null;
    }
  } else {
    memoryToken = await SecureStore.getItemAsync(TOKEN_KEY);
  }
  return memoryToken;
}

export async function saveToken(token: string | null): Promise<void> {
  memoryToken = token;
  if (Platform.OS === 'web') {
    try {
      if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
      else globalThis.localStorage?.removeItem(TOKEN_KEY);
    } catch {
      // storage blocked; the token still lives in memory for this session
    }
    return;
  }
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// Mirrors getApiErrorMessage in frontend/src/pages/Dashboard.js: FastAPI `detail` can be a string or {message}.
function errorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && 'message' in detail) return String((detail as { message: unknown }).message);
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json' };
  // FormData sets its own multipart boundary header
  if (init.body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (memoryToken) headers.Authorization = `Bearer ${memoryToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: init.body === undefined ? undefined : isForm ? (init.body as FormData) : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError('Could not reach SendMyBeat. Check your connection.', 0);
  }

  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    if (res.status === 401 && memoryToken) onUnauthorized?.();
    throw new ApiError(errorMessage(body, `Request failed (${res.status})`), res.status);
  }
  return body as T;
}

type Job<R> = { id: string; status: string; progress?: number; message?: string; result?: R; error?: string };

// Same contract as pollBackgroundJobUntilDone on the website.
export async function pollJob<R>(jobId: string, { intervalMs = 2500, maxAttempts = 180 } = {}): Promise<R> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { job } = await api<{ job?: Job<R> }>(`/jobs/${jobId}`);
    if (!job) throw new ApiError('Job status response missing job data', 500);
    if (job.status === 'succeeded') return job.result as R;
    if (job.status === 'failed') throw new ApiError(job.error || 'Background job failed', 500);
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new ApiError('This is taking longer than expected. Try again in a minute.', 408);
}

// Endpoints that either answer directly or hand back {job:{id}} to poll.
export async function runJob<R>(path: string, body: unknown, intervalMs?: number): Promise<R> {
  const res = await api<{ job?: { id: string }; result?: R } & R>(path, { body });
  if (res?.job?.id) return pollJob<R>(res.job.id, { intervalMs });
  if (res && 'result' in res && res.result) return res.result as R;
  return res as R;
}
