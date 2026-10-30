import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import * as api from '@/api/endpoints';
import type { PickedFile, TagRun, UploadJob, YouTubeUploadOptions } from '@/api/endpoints';
import { useDraft, type DraftDescription } from '@/state/draft';

// Upload Studio lives here instead of in the screen, so closing the studio keeps the draft and
// the render job keeps polling. On native the draft is also saved to disk and survives app restarts.

export type LogLine = { at: number; text: string };
export type FileSlot = { name: string; uri: string; fileId?: string; status: 'uploading' | 'ready' | 'error'; error?: string };
export type Phase =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'job'; job: UploadJob; startedAt: number; log: LogLine[] }
  | { kind: 'done'; url?: string; message: string }
  | { kind: 'error'; message: string };

export type StudioSettings = {
  title: string;
  privacy: YouTubeUploadOptions['privacy'];
  format: YouTubeUploadOptions['aspectRatio'];
  fps: YouTubeUploadOptions['renderFps'];
  bg: YouTubeUploadOptions['background'];
  scale: number;
  rotation: number;
  noWatermark: boolean;
};

type Saved = StudioSettings & {
  audio: FileSlot | null;
  image: FileSlot | null;
  phase: Phase;
  run: TagRun | null;
  description: DraftDescription;
};

const DEFAULTS: StudioSettings = {
  title: '',
  privacy: 'public',
  format: '16:9',
  fps: '2',
  bg: 'black',
  scale: 1,
  rotation: 0,
  noWatermark: false,
};

const persist = Platform.OS !== 'web';
const dir = persist ? new Directory(Paths.document, 'studio') : null;
const stateFile = dir ? new File(dir, 'draft.json') : null;

function loadSaved(): Saved | null {
  try {
    if (!stateFile?.exists) return null;
    return JSON.parse(stateFile.textSync()) as Saved;
  } catch {
    return null;
  }
}

// Picker results sit in a cache folder iOS can clear, so keep our own copy next to the draft.
function keepCopy(uri: string, kind: 'beat' | 'artwork', name: string) {
  if (!dir) return uri;
  try {
    if (!dir.exists) dir.create({ intermediates: true });
    for (const f of dir.list()) if (f instanceof File && f.name.startsWith(`${kind}-`)) f.delete();
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    const dest = new File(dir, `${kind}-${Date.now()}${ext}`);
    new File(uri).copySync(dest);
    return dest.uri;
  } catch {
    return uri;
  }
}

type Studio = StudioSettings & {
  audio: FileSlot | null;
  image: FileSlot | null;
  phase: Phase;
  /** Something worth coming back to: picked files or an upload in flight or finished. */
  active: boolean;
  missing: string | null;
  set: (patch: Partial<StudioSettings>) => void;
  open: () => void;
  pickAudio: () => Promise<void>;
  pickImage: () => Promise<void>;
  publish: () => Promise<void>;
  reset: () => void;
};

const StudioContext = createContext<Studio | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const draft = useDraft();
  const [saved] = useState(loadSaved);
  const [settings, setSettings] = useState<StudioSettings>(() => ({ ...DEFAULTS, ...saved }));
  const [audio, setAudio] = useState<FileSlot | null>(saved?.audio ?? null);
  const [image, setImage] = useState<FileSlot | null>(saved?.image ?? null);
  // A request cut off by closing the app can't be resumed; a job id can.
  const [phase, setPhase] = useState<Phase>(() => {
    const p = saved?.phase;
    if (!p || p.kind === 'sending') return { kind: 'idle' };
    // Drafts saved before uploads tracked their start time.
    if (p.kind === 'job') return { ...p, startedAt: p.startedAt || Date.now(), log: p.log ?? [] };
    return p;
  });
  const restored = useRef(false);

  // Bring back the tags and description the saved draft was using.
  useEffect(() => {
    if (restored.current || !saved) return;
    restored.current = true;
    if (saved.run) draft.setRun(saved.run);
    if (saved.description) draft.setDescription(saved.description);
  }, [saved, draft]);

  useEffect(() => {
    if (!stateFile || !dir) return;
    const snapshot: Saved = { ...settings, audio, image, phase, run: draft.run, description: draft.description };
    try {
      if (!dir.exists) dir.create({ intermediates: true });
      stateFile.write(JSON.stringify(snapshot));
    } catch {
      // saving is best effort
    }
  }, [settings, audio, image, phase, draft.run, draft.description]);

  const jobId = phase.kind === 'job' ? phase.job.id : null;

  // Poll the render + upload job the same way the website does (every 3s), even with the studio closed.
  useEffect(() => {
    if (!jobId) return;
    const timer = setInterval(async () => {
      try {
        const { job } = await api.uploadJob(jobId);
        if (!job) return;
        if (job.status === 'succeeded') {
          setPhase({ kind: 'done', url: job.result?.video_url, message: job.result?.message ?? 'Video uploaded to YouTube.' });
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          setPhase({ kind: 'error', message: job.error ?? 'YouTube upload failed.' });
        } else {
          setPhase((cur) => {
            const log = cur.kind === 'job' ? cur.log : [];
            // Each new server message becomes a timestamped log line.
            const next = job.message && job.message !== log[log.length - 1]?.text ? [...log, { at: Date.now(), text: job.message }] : log;
            return { kind: 'job', job, startedAt: cur.kind === 'job' ? cur.startedAt : Date.now(), log: next };
          });
        }
      } catch {
        // keep polling through brief network drops
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [jobId]);

  const send = async (
    f: PickedFile,
    kind: 'beat' | 'artwork',
    setSlot: (s: FileSlot) => void,
    upload: (f: PickedFile) => Promise<api.UploadedFile>,
  ) => {
    const uri = f.file ? f.uri : keepCopy(f.uri, kind, f.name);
    setSlot({ name: f.name, uri, status: 'uploading' });
    try {
      const { file_id } = await upload({ ...f, uri });
      setSlot({ name: f.name, uri, fileId: file_id, status: 'ready' });
    } catch (e) {
      setSlot({ name: f.name, uri, status: 'error', error: e instanceof Error ? e.message : 'Upload failed' });
    }
  };

  const pickAudio = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (res.canceled) return;
    const a = res.assets[0];
    await send({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'audio/mpeg', file: a.file }, 'beat', setAudio, api.uploadAudio);
  };

  const pickImage = async () => {
    // iPhone photos are HEIC, which the server rejects; "compatible" makes iOS hand back a JPEG instead.
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    const mimeType = a.mimeType ?? 'image/jpeg';
    // The server checks the extension against the bytes, and iOS keeps the original IMG_1234.HEIC name.
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const base = (a.fileName ?? 'artwork').replace(/\.[^.]+$/, '');
    await send({ uri: a.uri, name: `${base}.${ext}`, mimeType, file: a.file }, 'artwork', setImage, api.uploadImage);
  };

  const s = settings;
  const missing = !s.title.trim()
    ? 'Add a video title'
    : audio?.status !== 'ready'
      ? 'Add your beat'
      : image?.status !== 'ready'
        ? 'Add artwork'
        : null;

  const publish = async () => {
    if (missing || !audio?.fileId || !image?.fileId) return;
    setPhase({ kind: 'sending' });
    try {
      // The upload endpoint needs a saved description; starter templates get saved on first use.
      const { description, run } = draft;
      let descriptionId = description.id;
      if (!description.saved) {
        const created = await api.createDescription(description.title, description.content);
        descriptionId = created.id;
        draft.setDescription({ ...description, id: created.id, saved: true });
      }
      const res = await api.startYouTubeUpload({
        title: s.title.trim(),
        descriptionId,
        tagsId: run?.id,
        privacy: s.privacy,
        audioFileId: audio.fileId,
        imageFileId: image.fileId,
        aspectRatio: s.format,
        imageScale: s.scale,
        imageRotation: Math.round(s.rotation),
        background: s.bg,
        renderFps: s.fps,
        removeWatermark: s.noWatermark,
      });
      if (res.job?.id) {
        const now = Date.now();
        setPhase({ kind: 'job', job: res.job, startedAt: now, log: [{ at: now, text: 'Sent beat and artwork to SendMyBeat' }] });
      }
      else setPhase({ kind: 'done', url: res.video_url, message: res.message ?? 'Upload started.' });
    } catch (e) {
      setPhase({ kind: 'error', message: e instanceof Error ? e.message : 'Upload failed.' });
    }
  };

  const reset = () => {
    setSettings(DEFAULTS);
    setAudio(null);
    setImage(null);
    setPhase({ kind: 'idle' });
    try {
      if (dir?.exists) dir.delete();
    } catch {
      // nothing to clean up
    }
  };

  const value: Studio = {
    ...settings,
    audio,
    image,
    phase,
    active: !!audio || !!image || phase.kind !== 'idle',
    missing,
    set: (patch) => setSettings((cur) => ({ ...cur, ...patch })),
    // Fresh drafts start with "<search> type beat" as the title.
    open: () => {
      if (!settings.title && draft.run) setSettings((cur) => ({ ...cur, title: `${draft.run!.query} type beat` }));
    },
    pickAudio,
    pickImage,
    publish,
    reset,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
}
