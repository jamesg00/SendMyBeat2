import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  Play, Pause, X, SlidersHorizontal, Youtube, Check, Music2, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import AudioVisualizer from "@/lib/AudioVisualizer";
import { getMediaAspectRatio, getPreviewImageTransform } from "@/lib/mediaLayout";
import FreeTransform, { SCALE_MAX, SCALE_MIN } from "@/components/upload-studio/FreeTransform";
import { OfflineAnalyser, decodeBeat } from "@/lib/offlineAnalysis";
import { canExportOffline, exportVisualizerVideo } from "@/lib/visualizerExport";
import { buildBeatTrack } from "@/lib/viz2/track";
import { isPremiumMode, isV2Mode } from "@/lib/viz2";
import { buildVisualizerOptions, designSizeFor, outputDimsFor } from "@/lib/visualizerOptions";
import {
  AUDIO_EXTENSIONS,
  AUDIO_MIME_TYPES,
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  DEFAULT_VIDEO_RENDER_FPS,
  DEFAULT_VISUALIZER_SETTINGS,
  VISUALIZER_PRESETS,
  canUsePremiumVisualizers,
} from "@/lib/constants";

const SUPPORTED_IMAGE_EXTENSIONS = [...IMAGE_EXTENSIONS, ".gif"];
const SUPPORTED_IMAGE_MIME_TYPES = [...IMAGE_MIME_TYPES, "image/gif"];


import UploadDashboard from "./upload-studio/UploadDashboard";
import MetadataEditor from "./upload-studio/MetadataEditor";
import { scheduleError } from "./upload-studio/PublishOptions";
import AIToolsPanel from "./upload-studio/AIToolsPanel";
import VisualizerSettings from "./upload-studio/VisualizerSettings";
import ImageEditorControls from "./upload-studio/ImageEditorControls";
import LayoutSettings from "./upload-studio/LayoutSettings";
import VisualizerCanvas from "./upload-studio/VisualizerCanvas";

const UploadStudio = ({
  user,
  analyticsData,
  subscriptionStatus,
  youtubeConnected,
  youtubeProfilePicture,
  youtubeName,
  youtubeEmail,
  descriptions,
  tagHistory,
  API,
  onUpgrade,
  onDisconnectYouTube,
  onConnectYouTube
}) => {
  // --- State ---
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioDismissed, setStudioDismissed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  // On a phone, once the keyboard has opened, scroll the field that was tapped into the middle of
  // the drawer so it isn't hidden behind the keyboard or the sticky upload bar.
  const keepFieldInView = useCallback((event) => {
    const field = event.target;
    if (!field?.matches?.("input, textarea, select, [contenteditable='true']")) return;
    const reveal = () => field.scrollIntoView({ block: "center", behavior: "smooth" });
    const vv = window.visualViewport;
    if (vv && vv.height >= window.innerHeight - 60) {
      // Keyboard not up yet: wait for it, with a fallback in case no resize comes.
      const timer = window.setTimeout(reveal, 450);
      vv.addEventListener("resize", () => { window.clearTimeout(timer); reveal(); }, { once: true });
    } else {
      window.requestAnimationFrame(reveal);
    }
  }, []);

  // Files
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [audioFileId, setAudioFileId] = useState("");
  const [imageFileId, setImageFileId] = useState("");
  const [selectedImageLabel, setSelectedImageLabel] = useState("");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAudioDragActive, setIsAudioDragActive] = useState(false);
  const [isImageDragActive, setIsImageDragActive] = useState(false);

  // Metadata
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedDescriptionId, setSelectedDescriptionId] = useState("");
  const [uploadDescriptionText, setUploadDescriptionText] = useState("");
  const [uploadBeatKey, setUploadBeatKey] = useState("");
  const [uploadBeatBpm, setUploadBeatBpm] = useState("");
  const [showBeatMetaDialog, setShowBeatMetaDialog] = useState(false);
  const [beatMetaPromptShown, setBeatMetaPromptShown] = useState(false);
  const [selectedTagsId, setSelectedTagsId] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("public");

  // Publishing extras: schedule, artist playlist, custom thumbnail, language.
  const [publishAt, setPublishAt] = useState(""); // "YYYY-MM-DDTHH:MM" in the viewer's time
  const [playlistMode, setPlaylistMode] = useState("none");
  const [defaultLanguage, setDefaultLanguage] = useState("");
  const [thumbnailFileId, setThumbnailFileId] = useState("");
  const [thumbnailName, setThumbnailName] = useState("");
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [youtubeExtras, setYoutubeExtras] = useState({ playlists_allowed: false, custom_thumbnails_allowed: null });

  // AI Tools State
  const [beatAnalysis, setBeatAnalysis] = useState(null);
  const [analyzingBeat, setAnalyzingBeat] = useState(false);
  const [thumbnailCheckResult, setThumbnailCheckResult] = useState(null);
  const [checkingThumbnail, setCheckingThumbnail] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [showTools, setShowTools] = useState(false);

  // Visual Settings
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [videoRenderFps, setVideoRenderFps] = useState(DEFAULT_VIDEO_RENDER_FPS);
  const [backgroundColor, setBackgroundColor] = useState("black");
  const [removeWatermark, setRemoveWatermark] = useState(false);

  // Image Layout
  const [imageScaleX, setImageScaleX] = useState(1);
  const [imageScaleY, setImageScaleY] = useState(1);
  const [lockImageScale, setLockImageScale] = useState(true);
  const [imagePosX, setImagePosX] = useState(0);
  const [imagePosY, setImagePosY] = useState(0);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageFlipH, setImageFlipH] = useState(false);
  const [imageFlipV, setImageFlipV] = useState(false);
  const [imageSettingsOpen, setImageSettingsOpen] = useState(false);
  const [centerLockEnabled, setCenterLockEnabled] = useState(false);
  const [imageMeta, setImageMeta] = useState({ width: 0, height: 0, ratio: 1 });
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  // Responsive Dims
  const [previewDims, setPreviewDims] = useState({ width: 320, height: 180 });

  // Audio Player
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Visualizer
  const [visualizerEnabled, setVisualizerEnabled] = useState(false);
  const [visualizerSettings, setVisualizerSettings] = useState(DEFAULT_VISUALIZER_SETTINGS);
  const [spectrumRecordImageUrl, setSpectrumRecordImageUrl] = useState("");
  const [spectrumRecordImageName, setSpectrumRecordImageName] = useState("");
  const [centerVisualizerImageUrl, setCenterVisualizerImageUrl] = useState("");
  const [centerVisualizerImageName, setCenterVisualizerImageName] = useState("");

  // Upload Process
  const [uploadingToYouTube, setUploadingToYouTube] = useState(false);
  const [uploadController, setUploadController] = useState(null);
  const [currentUploadJob, setCurrentUploadJob] = useState(null);
  const [vizBakeStatus, setVizBakeStatus] = useState(null); // null | "rendering" | "recording" | "uploading"
  const [vizBakeProgress, setVizBakeProgress] = useState(0); // 0..1 within the current stage
  // The decoded beat, analysed for the visualizer (preview and export read the same numbers).
  const [beatSpectrum, setBeatSpectrum] = useState(null);
  // Beat-engine frames for the new styles, built once from the same decoded beat.
  const [beatTrack, setBeatTrack] = useState(null);
  const previewBackdropRef = useRef(null);

  const hasAudioReady = Boolean(audioFileId);
  const hasImageReady = Boolean(imageFileId);
  const studioAssetSignature = `${audioFileId || ""}:${imageFileId || ""}`;

  // Refs
  const audioPlayerRef = useRef(null);
  const visualizerRef = useRef(null);
  // visualizerCanvasRef moved to VisualizerCanvas component
  const previewContainerRef = useRef(null);
  const studioImageInputRef = useRef(null);
  const centerVisualizerImageInputRef = useRef(null);
  const previewClickStartRef = useRef({ x: 0, y: 0 });
  const previewDraggedRef = useRef(false);
  const [dragState, setDragState] = useState(null);
  const [pinchState, setPinchState] = useState(null); // { startDist, startScale }
  const thumbnailAbortRef = useRef(null);
  const thumbnailProgressIntervalRef = useRef(null);

  // Helpers
  const formatTime = (seconds = 0) => {
    if (!Number.isFinite(seconds)) return "0:00";
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatUploadElapsed = (job) => {
    const createdAt = job?.created_at ? new Date(job.created_at) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return null;
    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - createdAt.getTime()) / 1000));
    if (elapsedSeconds < 60) return `${elapsedSeconds}s`;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  };

  const formatUploadStage = (job) => {
    const stage = String(job?.stage || "").trim();
    const labels = {
      queued: "Queued for worker pickup",
      validate: "Validating upload payload",
      oauth_refresh: "Refreshing YouTube connection",
      gif_transcode: "Converting GIF animation",
      ffmpeg_render: "Encoding video",
      encoding: "Encoding video",
      youtube_upload: "Uploading to YouTube",
      cleanup: "Cleaning up render files",
      admin_clear: "Cancelled by admin",
    };
    return labels[stage] || "";
  };

  const activeUploadJob = currentUploadJob && ["queued", "processing"].includes(currentUploadJob.status)
    ? currentUploadJob
    : null;
  const uploadJobProgress = Math.max(0, Math.min(100, Number(activeUploadJob?.progress || 0)));
  const uploadJobEncodeProgress = Math.max(
    0,
    Math.min(100, Number(activeUploadJob?.encode_progress ?? NaN))
  );
  const hasEncodeProgress = Number.isFinite(uploadJobEncodeProgress);
  const uploadJobStage = activeUploadJob
    ? [formatUploadStage(activeUploadJob), activeUploadJob?.message].filter(Boolean).join(" — ")
    : "Rendering and uploading in the background.";
  const uploadJobElapsed = activeUploadJob ? formatUploadElapsed(activeUploadJob) : null;
  const uploadJobStageKey = String(activeUploadJob?.stage || "").trim();
  const isEncodingStage = uploadJobStageKey === "ffmpeg_render" || uploadJobStageKey === "gif_transcode";
  const isYouTubeUploadStage = uploadJobStageKey === "youtube_upload";
  const previewTargetRatio = getMediaAspectRatio(videoAspectRatio);
  const isAnimatedVisual = Boolean(
    imageFile?.type === "image/gif" ||
    (imageFile?.name || "").toLowerCase().endsWith(".gif")
  );
  const previewUsesBlurredBackground = Boolean(
    backgroundColor === "blurred" &&
    imagePreviewUrl &&
    imageMeta.width &&
    imageMeta.height &&
    Math.abs(imageMeta.ratio - previewTargetRatio) > 0.015
  );

  const buildUploadDescriptionWithMetadata = () => {
    return upsertBeatMetaInDescription(uploadDescriptionText, uploadBeatBpm, uploadBeatKey);
  };

  const stripBeatMetaFromDescription = (text = "") => {
    const lines = String(text).split("\n");
    const filtered = lines.filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^BPM\s*:/i.test(trimmed)) return false;
      if (/^Key\s*:/i.test(trimmed)) return false;
      return true;
    });
    return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  const upsertBeatMetaInDescription = (text = "", bpm = "", key = "") => {
    const clean = stripBeatMetaFromDescription(text);
    const metaParts = [];
    const safeBpm = String(bpm || "").trim();
    const safeKey = String(key || "").trim();
    if (safeBpm) metaParts.push(`BPM: ${safeBpm}`);
    if (safeKey) metaParts.push(`Key: ${safeKey}`);
    if (!metaParts.length) return clean;
    if (!clean) return metaParts.join(" | ");
    return `${clean}\n\n${metaParts.join(" | ")}`;
  };

  const applyBeatMetaToDescription = () => {
    setUploadDescriptionText((prev) =>
      upsertBeatMetaInDescription(prev, uploadBeatBpm, uploadBeatKey)
    );
  };

  // Builds a description from the chosen tag run (no credits), with the chosen template under it.
  // BPM and key are left to upsertBeatMetaInDescription, which adds them at upload.
  const buildDescriptionFromTags = async () => {
    if (!selectedTagsId) return null;
    try {
      const response = await axios.post(`${API}/descriptions/generate`, {
        tag_id: selectedTagsId,
        beat_name: (audioFile?.name || "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\b\d{2,3}\s?bpm\b/gi, "").trim(),
        template_id: selectedDescriptionId || null,
        include_chapters: false,
      });
      setUploadDescriptionText(upsertBeatMetaInDescription(response.data.content || "", uploadBeatBpm, uploadBeatKey));
      return response.data;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't build the description. Try again."));
      return null;
    }
  };

  const handleThumbnailPick = async (file) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file?.type || "")) {
      toast.error("Use a JPG, PNG or WEBP for the thumbnail.");
      return;
    }
    setUploadingThumbnail(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await axios.post(`${API}/upload/image`, formData);
      setThumbnailFileId(response.data.file_id);
      setThumbnailName(file.name || "Thumbnail");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't upload the thumbnail."));
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const allowPlaylists = async () => {
    try {
      const response = await axios.get(`${API}/youtube/auth-url`, { params: { playlists: true } });
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't open YouTube. Try again."));
    }
  };

  // The extras go on every upload request; the server validates them again.
  const appendPublishExtras = (formData) => {
    if (publishAt) {
      const when = new Date(publishAt);
      if (!Number.isNaN(when.getTime())) formData.append("publish_at", when.toISOString());
    }
    formData.append("playlist_mode", youtubeExtras.playlists_allowed ? playlistMode : "none");
    if (thumbnailFileId && youtubeExtras.custom_thumbnails_allowed !== false) formData.append("thumbnail_file_id", thumbnailFileId);
    if (defaultLanguage) formData.append("default_language", defaultLanguage);
  };

  const showUploadWarnings = (result) => {
    (result?.warnings || []).forEach((warning) => toast.warning(warning));
  };

  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.hypot(dx, dy);
  };

  const fitImageToFrame = () => {
    setImagePosX(0);
    setImagePosY(0);
    setImageScaleX(1);
    setImageScaleY(1);
    setImageRotation(0);
    setImageFlipH(false);
    setImageFlipV(false);
    setLockImageScale(true);
    setCenterLockEnabled(false);
    transformHistoryRef.current = { past: [], future: [] };
    setHistorySize({ past: 0, future: 0 });
  };

  // ---- Free transform: one object for the editor, with undo/redo.
  const imageTransform = {
    posX: imagePosX,
    posY: imagePosY,
    sx: imageScaleX,
    sy: imageScaleY,
    rot: imageRotation,
    flipH: imageFlipH,
    flipV: imageFlipV,
  };
  const imageTransformRef = useRef(imageTransform);
  imageTransformRef.current = imageTransform;
  const transformHistoryRef = useRef({ past: [], future: [] });
  const [historySize, setHistorySize] = useState({ past: 0, future: 0 });
  const setImageTransform = (next) => {
    const clampScale = (v) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, Number(v) || 1));
    setImagePosX(centerLockEnabled ? 0 : next.posX);
    setImagePosY(centerLockEnabled ? 0 : next.posY);
    setImageScaleX(clampScale(next.sx));
    setImageScaleY(clampScale(next.sy));
    setImageRotation(next.rot);
    setImageFlipH(Boolean(next.flipH));
    setImageFlipV(Boolean(next.flipV));
  };
  const pushTransformHistory = () => {
    const h = transformHistoryRef.current;
    h.past = [...h.past, { ...imageTransformRef.current }].slice(-60);
    h.future = [];
    setHistorySize({ past: h.past.length, future: 0 });
  };
  const undoTransform = () => {
    const h = transformHistoryRef.current;
    if (!h.past.length) return;
    const prev = h.past[h.past.length - 1];
    h.past = h.past.slice(0, -1);
    h.future = [...h.future, { ...imageTransformRef.current }];
    setHistorySize({ past: h.past.length, future: h.future.length });
    setImageTransform(prev);
  };
  const redoTransform = () => {
    const h = transformHistoryRef.current;
    if (!h.future.length) return;
    const next = h.future[h.future.length - 1];
    h.future = h.future.slice(0, -1);
    h.past = [...h.past, { ...imageTransformRef.current }];
    setHistorySize({ past: h.past.length, future: h.future.length });
    setImageTransform(next);
  };

  const centerImagePosition = () => {
    setImagePosX(0);
    setImagePosY(0);
  };

  const applyImageSettings = () => {
    setImageSettingsOpen(false);
    setDragState(null);
    setPinchState(null);
    toast.success("Image settings applied. Image is now locked.");
  };

  // Decode the beat once the visualizer is on, so the preview and the export share one analysis.
  useEffect(() => {
    if (!visualizerEnabled || !audioFile) {
      setBeatSpectrum(null);
      setBeatTrack(null);
      return undefined;
    }
    let alive = true;
    const abort = new AbortController();
    decodeBeat(audioFile).then(
      (beat) => {
        if (!alive) return;
        setBeatSpectrum(new OfflineAnalyser(beat));
        buildBeatTrack(beat, { signal: abort.signal }).then(
          (track) => alive && setBeatTrack(track),
          (error) => {
            if (error?.name !== "AbortError") console.error("Could not analyse the beat for the new visualizers", error);
          },
        );
      },
      (error) => {
        console.error("Could not decode the beat for the visualizer", error);
        if (alive) {
          setBeatSpectrum(null);
          setBeatTrack(null);
        }
      },
    );
    return () => {
      alive = false;
      abort.abort();
    };
  }, [visualizerEnabled, audioFile]);

  // A visualizer at 2 fps is a slideshow: turning it on moves the frame rate to 30.
  useEffect(() => {
    if (visualizerEnabled) setVideoRenderFps((fps) => (String(fps) === "2" ? "30" : fps));
  }, [visualizerEnabled]);

  const handlePreviewClick = () => {
    if (previewDraggedRef.current || imageSettingsOpen) {
      previewDraggedRef.current = false;
      return;
    }
    toggleAudioPlayback();
  };

  // --- Effects ---

  // Handle Resize for Preview & Mobile Check
  useEffect(() => {
    const updateDims = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);

      const targetRatio = getMediaAspectRatio(videoAspectRatio);

      // Desktop: everything left of the settings column (min(560px, 46vw)), minus room for the
      // editor's handles (40px each side) and the player under the preview.
      const sideWidth = Math.min(560, window.innerWidth * 0.46);
      const maxWidth = mobile ? window.innerWidth : window.innerWidth - sideWidth - 120;
      const maxHeight = mobile ? window.innerHeight : window.innerHeight - 56 - 150;

      let width = Math.min(maxWidth, 960);
      let height = width / targetRatio;

      if (height > maxHeight) {
         height = maxHeight;
         width = height * targetRatio;
      }

      setPreviewDims({ width, height });
    };

    updateDims();
    window.addEventListener("resize", updateDims);
    return () => window.removeEventListener("resize", updateDims);
  }, [videoAspectRatio]);

  useEffect(() => {
    if (!selectedDescriptionId) {
      setUploadDescriptionText("");
      return;
    }
    const selectedDesc = descriptions.find(d => d.id === selectedDescriptionId);
    const next = upsertBeatMetaInDescription(
      selectedDesc?.content || "",
      uploadBeatBpm,
      uploadBeatKey
    );
    setUploadDescriptionText(next);
  }, [selectedDescriptionId, descriptions]);

  // Which extras this channel can use: playlists need an extra YouTube permission, and
  // custom thumbnails are off for channels YouTube hasn't verified.
  useEffect(() => {
    if (!youtubeConnected) return undefined;
    let alive = true;
    axios
      .get(`${API}/youtube/status`)
      .then((response) => {
        if (!alive) return;
        setYoutubeExtras({
          playlists_allowed: Boolean(response.data?.playlists_allowed),
          custom_thumbnails_allowed: response.data?.custom_thumbnails_allowed ?? null,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [youtubeConnected, API]);

  // The player's event handlers read the visualizer switch through a ref, so turning the
  // visualizer on/off (or changing style) never re-runs this effect, which would reload the
  // audio element and send the song back to the start.
  const visualizerEnabledRef = useRef(visualizerEnabled);
  visualizerEnabledRef.current = visualizerEnabled;

  useEffect(() => {
    const audioEl = audioPlayerRef.current;
    if (!audioEl || !audioPreviewUrl) return;

    const syncDuration = () => {
      const d = Number.isFinite(audioEl.duration) ? audioEl.duration : 0;
      setAudioDuration(d > 0 ? d : 0);
    };
    const syncTime = () => {
      const t = Number.isFinite(audioEl.currentTime) ? audioEl.currentTime : 0;
      setAudioCurrentTime(Math.max(0, t));
    };
    const handleTimeUpdate = () => syncTime();
    const handleLoadedMetadata = () => syncDuration();
    const handleDurationChange = () => syncDuration();
    const handlePlay = async () => {
      setIsAudioPlaying(true);
      if (visualizerEnabledRef.current && visualizerRef.current) {
        try {
          await visualizerRef.current.resumeAudioContext();
          visualizerRef.current.start();
        } catch (err) { console.error(err); }
      }
    };
    const handlePause = () => {
      setIsAudioPlaying(false);
      visualizerRef.current?.stop();
    };
    const handleEnded = () => {
      setIsAudioPlaying(false);
      setAudioCurrentTime(audioEl.duration || 0);
      visualizerRef.current?.stop();
    };

    // Force metadata read for a new beat (only runs when the beat or the studio changes).
    audioEl.load();
    syncDuration();
    syncTime();
    if (audioEl.readyState >= 1 && Number.isFinite(audioEl.duration)) {
      setAudioDuration(audioEl.duration);
    }

    audioEl.addEventListener("loadeddata", handleLoadedMetadata);
    audioEl.addEventListener("timeupdate", handleTimeUpdate);
    audioEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    audioEl.addEventListener("durationchange", handleDurationChange);
    audioEl.addEventListener("canplay", handleLoadedMetadata);
    audioEl.addEventListener("canplaythrough", handleLoadedMetadata);
    audioEl.addEventListener("seeking", handleTimeUpdate);
    audioEl.addEventListener("seeked", handleTimeUpdate);
    audioEl.addEventListener("play", handlePlay);
    audioEl.addEventListener("pause", handlePause);
    audioEl.addEventListener("ended", handleEnded);

    // Backup polling for metadata + time to prevent stuck 0:00 UI
    const poll = setInterval(() => {
        if (!audioEl) return;
        syncDuration();
        syncTime();
    }, 250);

    return () => {
      clearInterval(poll);
      audioEl.removeEventListener("loadeddata", handleLoadedMetadata);
      audioEl.removeEventListener("timeupdate", handleTimeUpdate);
      audioEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioEl.removeEventListener("durationchange", handleDurationChange);
      audioEl.removeEventListener("canplay", handleLoadedMetadata);
      audioEl.removeEventListener("canplaythrough", handleLoadedMetadata);
      audioEl.removeEventListener("seeking", handleTimeUpdate);
      audioEl.removeEventListener("seeked", handleTimeUpdate);
      audioEl.removeEventListener("play", handlePlay);
      audioEl.removeEventListener("pause", handlePause);
      audioEl.removeEventListener("ended", handleEnded);
    };
  }, [audioPreviewUrl, studioOpen]);

  useEffect(() => {
    return () => {
      if (audioPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
  }, [audioPreviewUrl]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    return () => {
      if (spectrumRecordImageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(spectrumRecordImageUrl);
      }
    };
  }, [spectrumRecordImageUrl]);

  useEffect(() => {
    return () => {
      if (centerVisualizerImageUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(centerVisualizerImageUrl);
      }
    };
  }, [centerVisualizerImageUrl]);

  // Visualizer initialization and update moved to VisualizerCanvas component

  // Touch & Drag Handling (including Pinch Zoom)
  useEffect(() => {
    if (!dragState && !pinchState) return;

    const handleMove = (e) => {
      // Handle Pinch Zoom
      if (e.touches && e.touches.length === 2 && pinchState) {
        e.preventDefault(); // Prevent page scroll during pinch
        const currentDist = getDistance(e.touches[0], e.touches[1]);
        if (currentDist > 0 && pinchState.startDist > 0) {
          const scaleFactor = currentDist / pinchState.startDist;
          const newScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, pinchState.startScale * scaleFactor));

          setImageScaleX(newScale);
          if (lockImageScale) setImageScaleY(newScale);
        }
        return;
      }

      // Handle Drag (Pan)
      if (dragState && !centerLockEnabled) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = previewContainerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const deltaX = clientX - dragState.startX;
        const deltaY = clientY - dragState.startY;
        if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) previewDraggedRef.current = true;

        let nextX = Math.max(-1, Math.min(1, dragState.originX + deltaX / (rect.width / 2)));
        let nextY = Math.max(-1, Math.min(1, dragState.originY + deltaY / (rect.height / 2)));

        // Snap close drags to center for easier alignment.
        if (Math.abs(nextX) < 0.03) nextX = 0;
        if (Math.abs(nextY) < 0.03) nextY = 0;

        setImagePosX(nextX);
        setImagePosY(nextY);
      }
    };

    const handleUp = () => {
      setDragState(null);
      setPinchState(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [dragState, pinchState, lockImageScale, centerLockEnabled]);

  useEffect(() => {
    if (!studioOpen) return;

    const handleKeyDown = (e) => {
      const target = e.target;
      const tag = target?.tagName?.toLowerCase?.() || "";
      const typingTarget = tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
      if (typingTarget) return;

      if (e.code === "Space") {
        e.preventDefault();
        toggleAudioPlayback();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [studioOpen, toggleAudioPlayback]);


  // --- Handlers ---

  const handleAudioUpload = async (file) => {
    if (!file) return;
    const safeName = String(file.name || "").toLowerCase();
    const safeMime = String(file.type || "").toLowerCase();
    const isKnownAudio =
      AUDIO_MIME_TYPES.includes(safeMime) ||
      AUDIO_EXTENSIONS.some((ext) => safeName.endsWith(String(ext).toLowerCase()));
    if (!isKnownAudio) {
      toast.error("Upload an MP3, WAV, M4A, FLAC, or OGG audio file.");
      return;
    }
    if (!youtubeConnected) {
      toast.error("Connect your YouTube account before uploading audio.");
      onConnectYouTube?.();
      return;
    }
    if (file.size / (1024 * 1024) > 200) {
      toast.error("File too large (>200MB)");
      return;
    }
    setUploadingAudio(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${API}/upload/audio`, formData, {
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total))
      });
      setAudioFile(file);
      setAudioFileId(response.data.file_id);
      setBeatMetaPromptShown(false);
      setAudioPreviewUrl(URL.createObjectURL(file));
      toast.success("Audio ready!");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to upload audio");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    const safeFileName = String(file.name || "").toLowerCase();
    const safeMimeType = String(file.type || "").toLowerCase();
    const isSupportedImage =
      SUPPORTED_IMAGE_MIME_TYPES.includes(safeMimeType) ||
      SUPPORTED_IMAGE_EXTENSIONS.some((ext) => safeFileName.endsWith(ext));
    if (!isSupportedImage) {
      toast.error("Unsupported artwork type. Use JPG, PNG, WEBP, or GIF.");
      return;
    }
    if (!youtubeConnected) {
      toast.error("Connect your YouTube account before uploading artwork.");
      onConnectYouTube?.();
      return;
    }
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${API}/upload/image`, formData, {
      });
      setImageFile(file);
      setImageFileId(response.data.file_id);
      setSelectedImageLabel(file.name || "Uploaded image");
      setBeatMetaPromptShown(false);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        setImageMeta({ width: img.width, height: img.height, ratio });
      };
      img.src = url;
      fitImageToFrame();
      setCenterLockEnabled(false);
      const uploadedIsGif =
        response?.data?.media_kind === "video" ||
        safeMimeType === "image/gif" ||
        safeFileName.endsWith(".gif");
      if (uploadedIsGif) {
        setVideoRenderFps("30");
        toast.success("GIF ready — animation is optimized up to 15 fps for faster processing (use 2 fps for quickest uploads).");
      } else {
        toast.success("Image ready!");
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  async function toggleAudioPlayback() {
    const audioEl = audioPlayerRef.current;
    if (!audioEl) return;
    if (audioEl.paused) {
      try {
        if (visualizerEnabled && visualizerRef.current) await visualizerRef.current.resumeAudioContext();
        await audioEl.play();
      } catch (e) { console.error(e); }
    } else {
      audioEl.pause();
    }
  }

  const handleSeek = (value) => {
    const audioEl = audioPlayerRef.current;
    if (!audioEl || !Number.isFinite(audioDuration) || audioDuration <= 0) return;
    const nextTime = Math.max(0, Math.min(audioDuration, value));
    audioEl.currentTime = nextTime;
    setAudioCurrentTime(nextTime);
  };

  const handleTouchStart = (e) => {
    if (!imageSettingsOpen || centerLockEnabled) return;
    if (e.touches.length === 2) {
      const dist = getDistance(e.touches[0], e.touches[1]);
      setPinchState({
        startDist: dist,
        startScale: imageScaleX
      });
      setDragState(null);
    } else if (e.touches.length === 1) {
      handleDragStart(e);
    }
  };

  const handleDragStart = (e) => {
    if (!imageSettingsOpen || centerLockEnabled) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (!e.touches && e.button !== 0) return;

    previewClickStartRef.current = { x: clientX, y: clientY };
    previewDraggedRef.current = false;
    setDragState({
      startX: clientX,
      startY: clientY,
      originX: imagePosX,
      originY: imagePosY
    });
  };

  const handleSpectrumImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSpectrumRecordImageUrl(URL.createObjectURL(file));
      setSpectrumRecordImageName(file.name);
    }
  };

  const handleCenterVisualizerImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCenterVisualizerImageUrl(URL.createObjectURL(file));
    setCenterVisualizerImageName(file.name);
    toast.success("Center image ready.");
  };

  const applyVisualizerPreset = (preset) => {
    const values = VISUALIZER_PRESETS[preset];
    if (!values) return;
    setVisualizerSettings((s) => ({
      ...s,
      // Each style starts from the same effects, so one style's effects don't carry into the next.
      fxZoomPulse: 0,
      fxFlash: false,
      fxVignette: false,
      ...values,
      ...(values.fillCenter ? null : { spectrumBorderEnabled: s.fillCenter !== "transparent" && s.spectrumBorderEnabled }),
    }));
  };

  const pollBackgroundJobUntilDone = async (jobId, { intervalMs = 2500, maxAttempts = 480 } = {}) => {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await axios.get(`${API}/jobs/${jobId}`);
      const job = response?.data?.job;
      if (!job) {
        throw new Error("Job status response missing job data");
      }
      if (job.status === "succeeded") {
        return job.result;
      }
      if (job.status === "failed") {
        throw new Error(job.error || "Background job failed");
      }
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    }
    throw new Error("Background job timed out");
  };

  const getApiErrorMessage = (error, fallback) => {
    const detail = error?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (detail?.message) return detail.message;
    return error?.message || fallback;
  };

  // --- AI Tools Handlers ---

  const handleAnalyzeBeat = async () => {
    if (!uploadTitle || !selectedTagsId) {
      toast.error("Please add a title and select tags.");
      return;
    }
    const tags = tagHistory.find(t => t.id === selectedTagsId)?.tags || [];
    if (!tags.length) {
       toast.error("Selected tag set is empty.");
       return;
    }
    const analyticsSnapshot = analyticsData || user?.channelAnalytics || null;
    const recentVideos = Array.isArray(analyticsSnapshot?.recent_videos) ? analyticsSnapshot.recent_videos : [];
    const recentAvgViews = recentVideos.length
      ? Math.round(recentVideos.reduce((sum, video) => sum + Number(video?.views || 0), 0) / recentVideos.length)
      : 0;

    setAnalyzingBeat(true);
    try {
      const response = await axios.post(`${API}/beat/analyze`, {
        title: uploadTitle,
        tags: tags,
        description: uploadDescriptionText || "",
        channel_name: analyticsSnapshot?.channel_name || youtubeName || "",
        subscriber_count: Number(analyticsSnapshot?.subscriber_count || 0),
        total_videos: Number(analyticsSnapshot?.total_videos || 0),
        recent_avg_views: recentAvgViews,
      });
      const jobId = response?.data?.job?.id;
      if (!jobId) {
        throw new Error("Beat analysis job was not created");
      }
      const result = await pollBackgroundJobUntilDone(jobId);
      setBeatAnalysis(result);
      toast.success(`Analysis: ${result.overall_score}/100`);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error(getApiErrorMessage(error, "Beat analysis is on paid plans."));
        onUpgrade();
      } else {
        toast.error(getApiErrorMessage(error, "Analysis failed"));
      }
    } finally {
      setAnalyzingBeat(false);
    }
  };

  const handleThumbnailCheck = async () => {
    if (!imageFile && !imageFileId) {
      toast.error("Upload an image first");
      return;
    }
    const tags = tagHistory.find(t => t.id === selectedTagsId)?.tags || [];
    const safeTitle = (uploadTitle || "").trim();
    const safeDescription = (uploadDescriptionText || "").trim();
    const safeTags = tags.filter(Boolean).map((t) => String(t).trim()).filter(Boolean);

    if (!safeTitle) {
      toast.error("Add a title before thumbnail check.");
      return;
    }
    if (!safeTags.length) {
      toast.error("Select a tag set before thumbnail check.");
      return;
    }
    if (!safeDescription) {
      toast.error("Add a description before thumbnail check.");
      return;
    }

    setCheckingThumbnail(true);
    setThumbnailProgress(5);
    const controller = new AbortController();
    thumbnailAbortRef.current = controller;
    thumbnailProgressIntervalRef.current = setInterval(() => {
      setThumbnailProgress((prev) => (prev < 95 ? prev + 5 : prev));
    }, 500);

    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append("file", imageFile);
      } else if (imageFileId) {
        formData.append("image_file_id", imageFileId);
      }
      formData.append("title", safeTitle);
      formData.append("tags", safeTags.join(", "));
      formData.append("description", safeDescription);

      const response = await axios.post(`${API}/beat/thumbnail-check`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal
      });
      const jobId = response?.data?.job?.id;
      if (!jobId) {
        throw new Error("Thumbnail check job was not created");
      }
      const result = await pollBackgroundJobUntilDone(jobId);
      setThumbnailCheckResult(result);
      setThumbnailProgress(100);
      toast.success("Thumbnail Checked!");
    } catch (error) {
      if (error?.code !== "ERR_CANCELED") {
         if (error.response?.status === 402) {
            toast.error("Daily limit reached! Upgrade to continue.");
            onUpgrade();
         } else if (error.response?.data?.detail) {
            toast.error(typeof error.response.data.detail === "string" ? error.response.data.detail : (error.response.data.detail?.message || "Thumbnail check failed"));
         } else {
            toast.error(error?.message || "Thumbnail check failed");
         }
      }
    } finally {
      if (thumbnailProgressIntervalRef.current) clearInterval(thumbnailProgressIntervalRef.current);
      setCheckingThumbnail(false);
    }
  };

  // Builds the visualizer video for the whole beat and uploads it.
  // Returns { fileId, fps }, or null if it failed.
  //  1. Normal path: every frame is drawn from the decoded beat and encoded directly (exact frame
  //     rate and size, in sync for the full length, works in a background tab).
  //  2. Fallback for browsers without a video encoder: record the canvas in real time, full length.
  const bakeVisualizerToVideo = async (signal) => {
    const audioEl = audioPlayerRef.current;
    if (!audioEl || !imagePreviewUrl) return null;

    const [targetW, targetH] = outputDimsFor(videoAspectRatio);
    const exportFps = Number(videoRenderFps) === 60 ? 60 : 30;
    const recordFps = exportFps;
    const RECORD_SECONDS = Math.min(15 * 60, Math.max(1, Math.ceil(Number.isFinite(audioEl.duration) ? audioEl.duration : audioDuration || 20)));

    // Load cover image
    const coverImg = new Image();
    coverImg.crossOrigin = "anonymous";
    try {
      await new Promise((res, rej) => {
        coverImg.onload = res;
        coverImg.onerror = rej;
        coverImg.src = imagePreviewUrl;
        if (coverImg.complete) res();
      });
    } catch { return null; }

    // Everything behind the visualizer: background, then the artwork with its transform.
    const paintBackdrop = (ctx, w, h) => {
      if (backgroundColor === "blurred") {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, w, h);
        const coverScale = Math.max(w / coverImg.naturalWidth, h / coverImg.naturalHeight) * 1.08;
        const bgW = coverImg.naturalWidth * coverScale;
        const bgH = coverImg.naturalHeight * coverScale;
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.filter = "blur(18px)";
        ctx.drawImage(coverImg, (w - bgW) / 2, (h - bgH) / 2, bgW, bgH);
        ctx.restore();
        ctx.filter = "none";
      } else {
        ctx.fillStyle = backgroundColor === "white" ? "#ffffff" : "#000000";
        ctx.fillRect(0, 0, w, h);
      }
      const fit = Math.min(w / coverImg.naturalWidth, h / coverImg.naturalHeight);
      const artW = coverImg.naturalWidth * fit * imageScaleX;
      const artH = coverImg.naturalHeight * fit * imageScaleY;
      ctx.save();
      ctx.globalAlpha = visualizerSettings.backgroundOpacity ?? 1;
      // Centre of the artwork, offset from the frame centre in half-frames (same as the editor).
      ctx.translate(w / 2 + imagePosX * w * 0.5, h / 2 + imagePosY * h * 0.5);
      if (Math.abs(imageRotation) > 0.01) ctx.rotate(imageRotation * Math.PI / 180);
      ctx.scale(imageFlipH ? -1 : 1, imageFlipV ? -1 : 1);
      ctx.drawImage(coverImg, -artW / 2, -artH / 2, artW, artH);
      ctx.restore();
      ctx.globalAlpha = 1;
    };

    const uploadVisual = async (blob, name, type) => {
      setVizBakeStatus("uploading");
      setVizBakeProgress(0);
      const fd = new FormData();
      fd.append("file", new File([blob], name, { type }));
      const res = await axios.post(`${API}/upload/image`, fd, {
        timeout: 20 * 60_000,
        signal,
        onUploadProgress: (e) => e.total && setVizBakeProgress(e.loaded / e.total),
      });
      return res.data?.file_id || null;
    };

    const drawingOptions = buildVisualizerOptions(visualizerSettings, { imagePreviewUrl, centerVisualizerImageUrl, spectrumRecordImageUrl });

    let fastRenderError = null;
    if (canExportOffline() && audioFile) {
      let source = null;
      let track = beatTrack;
      let rendered = null;
      // Try the chosen frame rate first. If the phone's encoder gives up (60 fps at full size is
      // too much for some phones, or memory runs out on a long beat), try again at 30 fps before
      // falling back to the slow real-time recording.
      const attempts = exportFps > 30 ? [exportFps, 30] : [exportFps];
      for (const fps of attempts) {
        try {
          setVizBakeStatus("rendering");
          setVizBakeProgress(0);
          if (!source) source = beatSpectrum || new OfflineAnalyser(await decodeBeat(audioFile));
          // The new styles need the beat-engine track; build it now if the preview hadn't yet.
          if (!track && isV2Mode(visualizerSettings.mode)) {
            track = await buildBeatTrack({ samples: source.samples, sampleRate: source.sampleRate, duration: source.duration }, { signal });
          }
          const result = await exportVisualizerVideo({
            analyser: source.clone(),
            beatTrack: track,
            options: drawingOptions,
            size: [targetW, targetH],
            designSize: designSizeFor(videoAspectRatio),
            fps,
            duration: source.duration,
            drawBackdrop: paintBackdrop,
            onProgress: setVizBakeProgress,
            signal,
          });
          console.info(`Visualizer export: ${result.frames} frames at ${result.fps} fps, ${result.width}x${result.height}, ${result.codec}, ${(result.blob.size / 1048576).toFixed(1)} MB in ${result.seconds.toFixed(1)}s`);
          if (fps !== exportFps) toast.info(`Rendered the visualizer at ${fps} fps; this browser couldn't encode ${exportFps} fps.`);
          rendered = { blob: result.blob, fps };
          break;
        } catch (error) {
          if (signal?.aborted) return null; // cancelled: don't fall back to recording
          fastRenderError = error;
          console.error(`Offline visualizer export at ${fps} fps failed`, error);
        }
      }
      if (rendered) {
        try {
          const fileId = await uploadVisual(rendered.blob, "visualizer.mp4", "video/mp4");
          if (fileId) return { fileId, fps: rendered.fps };
          fastRenderError = new Error("the rendered video didn't upload");
        } catch (error) {
          if (signal?.aborted) return null;
          fastRenderError = new Error(`the rendered video didn't upload: ${error?.message || error}`);
          console.error("Uploading the rendered visualizer failed", error);
        }
      }
    }
    if (signal?.aborted) return null;

    // ---- Fallback: record the canvas in real time for the whole beat.
    setVizBakeStatus("recording");
    setVizBakeProgress(0);
    const fallbackReason = fastRenderError
      ? `The fast render failed (${String(fastRenderError?.message || fastRenderError).slice(0, 120)}),`
      : "This browser can't encode video directly,";
    toast.info(`${fallbackReason} so the visualizer is recorded in real time. Keep this tab open and in front until it finishes.`, { duration: 15000 });

    // Create a full-res hidden canvas for the dedicated baking visualizer.
    // It must be in the DOM so clientWidth/clientHeight return valid values.
    const bakingCanvas = document.createElement("canvas");
    bakingCanvas.width = targetW;
    bakingCanvas.height = targetH;
    bakingCanvas.style.cssText = `position:fixed;top:-${targetH + 10}px;left:-${targetW + 10}px;width:${targetW}px;height:${targetH}px;pointer-events:none;opacity:0;`;
    document.body.appendChild(bakingCanvas);
    const removeBakingCanvas = () => {
      if (bakingCanvas.parentNode) {
        bakingCanvas.parentNode.removeChild(bakingCanvas);
      }
    };

    const bakingVizOptions = drawingOptions;

    let bakingViz = null;
    try {
      bakingViz = new AudioVisualizer(bakingCanvas, bakingVizOptions);
      // Exact output size, laid out in the same design size as the preview.
      bakingViz.setDesignSize(...designSizeFor(videoAspectRatio));
      bakingViz.setOutputSize(targetW, targetH);
      if (beatTrack) bakingViz.setBeatProvider((A) => beatTrack.fillAtTime(audioEl.currentTime, A));
      const reusedLiveAnalyser = bakingViz.attachAudioAnalysisFrom?.(visualizerRef.current, audioEl);
      if (!reusedLiveAnalyser) {
        await bakingViz.connectMediaElement(audioEl);
      }
    } catch {
      try { bakingViz?.destroy(); } catch {}
      removeBakingCanvas();
      return null;
    }

    // Create the composite canvas (cover image + visualizer overlay)
    const composite = document.createElement("canvas");
    composite.width = targetW;
    composite.height = targetH;
    const ctx = composite.getContext("2d");

    const drawFrame = () => {
      paintBackdrop(ctx, targetW, targetH);
      // Draw baking visualizer — explicit size ensures correct compositing at any DPR
      ctx.drawImage(bakingCanvas, 0, 0, targetW, targetH);
    };

    // Start/ensure audio is playing so the analyser has data
    const wasPlaying = !audioEl.paused;
    const savedTime = audioEl.currentTime;
    try {
      audioEl.pause();
      audioEl.currentTime = 0;
      await bakingViz.resumeAudioContext();
      await audioEl.play();
    } catch {
      try { bakingViz?.destroy(); } catch {}
      removeBakingCanvas();
      return null;
    }
    bakingViz.start();


    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm;codecs=vp8";

    // Target ~40MB for a 20s clip so it fits well under the 200MB server limit.
    // 1080p visualizers are mostly flat color + waveform — VP9 compresses them well at these rates.
    const bitsPerSecond = recordFps >= 60 ? 16_000_000 : recordFps >= 30 ? 10_000_000 : 6_000_000;
    const stream = composite.captureStream(recordFps);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitsPerSecond });
    const chunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const recordingComplete = new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      recorder.onerror = () => resolve(null);
    });

    let rafId;
    const renderLoop = () => { drawFrame(); rafId = requestAnimationFrame(renderLoop); };

    recorder.start(200);
    renderLoop();

    const recordStarted = Date.now();
    const progressTimer = setInterval(() => setVizBakeProgress(Math.min(1, (Date.now() - recordStarted) / (RECORD_SECONDS * 1000))), 500);
    // Wait for the beat to finish, or stop early if the upload is cancelled.
    await new Promise((res) => {
      const done = setTimeout(res, RECORD_SECONDS * 1000);
      signal?.addEventListener("abort", () => { clearTimeout(done); res(); }, { once: true });
    });
    clearInterval(progressTimer);

    cancelAnimationFrame(rafId);
    recorder.stop();

    // Cleanup baking resources
    bakingViz.destroy();
    removeBakingCanvas();

    audioEl.pause();
    audioEl.currentTime = savedTime;
    if (wasPlaying) audioEl.play().catch(() => {});

    const blob = await recordingComplete;
    if (signal?.aborted || !blob || blob.size < 1000) return null;

    try {
      const fileId = await uploadVisual(blob, "visualizer.webm", mimeType);
      return fileId ? { fileId, fps: recordFps } : null;
    } catch { return null; }
  };

  // Development only: lets a test run the visualizer export without filling in the upload form.
  if (process.env.NODE_ENV === "development") window.__smbBakeVisualizer = bakeVisualizerToVideo;

  const handleYouTubeUpload = async () => {
    if (!uploadTitle || !(selectedDescriptionId || uploadDescriptionText.trim()) || !audioFileId || !imageFileId) {
      toast.error("Please fill title, description, and ensure files are uploaded.");
      return;
    }
    if (scheduleError(publishAt)) {
      toast.error(scheduleError(publishAt));
      return;
    }

    const controller = new AbortController();
    setUploadController(controller);
    setUploadingToYouTube(true);

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('description_id', selectedDescriptionId);
    formData.append('tags_id', selectedTagsId || '');
    formData.append('privacy_status', privacyStatus);
    appendPublishExtras(formData);
    formData.append('audio_file_id', audioFileId);
    formData.append('image_file_id', imageFileId);
    formData.append('remove_watermark', removeWatermark);
    formData.append('description_override', buildUploadDescriptionWithMetadata());
    formData.append('aspect_ratio', videoAspectRatio);
    formData.append('image_scale', String((imageScaleX + imageScaleY) / 2));
    formData.append('image_scale_x', String(imageScaleX));
    formData.append('image_scale_y', String(imageScaleY));
    formData.append('image_pos_x', String(imagePosX));
    formData.append('image_pos_y', String(imagePosY));
    formData.append('image_rotation', String(imageRotation));
    formData.append('image_flip_h', String(imageFlipH));
    formData.append('image_flip_v', String(imageFlipV));
    formData.append('image_pos_mode', 'frame');
    formData.append('background_color', backgroundColor);
    formData.append('render_fps', String(videoRenderFps || DEFAULT_VIDEO_RENDER_FPS));
    formData.append('visualizer_enabled', 'false');
    formData.append('visualizer_settings', '{}');

    try {
      const response = await axios.post(`${API}/youtube/upload`, formData, {
        timeout: 180000,
        signal: controller.signal
      });
      if (response.data.video_url) {
        toast.success("Video Uploaded Successfully! 🎉");
        window.open(response.data.video_url, '_blank');
      } else {
        toast.success(response.data.message || "Upload process started!");
      }
    } catch (error) {
      if (axios.isCancel(error)) return;
      if (error.response?.status === 402) {
         if (error.response.data.detail?.feature === 'remove_watermark') {
             toast.error("Watermark removal is Pro only!");
             setRemoveWatermark(false);
         } else {
             toast.error("Daily upload limit reached!");
         }
         onUpgrade();
      } else {
        toast.error(getApiErrorMessage(error, "Upload failed. Check connection or file size."));
      }
    } finally {
      setUploadingToYouTube(false);
      setUploadController(null);
    }
  };

  // Cancel wherever the upload is: rendering the visualizer here, sending the video, or the
  // server's job (queued jobs stop right away; running ones at their next step).
  const [cancellingUpload, setCancellingUpload] = useState(false);
  const cancelUpload = async () => {
    uploadController?.abort();
    setVizBakeStatus(null);
    setVizBakeProgress(0);
    const jobId = currentUploadJob?.id;
    if (!jobId) {
      setUploadingToYouTube(false);
      setUploadController(null);
      toast("Upload cancelled.");
      return;
    }
    setCancellingUpload(true);
    try {
      const response = await axios.post(`${API}/jobs/${jobId}/cancel`);
      const job = response?.data?.job;
      if (job) setCurrentUploadJob(job);
      toast(job?.status === "cancelled" ? "Upload cancelled." : "Cancelling… if YouTube is already receiving the video, it may still finish.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't cancel the upload."));
    } finally {
      setCancellingUpload(false);
    }
  };

  // After a video goes up, the next upload starts empty: no beat, artwork, thumbnail or beat details.
  const startFreshAfterUpload = () => {
    audioPlayerRef.current?.pause?.();
    setAudioFile(null);
    setAudioFileId("");
    setAudioPreviewUrl("");
    setIsAudioPlaying(false);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setImageFile(null);
    setImageFileId("");
    setSelectedImageLabel("");
    setImagePreviewUrl("");
    setImageMeta({ width: 0, height: 0, ratio: 1 });
    setThumbnailFileId("");
    setThumbnailName("");
    setThumbnailCheckResult(null);
    setBeatAnalysis(null);
    setUploadTitle("");
    setUploadBeatBpm("");
    setUploadBeatKey("");
    setBeatMetaPromptShown(false);
    setMobileDrawerOpen(false);
    setStudioOpen(false);
  };

  const handleYouTubeUploadAsync = async () => {
    if (!uploadTitle || !(selectedDescriptionId || uploadDescriptionText.trim()) || !audioFileId || !imageFileId) {
      toast.error("Please fill title, description, and ensure files are uploaded.");
      return;
    }
    if (scheduleError(publishAt)) {
      toast.error(scheduleError(publishAt));
      return;
    }

    // Premium styles are for paid plans (Plus, and Pro which is the max plan). The server checks this too.
    if (visualizerEnabled && isPremiumMode(visualizerSettings.mode) && !canUsePremiumVisualizers(subscriptionStatus)) {
      toast.error("That visualizer is a premium style. Upgrade to Plus or Pro to upload with it, or pick a free style.");
      onUpgrade();
      return;
    }

    const controller = new AbortController();
    setUploadController(controller);
    setUploadingToYouTube(true);

    // With the visualizer on, the whole video (artwork + visualizer) is rendered here for the
    // full beat and used as the visual; the server only adds the audio and the watermark.
    let visualFileId = imageFileId;
    let vizBaked = false;
    let vizFps = 30;
    if (visualizerEnabled) {
      const baked = await bakeVisualizerToVideo(controller.signal);
      setVizBakeStatus(null);
      if (controller.signal.aborted) {
        setUploadingToYouTube(false);
        setUploadController(null);
        return;
      }
      if (baked?.fileId) {
        visualFileId = baked.fileId;
        vizFps = baked.fps;
        vizBaked = true;
      } else {
        toast.error("The visualizer video couldn't be made, so nothing was uploaded. Try again, or turn the visualizer off.");
        setUploadingToYouTube(false);
        setUploadController(null);
        setVizBakeStatus(null);
        return;
      }
    }

    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('description_id', selectedDescriptionId);
    formData.append('tags_id', selectedTagsId || '');
    formData.append('privacy_status', privacyStatus);
    appendPublishExtras(formData);
    formData.append('audio_file_id', audioFileId);
    formData.append('image_file_id', visualFileId);
    formData.append('remove_watermark', removeWatermark);
    formData.append('description_override', buildUploadDescriptionWithMetadata());
    formData.append('aspect_ratio', videoAspectRatio);
    formData.append('render_fps', String(vizBaked ? vizFps : (videoRenderFps || DEFAULT_VIDEO_RENDER_FPS)));
    formData.append('background_color', backgroundColor);
    if (vizBaked) {
      // The WebM already has background + image + visualizer fully composited.
      // Use neutral transforms so the backend passes it through as-is,
      // and disable the backend FFmpeg visualizer so it doesn't overlay on top.
      formData.append('image_scale', '1');
      formData.append('image_scale_x', '1');
      formData.append('image_scale_y', '1');
      formData.append('image_pos_x', '0');
      formData.append('image_pos_y', '0');
      formData.append('image_rotation', '0');
      formData.append('visualizer_enabled', 'false');
      formData.append('visualizer_settings', '{}');
      formData.append('visualizer_style', visualizerSettings.mode || '');
    } else {
      formData.append('image_scale', String((imageScaleX + imageScaleY) / 2));
      formData.append('image_scale_x', String(imageScaleX));
      formData.append('image_scale_y', String(imageScaleY));
      formData.append('image_pos_x', String(imagePosX));
      formData.append('image_pos_y', String(imagePosY));
      formData.append('image_rotation', String(imageRotation));
      formData.append('image_flip_h', String(imageFlipH));
      formData.append('image_flip_v', String(imageFlipV));
      formData.append('image_pos_mode', 'frame');
      formData.append('visualizer_enabled', 'false');
      formData.append('visualizer_settings', '{}');
    }

    try {
      const response = await axios.post(`${API}/youtube/upload`, formData, {
        timeout: 30000,
        signal: controller.signal,
      });
      const nextJob = response?.data?.job || null;
      if (nextJob?.id) {
        setCurrentUploadJob(nextJob);
        toast.success(response?.data?.message || "Upload queued.");
        return;
      }

      if (response?.data?.video_url) {
        toast.success("Video uploaded successfully!");
        window.open(response.data.video_url, "_blank");
        startFreshAfterUpload();
        return;
      }

      toast.success(response?.data?.message || "Upload process started!");
      setUploadingToYouTube(false);
    } catch (error) {
      setUploadingToYouTube(false);
      if (axios.isCancel(error)) return;
      if (error.response?.status === 402) {
        if (error.response.data.detail?.feature === 'remove_watermark') {
          toast.error("Watermark removal is Pro only!");
          setRemoveWatermark(false);
        } else if (error.response.data.detail?.feature === 'premium_visualizer') {
          toast.error("That visualizer is a premium style. Upgrade to Plus or Pro to upload with it.");
        } else {
          toast.error("Daily upload limit reached!");
        }
        onUpgrade();
      } else {
        toast.error(getApiErrorMessage(error, "Upload failed. Check connection or file size."));
      }
    } finally {
      setUploadController(null);
      setVizBakeStatus(null);
    }
  };

  useEffect(() => {
    const jobId = currentUploadJob?.id;
    const jobStatus = currentUploadJob?.status;
    if (!jobId || !["queued", "processing"].includes(jobStatus)) {
      return undefined;
    }

    setUploadingToYouTube(true);
    let failedPolls = 0;
    const interval = window.setInterval(async () => {
      try {
        const response = await axios.get(`${API}/youtube/upload-jobs/${jobId}`);
        const nextJob = response?.data?.job || null;
        if (!nextJob) return;
        failedPolls = 0;
        setCurrentUploadJob(nextJob);

        if (nextJob.status === "succeeded") {
          window.clearInterval(interval);
          setUploadingToYouTube(false);
          toast.success(nextJob?.result?.message || "Video uploaded successfully!");
          showUploadWarnings(nextJob?.result);
          if (nextJob?.result?.video_url) {
            window.open(nextJob.result.video_url, "_blank");
          }
          setCurrentUploadJob(null);
          startFreshAfterUpload();
        } else if (nextJob.status === "failed" || nextJob.status === "cancelled") {
          window.clearInterval(interval);
          setUploadingToYouTube(false);
          if (nextJob.status === "cancelled") toast("Upload cancelled.");
          else toast.error(nextJob.error || "YouTube upload failed.");
          setCurrentUploadJob(null);
        }
      } catch (error) {
        console.error("Failed to poll upload job", error);
        failedPolls += 1;
        if (
          error?.response?.status === 404 ||
          error?.response?.status === 401 ||
          error?.response?.status === 403 ||
          failedPolls >= 3
        ) {
          window.clearInterval(interval);
          setUploadingToYouTube(false);
          setCurrentUploadJob(null);
          toast.error("Lost connection to the upload job. Refresh and check your recent uploads.");
        }
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [API, currentUploadJob]);

  useEffect(() => {
    if (hasAudioReady && hasImageReady && !studioOpen && !studioDismissed) {
      toast.success("Files ready! Opening Upload Studio...", { duration: 2000 });
      setStudioOpen(true);
    }
  }, [hasAudioReady, hasImageReady, studioOpen, studioDismissed]);

  useEffect(() => {
    setStudioDismissed(false);
  }, [studioAssetSignature]);

  const closeStudio = () => {
    setMobileDrawerOpen(false);
    setStudioDismissed(true);
    setStudioOpen(false);
  };

  useEffect(() => {
    if (!audioFileId || !imageFileId) return;
    if (!selectedDescriptionId) return;
    if (beatMetaPromptShown) return;
    if (String(uploadBeatBpm || "").trim() && String(uploadBeatKey || "").trim()) return;
    setShowBeatMetaDialog(true);
    setBeatMetaPromptShown(true);
  }, [audioFileId, imageFileId, selectedDescriptionId, beatMetaPromptShown, uploadBeatBpm, uploadBeatKey]);

  // --- Controls Markup ---
  const uploadChecklist = [
    { label: "Title", ok: Boolean(uploadTitle?.trim()) && uploadTitle.length <= 100 },
    { label: "Description", ok: Boolean(selectedDescriptionId || uploadDescriptionText.trim()) },
    ...(publishAt ? [{ label: "Schedule", ok: !scheduleError(publishAt) }] : []),
    { label: "Tags", ok: Boolean(selectedTagsId), optional: true },
  ];
  const controlsMarkup = (
    <div className="us-panel">
        {activeUploadJob && (
          <div className="border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Upload Job Progress
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {uploadJobStage}
                </p>
              </div>
              <div className="text-right">
                <button type="button" className="smb-btn smb-btn--sm us-cancel-btn" onClick={cancelUpload} disabled={cancellingUpload || activeUploadJob?.cancel_requested}>
                  {cancellingUpload || activeUploadJob?.cancel_requested ? "Cancelling…" : "Cancel upload"}
                </button>
                <p className="text-sm font-semibold text-[var(--accent-primary)]">{uploadJobProgress}%</p>
                {hasEncodeProgress && isEncodingStage ? (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Encode {uploadJobEncodeProgress}%
                  </p>
                ) : null}
                {uploadJobElapsed && (
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    Running {uploadJobElapsed}
                  </p>
                )}
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden bg-[var(--bg-tertiary)]">
              <div
                className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                style={{ width: `${uploadJobProgress}%` }}
              />
            </div>
            {hasEncodeProgress && isEncodingStage ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-secondary)" }}>
                  <span>Encoding progress</span>
                  <span>{uploadJobEncodeProgress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-primary)]/80 transition-all duration-300"
                    style={{ width: `${uploadJobEncodeProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
              <span className={uploadJobStageKey === "queued" ? "text-[var(--accent-primary)] font-medium" : ""}>
                Queued
              </span>
              <span>></span>
              <span className={uploadJobStageKey === "oauth_refresh" ? "text-[var(--accent-primary)] font-medium" : ""}>
                Token Refresh
              </span>
              <span>></span>
              <span className={isEncodingStage ? "text-[var(--accent-primary)] font-medium" : ""}>
                Encode
              </span>
              <span>></span>
              <span className={isYouTubeUploadStage ? "text-[var(--accent-primary)] font-medium" : ""}>
                Upload
              </span>
            </div>
          </div>
        )}

        <MetadataEditor
          uploadTitle={uploadTitle}
          setUploadTitle={setUploadTitle}
          descriptions={descriptions}
          selectedDescriptionId={selectedDescriptionId}
          setSelectedDescriptionId={setSelectedDescriptionId}
          tagHistory={tagHistory}
          selectedTagsId={selectedTagsId}
          setSelectedTagsId={setSelectedTagsId}
          uploadDescriptionText={uploadDescriptionText}
          setUploadDescriptionText={setUploadDescriptionText}
          privacyStatus={privacyStatus}
          setPrivacyStatus={setPrivacyStatus}
          beatName={(audioFile?.name || "").replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim()}
          onBuildDescription={buildDescriptionFromTags}
          publishOptions={{
            publishAt,
            setPublishAt,
            playlistMode,
            setPlaylistMode,
            defaultLanguage,
            setDefaultLanguage,
            thumbnailName,
            onPickThumbnail: handleThumbnailPick,
            onClearThumbnail: () => {
              setThumbnailFileId("");
              setThumbnailName("");
            },
            uploadingThumbnail,
            playlistsAllowed: Boolean(youtubeExtras.playlists_allowed),
            customThumbnailsAllowed: youtubeExtras.custom_thumbnails_allowed,
            onAllowPlaylists: allowPlaylists,
          }}
        />

        <ImageEditorControls
          imageSettingsOpen={imageSettingsOpen}
          setImageSettingsOpen={setImageSettingsOpen}
          applyImageSettings={applyImageSettings}
          handleImageUpload={handleImageUpload}
          studioImageInputRef={studioImageInputRef}
          transform={imageTransform}
          setTransform={setImageTransform}
          pushHistory={pushTransformHistory}
          undo={undoTransform}
          redo={redoTransform}
          canUndo={historySize.past > 0}
          canRedo={historySize.future > 0}
          lockImageScale={lockImageScale}
          setLockImageScale={setLockImageScale}
          centerLockEnabled={centerLockEnabled}
          setCenterLockEnabled={setCenterLockEnabled}
          imageRatio={imageMeta.ratio}
          frameRatio={previewDims.width / Math.max(1, previewDims.height)}
        />

        <LayoutSettings
          videoAspectRatio={videoAspectRatio}
          setVideoAspectRatio={setVideoAspectRatio}
          videoRenderFps={videoRenderFps}
          setVideoRenderFps={setVideoRenderFps}
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
          removeWatermark={removeWatermark}
          setRemoveWatermark={setRemoveWatermark}
          visualizerEnabled={visualizerEnabled}
          isAnimatedVisual={isAnimatedVisual}
          subscriptionStatus={subscriptionStatus}
          onUpgrade={onUpgrade}
          imagePreviewUrl={imagePreviewUrl}
        />

        <VisualizerSettings
          subscriptionStatus={subscriptionStatus}
          visualizerEnabled={visualizerEnabled}
          setVisualizerEnabled={setVisualizerEnabled}
          visualizerSettings={visualizerSettings}
          setVisualizerSettings={setVisualizerSettings}
          applyVisualizerPreset={applyVisualizerPreset}
          handleCenterVisualizerImageUpload={handleCenterVisualizerImageUpload}
          centerVisualizerImageName={centerVisualizerImageName}
          centerVisualizerImageInputRef={centerVisualizerImageInputRef}
        />

        <AIToolsPanel
          showTools={showTools}
          setShowTools={setShowTools}
          analyzingBeat={analyzingBeat}
          handleAnalyzeBeat={handleAnalyzeBeat}
          canAnalyzeBeat={Boolean(subscriptionStatus?.is_subscribed)}
          checkingThumbnail={checkingThumbnail}
          handleThumbnailCheck={handleThumbnailCheck}
          beatAnalysis={beatAnalysis}
          thumbnailCheckResult={thumbnailCheckResult}
          onUpgrade={onUpgrade}
        />

        {/* Pinned to the bottom of the panel: what's still missing, and the upload button. */}
        <div className="us-upload-bar">
          <ul className="us-ready" aria-label="Ready to upload">
            {uploadChecklist.map((item) => (
              <li key={item.label} className={item.ok ? "is-ok" : item.optional ? "is-optional" : ""}>
                {item.ok ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <span className="us-ready-dot" aria-hidden="true" />}
                {item.label}
              </li>
            ))}
          </ul>
          <div className="us-upload-actions">
          <button type="button" className="smb-btn smb-btn--pri smb-btn--lg us-upload-btn" onClick={handleYouTubeUploadAsync} disabled={uploadingToYouTube}>
            <Youtube className="h-5 w-5" aria-hidden="true" />
            {vizBakeStatus === "rendering"
              ? `Rendering visualizer ${Math.round(vizBakeProgress * 100)}%`
              : vizBakeStatus === "recording"
                ? `Recording visualizer ${Math.round(vizBakeProgress * 100)}%`
                : vizBakeStatus === "uploading"
                  ? `Uploading video ${Math.round(vizBakeProgress * 100)}%`
                  : uploadingToYouTube
                    ? "Uploading…"
                    : `Upload to YouTube${privacyStatus !== "public" ? ` · ${privacyStatus}` : ""}`}
          </button>
          {uploadingToYouTube || vizBakeStatus ? (
            <button type="button" className="smb-btn smb-btn--lg us-cancel-btn" onClick={cancelUpload} disabled={cancellingUpload || activeUploadJob?.cancel_requested}>
              {cancellingUpload || activeUploadJob?.cancel_requested ? "Cancelling…" : "Cancel"}
            </button>
          ) : null}
          </div>
        </div>
    </div>
  );

  // --- Rendering ---

  if (!studioOpen) {
    return (
      <UploadDashboard
        youtubeConnected={youtubeConnected}
        youtubeName={youtubeName}
        youtubeEmail={youtubeEmail}
        onDisconnectYouTube={onDisconnectYouTube}
        onConnectYouTube={onConnectYouTube}
        handleAudioUpload={handleAudioUpload}
        handleImageUpload={handleImageUpload}
        uploadingAudio={uploadingAudio}
        uploadProgress={uploadProgress}
        audioFile={audioFile}
        uploadingImage={uploadingImage}
        imageFile={imageFile}
        selectedImageLabel={selectedImageLabel}
        hasImageReady={hasImageReady}
        isAudioDragActive={isAudioDragActive}
        setIsAudioDragActive={setIsAudioDragActive}
        isImageDragActive={isImageDragActive}
        setIsImageDragActive={setIsImageDragActive}
        setStudioOpen={setStudioOpen}
        currentUploadJob={currentUploadJob}
        uploadJobProgress={uploadJobProgress}
        uploadJobElapsed={uploadJobElapsed}
        uploadJobStage={uploadJobStage}
      />
    );
  }

  // --- STUDIO OVERLAY (SPLIT VIEW) ---
  // The studio covers the whole window. It is rendered on <body> because the page's panels
  // animate with transforms, and a transformed ancestor would trap a fixed overlay inside it.
  return createPortal(
    <div className={`fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-300`}>
      {audioPreviewUrl && <audio ref={audioPlayerRef} src={audioPreviewUrl} preload="metadata" />}

      {/* Header */}
      <header className="us-topbar">
         <button type="button" className="us-back" onClick={closeStudio} aria-label="Leave Upload Studio">
            <X className="h-4 w-4" aria-hidden="true" />
         </button>
         <div className="us-topbar-title">
            <b>Upload Studio</b>
            <span className="us-topbar-files">
               {audioFile?.name ? <span title={audioFile.name}><Music2 className="h-3.5 w-3.5" aria-hidden="true" />{audioFile.name}</span> : null}
               {selectedImageLabel ? <span title={selectedImageLabel}><ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />{selectedImageLabel}</span> : null}
            </span>
         </div>
         <button type="button" className="smb-btn smb-btn--sec smb-btn--sm us-topbar-exit" onClick={closeStudio}>
            Leave studio
         </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
         {!youtubeConnected && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/88 px-4">
               <Card className="w-full max-w-md border border-[var(--border-color)] bg-[var(--card-bg)]">
                  <CardHeader className="text-center">
                     <CardTitle className="flex items-center justify-center gap-2 text-lg">
                        <Youtube className="h-5 w-5 text-[var(--accent-primary)]" />
                        Connect YouTube To Allow Uploads
                     </CardTitle>
                     <CardDescription>
                        Connect your YouTube account before uploading audio, artwork, or editing this upload.
                     </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     <Button className="w-full" onClick={onConnectYouTube}>
                        Connect YouTube Account
                     </Button>
                     <p className="text-center text-xs" style={{ color: "var(--text-secondary)" }}>
                        This keeps the upload flow tied to the channel you will publish from.
                     </p>
                  </CardContent>
               </Card>
            </div>
         )}

         {/* Preview Section */}
         <div className={`
             us-stage relative flex flex-col items-center justify-center transition-all duration-300
             ${isMobile ? "absolute inset-0 z-10 w-full h-full" : "flex-none lg:flex-1 lg:w-1/2 lg:border-r z-20"}
         `}>
            {/* The frame clips the picture; the editor sits beside it and reaches past its edges. */}
            <div className="relative" style={{ width: previewDims.width, height: previewDims.height }}>
            <div
               ref={previewContainerRef}
               className="relative shadow-2xl overflow-hidden border border-border/50 rounded-md"
               style={{
                 width: previewDims.width,
                 height: previewDims.height,
                 backgroundColor: backgroundColor === "white" ? "white" : "black",
                 touchAction: "none"
               }}
               onMouseDown={handleDragStart}
               onTouchStart={handleTouchStart}
               onClick={handlePreviewClick}
            >
               {/* Background + artwork: one layer, so the visualizer can zoom it on the kick. */}
               <div ref={previewBackdropRef} className="absolute inset-0" style={{ transformOrigin: "center center" }}>
               {previewUsesBlurredBackground && (
                  <img
                    src={imagePreviewUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
                    style={{
                      filter: "blur(18px)",
                      transform: "scale(1.08)",
                      opacity: backgroundColor === "white" ? 0.55 : 0.72,
                    }}
                  />
               )}
               <div
                  className="absolute left-1/2 top-1/2"
                  style={{
                     width: "100%",
                     height: "100%",
                     transform: getPreviewImageTransform({
                       imagePosX,
                       imagePosY,
                       imageScaleX,
                       imageScaleY,
                       imageRotation,
                       imageFlipH,
                       imageFlipV,
                     }),
                     transformOrigin: "center center",
                     transition: imageSettingsOpen || dragState || pinchState ? "none" : "transform 0.1s ease-out"
                  }}
               >
                  <img
                    src={imagePreviewUrl}
                    alt="preview"
                    className="upload-preview-image w-full h-full object-contain pointer-events-none select-none"
                    style={{ opacity: visualizerEnabled ? visualizerSettings.backgroundOpacity : 1 }}
                  />
               </div>
               </div>


               <VisualizerCanvas
                 visualizerRef={visualizerRef}
                 audioPlayerRef={audioPlayerRef}
                 visualizerEnabled={visualizerEnabled}
                 visualizerSettings={visualizerSettings}
                 studioOpen={studioOpen}
                 previewDims={previewDims}
                 analysis={beatSpectrum}
                 beatTrack={beatTrack}
                 aspectRatio={videoAspectRatio}
                 backdropRef={previewBackdropRef}
                 audioPreviewUrl={audioPreviewUrl}
                 imagePreviewUrl={imagePreviewUrl}
                 centerVisualizerImageUrl={centerVisualizerImageUrl}
                 spectrumRecordImageUrl={spectrumRecordImageUrl}
               />

               {visualizerEnabled && isPremiumMode(visualizerSettings.mode) && !canUsePremiumVisualizers(subscriptionStatus) ? (
                  <button type="button" className="viz-pro-chip" onClick={onUpgrade}>
                     Premium style · Upgrade to upload
                  </button>
               ) : null}

               {!subscriptionStatus?.is_subscribed && !removeWatermark && (() => {
                  // Same size and place as the server draws it: 20px text on a 1280-wide frame,
                  // 8px padding, 20px from the corner; 16:9 renders at 1920 wide, the rest at 1080.
                  const targetW = previewDims.width > previewDims.height * 1.2 ? 1920 : 1080;
                  const k = Math.max(1, targetW / 1280) * (previewDims.width / targetW);
                  const fontSize = 20 * k;
                  const pad = 8 * k;
                  return (
                  <div
                     className="upload-watermark-marquee pointer-events-none"
                     style={{
                        left: 20 * k - pad,
                        top: 20 * k - pad,
                        width: Math.min(fontSize * 28.7 + pad * 2, previewDims.width - (20 * k - pad) * 2),
                        padding: pad,
                        fontSize,
                        '--wm-gap': `${60 * k}px`,
                     }}
                  >
                        <div className="upload-watermark-track">
                           <span className="upload-watermark-text">
                              Upload your beats online: https://sendmybeat.com
                           </span>
                           <span className="upload-watermark-text" aria-hidden="true">
                              Upload your beats online: https://sendmybeat.com
                           </span>
                        </div>
                  </div>
                  );
               })()}
            </div>
               {imageSettingsOpen && imagePreviewUrl ? (
                  <FreeTransform
                    frameW={previewDims.width}
                    frameH={previewDims.height}
                    imageUrl={imagePreviewUrl}
                    pad={40}
                    imageRatio={imageMeta.ratio}
                    value={imageTransform}
                    lockAspect={lockImageScale}
                    onChange={setImageTransform}
                    onGestureStart={pushTransformHistory}
                    onUndo={undoTransform}
                    onRedo={redoTransform}
                  />
               ) : null}
            </div>

            <div className={`
                mt-4 w-full max-w-xs sm:max-w-md flex items-center gap-3 bg-black/60 p-2 rounded-full backdrop-blur-md border border-white/20 shadow-lg
                ${isMobile ? "absolute bottom-24 z-30" : "relative z-20"}
            `}>
               <Button
                 size="icon"
                 variant="ghost"
                 className="h-8 w-8 rounded-full bg-white/15 text-white hover:bg-white/25"
                 onClick={toggleAudioPlayback}
               >
                  {isAudioPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
               </Button>
               <div className="flex-1 space-y-1">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, audioDuration || 0)}
                    step={0.01}
                    value={Math.max(0, Math.min(audioCurrentTime || 0, audioDuration || 0))}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="studio-slider studio-slider-purple"
                  />
                  <div className="flex justify-between text-[11px] text-white/90 font-mono">
                     <span>{formatTime(audioCurrentTime)}</span>
                     <span>{formatTime(audioDuration)}</span>
                  </div>
               </div>
            </div>

            {!isMobile ? (
              <span className="us-stage-meta">
                <i aria-hidden="true" />
                {outputDimsFor(videoAspectRatio).join(" × ")} · {videoAspectRatio} · {visualizerEnabled ? `${Number(videoRenderFps) === 60 ? 60 : 30} fps` : `${videoRenderFps} fps`}
              </span>
            ) : null}
            <p className={`text-[10px] text-muted-foreground mt-2 text-center lg:mb-0 ${isMobile ? "hidden" : ""}`}>{imageSettingsOpen ? "Transform: drag to move • handles stretch and scale • knob rotates • Ctrl+Z undoes" : "Click preview or press Space to Play/Pause • Open Image › Transform to edit the picture"}</p>

            {/* Mobile Toggle Button */}
            {isMobile && (
                <div className="absolute bottom-6 z-40 w-full flex justify-center">
                    <Button
                        size="lg"
                        className="rounded-full shadow-xl bg-primary text-primary-foreground font-bold px-8 animate-in slide-in-from-bottom-8"
                        onClick={() => setMobileDrawerOpen(true)}
                    >
                        <SlidersHorizontal className="mr-2 h-5 w-5" /> Open Controls
                    </Button>
                </div>
            )}
         </div>

         {/* Controls Section: Desktop (Sidebar) vs Mobile (Drawer) */}
         {isMobile ? (
             // repositionInputs off: the drawer's own keyboard handling moves and resizes it on iPhone
             // Safari and leaves the field you tapped off screen. Safari's own scrolling, plus the
             // focus handler below, keeps the field in view instead.
             <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen} repositionInputs={false}>
                <DrawerContent className="us-drawer border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)]">
                    <DrawerHeader>
                        <DrawerTitle>Upload settings</DrawerTitle>
                        <DrawerDescription>Details, image, video and visualizer</DrawerDescription>
                    </DrawerHeader>
                    <div className="us-drawer-body flex-1 min-h-0 px-4 pb-8 overflow-y-auto overscroll-contain bg-[var(--card-bg)] text-[var(--text-primary)]" onFocus={keepFieldInView}>
                       {controlsMarkup}
                    </div>
                </DrawerContent>
            </Drawer>
         ) : (
             <div className="us-side">
                 {controlsMarkup}
             </div>
         )}
      </div>
      <Dialog open={showBeatMetaDialog} onOpenChange={setShowBeatMetaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Beat Metadata</DialogTitle>
            <DialogDescription>
              Add BPM and Key once now. We will append it to your upload description automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="BPM (e.g. 140)"
              value={uploadBeatBpm}
              onChange={(e) => setUploadBeatBpm(e.target.value)}
            />
            <Input
              placeholder="Key (e.g. C# Min)"
              value={uploadBeatKey}
              onChange={(e) => setUploadBeatKey(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  applyBeatMetaToDescription();
                  setShowBeatMetaDialog(false);
                }}
              >
                Save & Continue
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowBeatMetaDialog(false)}>
                Skip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    ,
    document.body
  );
};

export default UploadStudio;
