import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import * as api from '@/api/endpoints';
import type { PickedFile, TagRun, UploadJob, YouTubeUploadOptions } from '@/api/endpoints';
import { getSubscription, openPaywall, requireCredit } from '@/state/billing';
import { VIZ_DEFAULTS, getBaker, isProStyle, pickStyle, type BakeProgress, type VizSettings } from '@/state/visualizer';
import { useDraft, type DraftDescription } from '@/state/draft';

// Upload Studio lives here instead of in the screen, so closing the studio keeps the draft and
// the render job keeps polling. On native the draft is also saved to disk and survives app restarts.

export type LogLine = { at: number; text: string };
export type FileSlot = { name: string; uri: string; fileId?: string; status: 'uploading' | 'ready' | 'error'; error?: string };
export type Phase =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'job'; job: UploadJob; startedAt: number; log: LogLine[] }
  | { kind: 'done'; url?: string; message: string; warnings?: string[] }
  | { kind: 'error'; message: string };

export type StudioSettings = {
  title: string;
  privacy: YouTubeUploadOptions['privacy'];
  format: YouTubeUploadOptions['aspectRatio'];
  fps: YouTubeUploadOptions['renderFps'];
  bg: YouTubeUploadOptions['background'];
  /** Artwork size as a multiple of fitting the frame, per axis (the same as the website's free transform). */
  scaleX: number;
  scaleY: number;
  /** Artwork centre's offset from the frame centre, in half-frames. */
  posX: number;
  posY: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  noWatermark: boolean;
  viz: VizSettings;
  /** This upload's description, when you've edited it here; null uses the chosen template as it is. */
  descText: string | null;
  /** Added to the end of the description as "BPM: 140 | Key: F minor". */
  bpm: string;
  musicKey: string;
  /** A picture for the middle of the visualizer instead of the artwork (on this phone only). */
  logo: { uri: string; name: string } | null;
  /** Publish later (ISO time); null publishes as soon as it's uploaded. */
  publishAt: string | null;
  /** Add it to the artist's playlist. */
  playlist: boolean;
  /** Language code for YouTube, or '' for not set. */
  language: string;
  /** A custom thumbnail, uploaded like the artwork. */
  thumb: FileSlot | null;
};

/** The artwork's layout, which the Image tab can undo. */
export type Transform = Pick<StudioSettings, 'scaleX' | 'scaleY' | 'posX' | 'posY' | 'rotation' | 'flipH' | 'flipV'>;
export const FIT: Transform = { scaleX: 1, scaleY: 1, posX: 0, posY: 0, rotation: 0, flipH: false, flipV: false };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Keeps a layout inside what the server accepts. */
export const clampTransform = (t: Transform): Transform => ({
  ...t,
  scaleX: clamp(t.scaleX, 0.05, 5),
  scaleY: clamp(t.scaleY, 0.05, 5),
  posX: clamp(t.posX, -2, 2),
  posY: clamp(t.posY, -2, 2),
  rotation: clamp(t.rotation, -180, 180),
});

/** The website's beat details line: old BPM/Key lines are taken out and a fresh one goes at the end. */
export function withBeatMeta(text: string, bpm: string, key: string) {
  const clean = text
    .split('\n')
    .filter((line) => !/^\s*(BPM|Key)\s*:/i.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const parts = [bpm.trim() && `BPM: ${bpm.trim()}`, key.trim() && `Key: ${key.trim()}`].filter(Boolean);
  if (!parts.length) return clean;
  return clean ? `${clean}\n\n${parts.join(' | ')}` : parts.join(' | ');
}

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
  ...FIT,
  noWatermark: false,
  viz: VIZ_DEFAULTS,
  descText: null,
  bpm: '',
  musicKey: '',
  logo: null,
  publishAt: null,
  playlist: false,
  language: '',
  thumb: null,
};

/** Why a publish time can't be used, or null when it's fine (15 minutes to 180 days out). */
export function scheduleProblem(iso: string | null, now = Date.now()) {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return 'Pick a date and time.';
  if (at < now + 15 * 60 * 1000) return 'Schedule it at least 15 minutes from now.';
  if (at > now + 180 * 24 * 3600 * 1000) return 'Schedule it within the next 180 days.';
  return null;
}

const persist = Platform.OS !== 'web';
const dir = persist ? new Directory(Paths.document, 'studio') : null;
const stateFile = dir ? new File(dir, 'draft.json') : null;

function loadSaved(): Saved | null {
  try {
    if (!stateFile?.exists) return null;
    const saved = JSON.parse(stateFile.textSync()) as Saved & { scale?: number };
    // Drafts from before the free transform had one scale for both sides.
    if (saved.scaleX === undefined && typeof saved.scale === 'number') {
      saved.scaleX = saved.scale;
      saved.scaleY = saved.scale;
    }
    delete saved.scale;
    return saved;
  } catch {
    return null;
  }
}

// Picker results sit in a cache folder iOS can clear, so keep our own copy next to the draft.
function keepCopy(uri: string, kind: 'beat' | 'artwork' | 'logo', name: string) {
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
  /** While the visualizer video is being made on the phone, before it's sent. */
  bake: BakeProgress | null;
  set: (patch: Partial<StudioSettings>) => void;
  setViz: (patch: Partial<VizSettings>) => void;
  /** Picks a visualizer style and resets its look to that style's preset. */
  pickVizStyle: (mode: string) => void;
  open: () => void;
  pickAudio: () => Promise<void>;
  pickImage: () => Promise<void>;
  pickLogo: () => Promise<void>;
  /** Picks and uploads a custom thumbnail. */
  pickThumb: () => Promise<void>;
  /** The description that goes on YouTube: this upload's text with the BPM and key line. */
  finalDescription: string;
  /** Stop the upload that's running. */
  cancel: () => Promise<void>;
  cancelling: boolean;
  publish: () => Promise<void>;
  reset: () => void;
  /** Stop the upload if one is running, then clear the draft. */
  discard: () => Promise<void>;
  /** Try a failed upload again with the same files and settings. */
  retry: () => Promise<void>;
};

const StudioContext = createContext<Studio | null>(null);

export function StudioProvider({ children }: { children: ReactNode }) {
  const draft = useDraft();
  const [saved] = useState(loadSaved);
  const [settings, setSettings] = useState<StudioSettings>(() => ({ ...DEFAULTS, ...saved, viz: { ...VIZ_DEFAULTS, ...saved?.viz } }));
  const [bake, setBake] = useState<BakeProgress | null>(null);
  const [cancelling, setCancelling] = useState(false);
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
  const templateId = useRef(saved?.description?.id ?? draft.description.id);
  const synced = useRef(!saved?.description);

  // Bring back the tags and description the saved draft was using.
  useEffect(() => {
    if (restored.current || !saved) return;
    restored.current = true;
    if (saved.run) draft.setRun(saved.run);
    if (saved.description) draft.setDescription(saved.description);
  }, [saved, draft]);

  // Choosing another description template starts this upload's text over from it.
  useEffect(() => {
    // Wait until the saved draft's template is back before watching for a new one.
    if (!synced.current) {
      if (draft.description.id === templateId.current) synced.current = true;
      return;
    }
    if (templateId.current === draft.description.id) return;
    templateId.current = draft.description.id;
    setSettings((cur) => (cur.descText === null ? cur : { ...cur, descText: null }));
  }, [draft.description.id]);

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
          setPhase({
            kind: 'done',
            url: job.result?.video_url,
            message: job.result?.message ?? 'Video uploaded to YouTube.',
            warnings: job.result?.warnings?.length ? job.result.warnings : undefined,
          });
        } else if (job.status === 'failed' || job.status === 'cancelled') {
          setPhase({ kind: 'error', message: job.status === 'cancelled' ? 'Upload cancelled.' : (job.error ?? 'YouTube upload failed.') });
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

  // The logo only goes into the visualizer video made on this phone, so it isn't uploaded.
  const pickLogo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    const ext = (a.mimeType ?? 'image/jpeg').split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const name = `${(a.fileName ?? 'logo').replace(/\.[^.]+$/, '')}.${ext}`;
    const uri = a.file ? a.uri : keepCopy(a.uri, 'logo', name);
    setSettings((cur) => ({ ...cur, logo: { uri, name }, viz: { ...cur.viz, center: 'image' } }));
  };

  // A custom thumbnail goes up like the artwork; YouTube gets it after the video is in.
  const pickThumb = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    const mimeType = a.mimeType === 'image/png' || a.mimeType === 'image/webp' ? a.mimeType : 'image/jpeg';
    const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
    const name = `${(a.fileName ?? 'thumbnail').replace(/\.[^.]+$/, '')}.${ext}`;
    const slot = (thumb: FileSlot) => setSettings((cur) => ({ ...cur, thumb }));
    slot({ name, uri: a.uri, status: 'uploading' });
    try {
      const { file_id } = await api.uploadImage({ uri: a.uri, name, mimeType, file: a.file });
      slot({ name, uri: a.uri, fileId: file_id, status: 'ready' });
    } catch (e) {
      slot({ name, uri: a.uri, status: 'error', error: e instanceof Error ? e.message : 'Upload failed' });
    }
  };

  const s = settings;
  const finalDescription = withBeatMeta(s.descText ?? draft.description.content, s.bpm, s.musicKey);
  const missing = !s.title.trim()
    ? 'Add a video title'
    : audio?.status !== 'ready'
      ? 'Add your beat'
      : image?.status !== 'ready'
        ? 'Add artwork'
        : s.thumb?.status === 'uploading'
          ? 'Wait for the thumbnail to upload'
          : scheduleProblem(s.publishAt);

  const publish = async () => {
    if (missing || !audio?.fileId || !image?.fileId || bake) return;
    if (!requireCredit('upload')) return;
    const withViz = s.viz.enabled;
    if (withViz && isProStyle(s.viz.mode)) {
      const sub = getSubscription();
      if (sub && !sub.is_subscribed) {
        openPaywall('needs_plan', 'Premium visualizers need a Plus or Pro plan.');
        return;
      }
    }
    // With the visualizer on, the phone renders the whole video (artwork + visualizer) first,
    // the same way the website does; the server then only adds the audio and the watermark.
    let baked: { fileId: string; fps: number } | null = null;
    if (withViz) {
      const baker = getBaker();
      if (!baker) {
        setPhase({ kind: 'error', message: 'Open the preview so the visualizer can render, then try again.' });
        return;
      }
      setBake({ stage: 'rendering', value: 0 });
      try {
        baked = await baker(s.fps === '60' ? '60' : '30', setBake);
      } catch (e) {
        setBake(null);
        setPhase({ kind: 'error', message: e instanceof Error ? e.message : "The visualizer video couldn't be made." });
        return;
      }
      setBake(null);
    }
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
        // Sent every time, like the website, so edits made here and the BPM/key line go up with this video.
        descriptionOverride: finalDescription || undefined,
        imageFileId: baked ? baked.fileId : image.fileId,
        baked: !!baked,
        visualizerStyle: baked ? s.viz.mode : undefined,
        aspectRatio: s.format,
        imageScaleX: s.scaleX,
        imageScaleY: s.scaleY,
        imagePosX: s.posX,
        imagePosY: s.posY,
        imageRotation: Math.round(s.rotation),
        imageFlipH: s.flipH,
        imageFlipV: s.flipV,
        background: s.bg,
        renderFps: baked ? (baked.fps === 60 ? '60' : '30') : s.fps,
        removeWatermark: s.noWatermark,
        publishAt: s.publishAt ?? undefined,
        playlistMode: s.playlist ? 'artist' : 'none',
        thumbnailFileId: s.thumb?.status === 'ready' ? s.thumb.fileId : undefined,
        defaultLanguage: s.language || undefined,
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

  // Queued jobs stop at once, running ones at their next step; polling then reports it cancelled.
  const cancel = async () => {
    if (phase.kind !== 'job' || cancelling) return;
    setCancelling(true);
    try {
      const res = await api.cancelJob(phase.job.id);
      if (res.job?.status === 'cancelled') setPhase({ kind: 'error', message: 'Upload cancelled.' });
    } catch (e) {
      setPhase((cur) => (cur.kind === 'job' ? { ...cur, log: [...cur.log, { at: Date.now(), text: e instanceof Error ? e.message : "Couldn't cancel" }] } : cur));
    } finally {
      setCancelling(false);
    }
  };

  const discard = async () => {
    if (phase.kind === 'job') {
      try {
        await api.cancelJob(phase.job.id);
      } catch {
        // already finished or gone; the draft is cleared either way
      }
    }
    reset();
  };

  const value: Studio = {
    ...settings,
    audio,
    image,
    phase,
    active: !!audio || !!image || phase.kind !== 'idle',
    missing,
    bake,
    set: (patch) => setSettings((cur) => ({ ...cur, ...patch })),
    // A visualizer at 2 fps is a slideshow: turning it on moves the frame rate to 30.
    setViz: (patch) =>
      setSettings((cur) => {
        const viz = { ...cur.viz, ...patch };
        return { ...cur, viz, fps: viz.enabled && cur.fps === '2' ? '30' : cur.fps };
      }),
    pickVizStyle: (mode) => setSettings((cur) => ({ ...cur, viz: pickStyle(cur.viz, mode) })),
    // Fresh drafts start with "<search> type beat" as the title.
    open: () => {
      if (!settings.title && draft.run) setSettings((cur) => ({ ...cur, title: `${draft.run!.query} type beat` }));
    },
    pickAudio,
    pickImage,
    pickLogo,
    pickThumb,
    finalDescription,
    cancel,
    cancelling,
    publish,
    reset,
    discard,
    retry: publish,
  };

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider');
  return ctx;
}
