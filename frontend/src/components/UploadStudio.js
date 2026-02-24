import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Play, Pause, X, SlidersHorizontal, Youtube
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
import {
  AUDIO_EXTENSIONS,
  AUDIO_MIME_TYPES,
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  DEFAULT_VISUALIZER_SETTINGS,
  VISUALIZER_PRESETS
} from "@/lib/constants";


import UploadDashboard from "./upload-studio/UploadDashboard";
import MetadataEditor from "./upload-studio/MetadataEditor";
import AIToolsPanel from "./upload-studio/AIToolsPanel";
import VisualizerSettings from "./upload-studio/VisualizerSettings";
import ImageEditorControls from "./upload-studio/ImageEditorControls";
import LayoutSettings from "./upload-studio/LayoutSettings";
import VisualizerCanvas from "./upload-studio/VisualizerCanvas";

const UploadStudio = ({
  user,
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
  onConnectYouTube,
  onExitUploadTab
}) => {
  // --- State ---
  const [studioOpen, setStudioOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Files
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [audioFileId, setAudioFileId] = useState("");
  const [imageFileId, setImageFileId] = useState("");
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

  // AI Tools State
  const [beatAnalysis, setBeatAnalysis] = useState(null);
  const [analyzingBeat, setAnalyzingBeat] = useState(false);
  const [thumbnailCheckResult, setThumbnailCheckResult] = useState(null);
  const [checkingThumbnail, setCheckingThumbnail] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [generatedImageQuery, setGeneratedImageQuery] = useState("");
  const [generatingImages, setGeneratingImages] = useState(false);
  const [showTools, setShowTools] = useState(false);

  // Visual Settings
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [backgroundColor, setBackgroundColor] = useState("black");
  const [removeWatermark, setRemoveWatermark] = useState(false);

  // Image Layout
  const [imageScaleX, setImageScaleX] = useState(1);
  const [imageScaleY, setImageScaleY] = useState(1);
  const [lockImageScale, setLockImageScale] = useState(true);
  const [imagePosX, setImagePosX] = useState(0);
  const [imagePosY, setImagePosY] = useState(0);
  const [imageRotation, setImageRotation] = useState(0);
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
    setLockImageScale(true);
    setCenterLockEnabled(false);
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

      const ratioMap = { "16:9": 1.777, "9:16": 0.5625, "1:1": 1, "4:5": 0.8 };
      const targetRatio = ratioMap[videoAspectRatio] || 1.777;

      const maxWidth = mobile ? window.innerWidth : (window.innerWidth / 2) - 64;
      const maxHeight = mobile ? window.innerHeight : (window.innerHeight - 150);

      let width = Math.min(maxWidth, 800);
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
      if (visualizerEnabled && visualizerRef.current) {
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

    // Force metadata read for object URLs and initial sync
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
  }, [audioPreviewUrl, visualizerEnabled, studioOpen]);

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
          const newScale = Math.min(2.0, Math.max(0.1, pinchState.startScale * scaleFactor));

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
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${API}/upload/image`, formData, {
      });
      setImageFile(file);
      setImageFileId(response.data.file_id);
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
      toast.success("Image ready!");
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
    setVisualizerSettings((s) => {
      if (preset === "ncs-clean") {
        return {
          ...s,
          ...VISUALIZER_PRESETS["ncs-clean"],
          spectrumBorderEnabled: s.fillCenter !== "transparent",
        };
      }
      if (preset === "ncs-aggressive") {
        return {
          ...s,
          ...VISUALIZER_PRESETS["ncs-aggressive"],
          spectrumBorderEnabled: s.fillCenter !== "transparent",
        };
      }
      if (preset === "monstercat-tight") {
        return {
          ...s,
          ...VISUALIZER_PRESETS["monstercat-tight"],
        };
      }
      return s;
    });
    toast.success(
      preset === "ncs-clean"
        ? "Applied preset: NCS Clean"
        : preset === "ncs-aggressive"
          ? "Applied preset: NCS Aggressive"
          : "Applied preset: Monstercat Tight"
    );
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

    setAnalyzingBeat(true);
    try {
      const response = await axios.post(`${API}/beat/analyze`, {
        title: uploadTitle,
        tags: tags,
        description: uploadDescriptionText || ""
      });
      setBeatAnalysis(response.data);
      toast.success(`Analysis: ${response.data.overall_score}/100`);
    } catch (error) {
      toast.error("Analysis failed");
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
      setThumbnailCheckResult(response.data);
      setThumbnailProgress(100);
      toast.success("Thumbnail Checked!");
    } catch (error) {
      if (error?.code !== "ERR_CANCELED") {
         if (error.response?.status === 402) {
            toast.error("Daily limit reached! Upgrade to continue.");
            onUpgrade();
         } else if (error.response?.data?.detail) {
            toast.error(typeof error.response.data.detail === "string" ? error.response.data.detail : "Thumbnail check failed");
         } else {
            toast.error("Thumbnail check failed");
         }
      }
    } finally {
      if (thumbnailProgressIntervalRef.current) clearInterval(thumbnailProgressIntervalRef.current);
      setCheckingThumbnail(false);
    }
  };

  const handleGenerateImage = async () => {
    const safeTitle = (uploadTitle || "").trim();
    const tags = tagHistory.find(t => t.id === selectedTagsId)?.tags || [];
    const safeTags = tags.filter(Boolean).map((t) => String(t).trim()).filter(Boolean);

    if (!safeTitle && !safeTags.length) {
      toast.error("Add a title or select tags first.");
      return;
    }

    setGeneratingImages(true);
    try {
      const response = await axios.post(`${API}/beat/generate-image`, {
        title: safeTitle,
        tags: safeTags,
        k: 6,
      });
      const results = response.data?.results || [];
      setGeneratedImages(results);
      setGeneratedImageQuery(response.data?.query_used || "");
      if (!results.length) {
        toast.error("No image results found. Try a different artist/title.");
      } else {
        toast.success("Image options generated. Click one to apply.");
      }
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to generate image options");
    } finally {
      setGeneratingImages(false);
    }
  };

  const handleUseGeneratedImage = async (imageOption) => {
    if (!imageOption?.image_url) {
      toast.error("Invalid generated image");
      return;
    }
    setUploadingImage(true);
    try {
      const imported = await axios.post(`${API}/upload/image-from-url`, {
        image_url: imageOption.image_url,
        original_filename: `${(imageOption.artist || "generated").replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}-reference.jpg`,
      });
      setImageFile(null);
      setImageFileId(imported.data.file_id);
      setImagePreviewUrl(imageOption.image_url);
      setBeatMetaPromptShown(false);
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        setImageMeta({ width: img.width, height: img.height, ratio });
      };
      img.src = imageOption.image_url;
      fitImageToFrame();
      setCenterLockEnabled(false);
      toast.success("Generated image applied.");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to apply generated image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleYouTubeUpload = async () => {
    if (!uploadTitle || !selectedDescriptionId || !audioFileId || !imageFileId) {
      toast.error("Please fill title, description, and ensure files are uploaded.");
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
    formData.append('audio_file_id', audioFileId);
    formData.append('image_file_id', imageFileId);
    formData.append('remove_watermark', removeWatermark);
    formData.append('description_override', buildUploadDescriptionWithMetadata());
    formData.append('aspect_ratio', videoAspectRatio);
    formData.append('image_scale', String(lockImageScale ? imageScaleX : (imageScaleX + imageScaleY) / 2));
    formData.append('image_scale_x', String(imageScaleX));
    formData.append('image_scale_y', String(imageScaleY));
    formData.append('image_pos_x', String(imagePosX));
    formData.append('image_pos_y', String(imagePosY));
    formData.append('image_rotation', String(imageRotation));
    formData.append('background_color', backgroundColor);

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
      setStudioOpen(false);
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
        toast.error("Upload failed. Check connection or file size.");
      }
    } finally {
      setUploadingToYouTube(false);
      setUploadController(null);
    }
  };

  useEffect(() => {
    if (audioFile && imageFile && !studioOpen) {
      toast.success("Files ready! Opening Upload Studio...", { duration: 2000 });
      setStudioOpen(true);
    }
  }, [audioFile, imageFile]);

  useEffect(() => {
    if (!audioFileId || !imageFileId) return;
    if (!selectedDescriptionId) return;
    if (beatMetaPromptShown) return;
    if (String(uploadBeatBpm || "").trim() && String(uploadBeatKey || "").trim()) return;
    setShowBeatMetaDialog(true);
    setBeatMetaPromptShown(true);
  }, [audioFileId, imageFileId, selectedDescriptionId, beatMetaPromptShown, uploadBeatBpm, uploadBeatKey]);

  // --- Controls Markup ---
  const controlsMarkup = (
    <div className="space-y-6 pb-20 lg:pb-6">
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
        />

        <AIToolsPanel
          showTools={showTools}
          setShowTools={setShowTools}
          analyzingBeat={analyzingBeat}
          handleAnalyzeBeat={handleAnalyzeBeat}
          checkingThumbnail={checkingThumbnail}
          handleThumbnailCheck={handleThumbnailCheck}
          generatingImages={generatingImages}
          handleGenerateImage={handleGenerateImage}
          generatedImages={generatedImages}
          generatedImageQuery={generatedImageQuery}
          onUseGeneratedImage={handleUseGeneratedImage}
          beatAnalysis={beatAnalysis}
          thumbnailCheckResult={thumbnailCheckResult}
        />

        <VisualizerSettings
          visualizerEnabled={visualizerEnabled}
          setVisualizerEnabled={setVisualizerEnabled}
          visualizerSettings={visualizerSettings}
          setVisualizerSettings={setVisualizerSettings}
          applyVisualizerPreset={applyVisualizerPreset}
          handleCenterVisualizerImageUpload={handleCenterVisualizerImageUpload}
          centerVisualizerImageName={centerVisualizerImageName}
          centerVisualizerImageInputRef={centerVisualizerImageInputRef}
        />

        <ImageEditorControls
          imageSettingsOpen={imageSettingsOpen}
          setImageSettingsOpen={setImageSettingsOpen}
          applyImageSettings={applyImageSettings}
          handleImageUpload={handleImageUpload}
          studioImageInputRef={studioImageInputRef}
          imageScaleX={imageScaleX}
          setImageScaleX={setImageScaleX}
          setImageScaleY={setImageScaleY}
          lockImageScale={lockImageScale}
          imageRotation={imageRotation}
          setImageRotation={setImageRotation}
          fitImageToFrame={fitImageToFrame}
          centerImagePosition={centerImagePosition}
          centerLockEnabled={centerLockEnabled}
          setCenterLockEnabled={setCenterLockEnabled}
        />

        <LayoutSettings
          videoAspectRatio={videoAspectRatio}
          setVideoAspectRatio={setVideoAspectRatio}
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
          removeWatermark={removeWatermark}
          setRemoveWatermark={setRemoveWatermark}
          subscriptionStatus={subscriptionStatus}
          onUpgrade={onUpgrade}
        />

        <div className="pt-4">
           <Button
              size="lg"
              className="w-full text-lg shadow-xl shadow-red-500/20 bg-red-600 hover:bg-red-700"
              onClick={handleYouTubeUpload}
              disabled={uploadingToYouTube}
           >
              {uploadingToYouTube ? "Uploading..." : "Upload Video to YouTube"}
              {!uploadingToYouTube && <Youtube className="ml-2 h-5 w-5" />}
           </Button>
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
        onExitUploadTab={onExitUploadTab}
        handleAudioUpload={handleAudioUpload}
        handleImageUpload={handleImageUpload}
        uploadingAudio={uploadingAudio}
        uploadProgress={uploadProgress}
        audioFile={audioFile}
        uploadingImage={uploadingImage}
        imageFile={imageFile}
        isAudioDragActive={isAudioDragActive}
        setIsAudioDragActive={setIsAudioDragActive}
        isImageDragActive={isImageDragActive}
        setIsImageDragActive={setIsImageDragActive}
        setStudioOpen={setStudioOpen}
      />
    );
  }

  // --- STUDIO OVERLAY (SPLIT VIEW) ---
  return (
    <div className={`fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      {audioPreviewUrl && <audio ref={audioPlayerRef} src={audioPreviewUrl} preload="metadata" />}

      {/* Header */}
      <div className="flex-none h-14 border-b bg-background/50 backdrop-blur px-4 flex items-center justify-between z-50">
         <div className="flex items-center gap-2">
            <span className="font-bold text-lg gradient-text">Upload Studio</span>
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground hidden sm:inline-block">Beta</span>
         </div>
         <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onExitUploadTab?.()}>
               Exit Upload Tab
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setStudioOpen(false)}>
               <X className="h-5 w-5" />
            </Button>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">

         {/* Preview Section */}
         <div className={`
             relative bg-background/50 flex flex-col items-center justify-center transition-all duration-300
             ${isMobile ? "absolute inset-0 z-10 w-full h-full" : "flex-none lg:flex-1 lg:w-1/2 lg:border-r z-20"}
         `}>
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
               <div
                  className="absolute left-1/2 top-1/2"
                  style={{
                     width: "100%",
                     height: "100%",
                     transform: `translate(calc(-50% + ${imagePosX * 50}%), calc(-50% + ${imagePosY * 50}%)) scale(${imageScaleX}, ${lockImageScale ? imageScaleX : imageScaleY}) rotate(${imageRotation}deg)`,
                     transformOrigin: "center center",
                     transition: dragState || pinchState ? "none" : "transform 0.1s ease-out"
                  }}
               >
                  <img
                    src={imagePreviewUrl}
                    alt="preview"
                    className="upload-preview-image w-full h-full object-contain pointer-events-none select-none"
                    style={{ opacity: visualizerEnabled ? visualizerSettings.backgroundOpacity : 1 }}
                  />
               </div>

               {imageSettingsOpen && (
                  <div className="absolute inset-0 pointer-events-none">
                     {(centerLockEnabled || Math.abs(imagePosX) < 0.03) && (
                       <div
                          className="absolute left-1/2 top-0 h-full w-px bg-amber-400/90"
                          style={{ transform: "translateX(-50%)" }}
                       />
                     )}
                     {(centerLockEnabled || Math.abs(imagePosY) < 0.03) && (
                       <div
                          className="absolute top-1/2 left-0 w-full h-px bg-amber-400/90"
                          style={{ transform: "translateY(-50%)" }}
                       />
                     )}
                     {(centerLockEnabled || (Math.abs(imagePosX) < 0.03 && Math.abs(imagePosY) < 0.03)) && (
                       <div
                          className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full border border-amber-300 bg-amber-400/30"
                          style={{ transform: "translate(-50%, -50%)" }}
                       />
                     )}
                  </div>
               )}

               <VisualizerCanvas
                 visualizerRef={visualizerRef}
                 audioPlayerRef={audioPlayerRef}
                 visualizerEnabled={visualizerEnabled}
                 visualizerSettings={visualizerSettings}
                 studioOpen={studioOpen}
                 previewDims={previewDims}
                 audioPreviewUrl={audioPreviewUrl}
                 imagePreviewUrl={imagePreviewUrl}
                 centerVisualizerImageUrl={centerVisualizerImageUrl}
                 spectrumRecordImageUrl={spectrumRecordImageUrl}
               />

               {!subscriptionStatus?.is_subscribed && !removeWatermark && (
                  <div className="absolute top-2 left-0 right-0 text-center pointer-events-none">
                     <div className="upload-watermark-marquee">
                        <div className="upload-watermark-track">
                           <span className="upload-watermark-text">
                              Upload your beats online: https://sendmybeat.com
                           </span>
                           <span className="upload-watermark-text" aria-hidden="true">
                              Upload your beats online: https://sendmybeat.com
                           </span>
                        </div>
                     </div>
                  </div>
               )}
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

            <p className={`text-[10px] text-muted-foreground mt-2 text-center lg:mb-0 ${isMobile ? "hidden" : ""}`}>{imageSettingsOpen ? "Edit mode: Drag to move • Pinch to zoom • Use Rotation slider" : "Click preview or press Space to Play/Pause • Open Image Settings to edit image"}</p>

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
             <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
                <DrawerContent className="max-h-[85vh] border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)]">
                    <DrawerHeader>
                        <DrawerTitle>Studio Controls</DrawerTitle>
                        <DrawerDescription>Edit metadata and settings</DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-8 overflow-y-auto bg-[var(--card-bg)] text-[var(--text-primary)]">
                       {controlsMarkup}
                    </div>
                </DrawerContent>
            </Drawer>
         ) : (
             <div className="flex-1 lg:w-1/2 overflow-y-auto p-4 sm:p-6 bg-background">
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
  );
};

export default UploadStudio;
