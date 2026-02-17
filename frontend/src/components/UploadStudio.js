import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Upload, Music, Image as ImageIcon, X, Youtube,
  CheckCircle2, AlertCircle, Play, Pause,
  Maximize2, Minimize2, Move, RotateCw, Palette,
  ChevronDown, ChevronUp, Link, Wand2, Target, Sparkles,
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import AudioVisualizer from "@/lib/AudioVisualizer";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".flac", ".ogg"];
const AUDIO_MIME_TYPES = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/flac", "audio/ogg"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"];
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];

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
  onConnectYouTube
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
  const [selectedTagsId, setSelectedTagsId] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("public");

  // AI Tools State
  const [beatAnalysis, setBeatAnalysis] = useState(null);
  const [analyzingBeat, setAnalyzingBeat] = useState(false);
  const [thumbnailCheckResult, setThumbnailCheckResult] = useState(null);
  const [checkingThumbnail, setCheckingThumbnail] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
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
  const [visualizerSettings, setVisualizerSettings] = useState({
    bars: 128,
    intensity: 1,
    particleIntensity: 1,
    monstercatParticleSpeed: 1,
    monstercatParticleSize: 1,
    rotateSpeed: 0.002,
    radius: 0.23,
    maxBarLength: 0.18,
    trailsEnabled: true,
    particleEnabled: true,
    monstercatParticleEnabled: false,
    mode: "circle",
    shakeIntensity: 1,
    multiColorReactive: false,
    backgroundOpacity: 1,
    spectrumStyle: "fill",
    fillCenter: "white",
    particleColor: "#8cc8ff",
    spectrumBorderWidth: 2,
    spectrumBorderColor: "#ffffff",
    monstercatYOffset: 20,
    lowSensitivity: 1,
    midSensitivity: 1,
    highSensitivity: 1,
    monstercatSmoothing: 0.35,
  });
  const [spectrumRecordImageUrl, setSpectrumRecordImageUrl] = useState("");
  const [spectrumRecordImageName, setSpectrumRecordImageName] = useState("");

  // Upload Process
  const [uploadingToYouTube, setUploadingToYouTube] = useState(false);
  const [uploadController, setUploadController] = useState(null);

  // Refs
  const audioPlayerRef = useRef(null);
  const visualizerRef = useRef(null);
  const visualizerCanvasRef = useRef(null);
  const previewContainerRef = useRef(null);
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

  const hexToRgbString = (hex, fallback = "255, 255, 255") => {
    const clean = (hex || "").replace("#", "");
    if (clean.length !== 6) return fallback;
    const value = Number.parseInt(clean, 16);
    if (Number.isNaN(value)) return fallback;
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `${r}, ${g}, ${b}`;
  };

  const formatTagHistoryLabel = (query = "") => {
    if (!query) return "Untitled";
    return query.replace(/\([^)]*\)/g, "").trim() || query;
  };

  const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.hypot(dx, dy);
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
    setUploadDescriptionText(selectedDesc?.content || "");
  }, [selectedDescriptionId, descriptions]);

  useEffect(() => {
    const audioEl = audioPlayerRef.current;
    if (!audioEl || !audioPreviewUrl) return;

    const handleTimeUpdate = () => setAudioCurrentTime(audioEl.currentTime || 0);
    const handleLoadedMetadata = () => setAudioDuration(audioEl.duration || 0);
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

    audioEl.addEventListener("timeupdate", handleTimeUpdate);
    audioEl.addEventListener("loadedmetadata", handleLoadedMetadata);
    audioEl.addEventListener("play", handlePlay);
    audioEl.addEventListener("pause", handlePause);
    audioEl.addEventListener("ended", handleEnded);

    // Backup polling for time update
    const poll = setInterval(() => {
        if (audioEl && !audioEl.paused) setAudioCurrentTime(audioEl.currentTime);
    }, 200);

    return () => {
      clearInterval(poll);
      audioEl.removeEventListener("timeupdate", handleTimeUpdate);
      audioEl.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audioEl.removeEventListener("play", handlePlay);
      audioEl.removeEventListener("pause", handlePause);
      audioEl.removeEventListener("ended", handleEnded);
    };
  }, [audioPreviewUrl, visualizerEnabled]);

  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    const audioEl = audioPlayerRef.current;

    if (!canvas || !audioEl || !visualizerEnabled) {
      if (visualizerRef.current) {
        visualizerRef.current.stop();
        const ctx = canvas?.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const options = getVisualizerOptions();

    if (!visualizerRef.current) {
      visualizerRef.current = new AudioVisualizer(canvas, options);
    } else {
      visualizerRef.current.attachCanvas(canvas);
      visualizerRef.current.setOptions(options);
    }

    const initViz = async () => {
      try {
        await visualizerRef.current.connectMediaElement(audioEl);
        if (!audioEl.paused && !audioEl.ended) {
          await visualizerRef.current.resumeAudioContext();
          visualizerRef.current.start();
        }
      } catch (err) { console.error(err); }
    };
    initViz();

  }, [visualizerEnabled, audioPreviewUrl, imagePreviewUrl, visualizerSettings, studioOpen, previewDims]);

  const getVisualizerOptions = () => ({
    bars: visualizerSettings.bars,
    gain: visualizerSettings.intensity * 0.8,
    maxBarLength: visualizerSettings.maxBarLength,
    radius: visualizerSettings.radius,
    rotateSpeed: visualizerSettings.rotateSpeed,
    trailsEnabled: visualizerSettings.trailsEnabled,
    particleEnabled: visualizerSettings.particleEnabled,
    particleIntensity: visualizerSettings.particleIntensity,
    monstercatParticleEnabled: visualizerSettings.monstercatParticleEnabled,
    maxSpawnRate: Math.round(120 * visualizerSettings.particleIntensity),
    baseSpawnRate: Math.round(10 * Math.max(0.5, visualizerSettings.particleIntensity)),
    particleSpeed: 72 * visualizerSettings.particleIntensity,
    mode: visualizerSettings.mode,
    shakeIntensity: visualizerSettings.shakeIntensity * 0.7,
    multiColorReactive: visualizerSettings.multiColorReactive,
    spectrumStyle: visualizerSettings.spectrumStyle,
    fillCenter: visualizerSettings.fillCenter,
    centerImageUrl: imagePreviewUrl || "",
    particleColor: hexToRgbString(visualizerSettings.particleColor, "140, 200, 255"),
    spectrumBorderWidth: visualizerSettings.spectrumBorderWidth,
    spectrumBorderColor: hexToRgbString(visualizerSettings.spectrumBorderColor, "255, 255, 255"),
    spectrumRecordImageUrl,
    monstercatYOffset: visualizerSettings.monstercatYOffset,
    monstercatParticleSpeed: visualizerSettings.monstercatParticleSpeed,
    monstercatParticleSize: visualizerSettings.monstercatParticleSize,
    lowSensitivity: visualizerSettings.lowSensitivity,
    midSensitivity: visualizerSettings.midSensitivity,
    highSensitivity: visualizerSettings.highSensitivity,
    monstercatSmoothing: visualizerSettings.monstercatSmoothing,
  });

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
      if (dragState) {
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const rect = previewContainerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const deltaX = clientX - dragState.startX;
        const deltaY = clientY - dragState.startY;
        if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) previewDraggedRef.current = true;

        const nextX = Math.max(-1, Math.min(1, dragState.originX + deltaX / (rect.width / 2)));
        const nextY = Math.max(-1, Math.min(1, dragState.originY + deltaY / (rect.height / 2)));

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
  }, [dragState, pinchState, lockImageScale]);


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
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total))
      });
      setAudioFile(file);
      setAudioFileId(response.data.file_id);
      setAudioPreviewUrl(URL.createObjectURL(file));
      toast.success("Audio ready!");
    } catch (error) {
      toast.error("Failed to upload audio");
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
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImageFile(file);
      setImageFileId(response.data.file_id);
      const url = URL.createObjectURL(file);
      setImagePreviewUrl(url);
      const img = new Image();
      img.onload = () => {
        const ratio = img.width / img.height;
        setImageMeta({ width: img.width, height: img.height, ratio });
      };
      img.src = url;
      toast.success("Image ready!");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleAudioPlayback = async () => {
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
  };

  const handleTouchStart = (e) => {
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
    if (!imageFile) {
      toast.error("Upload an image first");
      return;
    }
    const tags = tagHistory.find(t => t.id === selectedTagsId)?.tags || [];

    setCheckingThumbnail(true);
    setThumbnailProgress(5);
    const controller = new AbortController();
    thumbnailAbortRef.current = controller;
    thumbnailProgressIntervalRef.current = setInterval(() => {
      setThumbnailProgress((prev) => (prev < 95 ? prev + 5 : prev));
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("title", uploadTitle || "Untitled Beat");
      formData.append("tags", tags.join(", "));
      formData.append("description", uploadDescriptionText || "");
      formData.append("llm_provider", "grok");

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
         } else {
            toast.error("Thumbnail check failed");
         }
      }
    } finally {
      if (thumbnailProgressIntervalRef.current) clearInterval(thumbnailProgressIntervalRef.current);
      setCheckingThumbnail(false);
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
    formData.append('description_override', uploadDescriptionText);
    formData.append('aspect_ratio', videoAspectRatio);
    formData.append('image_scale', String(lockImageScale ? imageScaleX : (imageScaleX + imageScaleY) / 2));
    formData.append('image_scale_x', String(imageScaleX));
    formData.append('image_scale_y', String(imageScaleY));
    formData.append('image_pos_x', String(imagePosX));
    formData.append('image_pos_y', String(imagePosY));
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

  // --- Controls Markup ---
  const controlsMarkup = (
    <div className="space-y-6 pb-20 lg:pb-6">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
           <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                 <Youtube className="h-4 w-4" /> Video Metadata
              </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
              <div className="space-y-2">
                 <Label>Video Title</Label>
                 <Input
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. 'Midnight Rain' - LoFi Beat"
                    className="font-medium"
                 />
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-2">
                    <Label>Template</Label>
                    <Select value={selectedDescriptionId} onValueChange={setSelectedDescriptionId}>
                       <SelectTrigger className="text-foreground">
                          <SelectValue placeholder="Select description..." />
                       </SelectTrigger>
                       <SelectContent>
                          {descriptions.map(d => (
                             <SelectItem key={d.id} value={d.id} className="text-foreground">{d.title}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label>Tags</Label>
                    <Select value={selectedTagsId} onValueChange={setSelectedTagsId}>
                       <SelectTrigger className="text-foreground">
                          <SelectValue placeholder="Select tags..." />
                       </SelectTrigger>
                       <SelectContent>
                          {tagHistory.map(t => (
                             <SelectItem key={t.id} value={t.id} className="text-foreground">{formatTagHistoryLabel(t.query)}</SelectItem>
                          ))}
                       </SelectContent>
                    </Select>
                 </div>
              </div>
              {selectedDescriptionId && (
                 <Textarea
                    value={uploadDescriptionText}
                    onChange={(e) => setUploadDescriptionText(e.target.value)}
                    rows={4}
                    className="text-xs font-mono bg-secondary/30 text-foreground"
                 />
              )}
              <div className="space-y-2">
                 <Label>Privacy</Label>
                 <Select value={privacyStatus} onValueChange={setPrivacyStatus}>
                    <SelectTrigger className="text-foreground">
                       <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="public">Public</SelectItem>
                       <SelectItem value="unlisted">Unlisted</SelectItem>
                       <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
           </CardContent>
        </Card>

        {/* AI Tools */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
           <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                 <Wand2 className="h-4 w-4" /> AI Tools
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setShowTools(!showTools)}>
                 {showTools ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
              </Button>
           </CardHeader>
           {showTools && (
              <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-3">
                    <Button
                       variant="outline"
                       onClick={handleAnalyzeBeat}
                       disabled={analyzingBeat}
                       className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                    >
                       {analyzingBeat ? "..." : <><Target className="mr-2 h-4 w-4"/> Analyze Beat</>}
                    </Button>
                    <Button
                       variant="outline"
                       onClick={handleThumbnailCheck}
                       disabled={checkingThumbnail}
                       className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    >
                       {checkingThumbnail ? "..." : <><Sparkles className="mr-2 h-4 w-4"/> Check Thumb</>}
                    </Button>
                 </div>

                 {beatAnalysis && (
                    <div className="p-3 bg-secondary/50 rounded-md text-sm space-y-2">
                       <div className="flex justify-between font-bold">
                          <span>Score: {beatAnalysis.overall_score}/100</span>
                          <span>{beatAnalysis.predicted_performance}</span>
                       </div>
                       <div className="text-xs text-muted-foreground">
                          {beatAnalysis.suggestions[0]}
                       </div>
                    </div>
                 )}
                 {thumbnailCheckResult && (
                    <div className="p-3 bg-secondary/50 rounded-md text-sm space-y-2">
                       <div className="flex justify-between font-bold">
                          <span>Score: {thumbnailCheckResult.score}/100</span>
                          <span>{thumbnailCheckResult.verdict}</span>
                       </div>
                       <div className="text-xs text-muted-foreground">
                          {thumbnailCheckResult.suggestions[0]}
                       </div>
                    </div>
                 )}
              </CardContent>
           )}
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
           <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                 <Music className="h-4 w-4" /> Audio Visualizer
              </CardTitle>
              <Button
                size="sm"
                variant={visualizerEnabled ? "default" : "outline"}
                onClick={() => setVisualizerEnabled(!visualizerEnabled)}
                className={visualizerEnabled ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                 {visualizerEnabled ? "Enabled" : "Disabled"}
              </Button>
           </CardHeader>

           {visualizerEnabled && (
           <CardContent className="space-y-5 animate-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Style</Label>
                    <Select
                       value={visualizerSettings.mode}
                       onValueChange={(v) => setVisualizerSettings(s => ({...s, mode: v}))}
                    >
                       <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
                       <SelectContent>
                          <SelectItem value="circle">Trap Nation Circle</SelectItem>
                          <SelectItem value="monstercat">Linear Bars</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                         type="color"
                         value={visualizerSettings.particleColor}
                         onChange={(e) => setVisualizerSettings(s => ({...s, particleColor: e.target.value, spectrumBorderColor: e.target.value}))}
                         className="w-10 h-10 p-1 cursor-pointer"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs whitespace-nowrap px-2"
                        onClick={() => setVisualizerSettings(s => ({...s, multiColorReactive: !s.multiColorReactive}))}
                      >
                        {visualizerSettings.multiColorReactive ? "🌈 On" : "🌈 Off"}
                      </Button>
                    </div>
                 </div>
              </div>

              <div className="space-y-4 pt-2">
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                       <Label>Reactivity / Intensity</Label>
                       <span className="text-muted-foreground">{visualizerSettings.intensity.toFixed(2)}</span>
                    </div>
                    <input
                       type="range" min="0.5" max="2.0" step="0.1"
                       value={visualizerSettings.intensity}
                       onChange={(e) => setVisualizerSettings(s => ({...s, intensity: parseFloat(e.target.value)}))}
                       className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                 </div>

                 <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                       <Label>Bar Count</Label>
                       <span className="text-muted-foreground">{visualizerSettings.bars}</span>
                    </div>
                    <input
                       type="range" min="32" max="160" step="4"
                       value={visualizerSettings.bars}
                       onChange={(e) => setVisualizerSettings(s => ({...s, bars: parseInt(e.target.value)}))}
                       className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                 </div>

                 {visualizerSettings.mode === 'circle' && (
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                             <Label>Particles</Label>
                             <span className="text-muted-foreground">{visualizerSettings.particleIntensity.toFixed(1)}</span>
                          </div>
                          <input
                             type="range" min="0" max="2" step="0.1"
                             value={visualizerSettings.particleIntensity}
                             onChange={(e) => setVisualizerSettings(s => ({...s, particleIntensity: parseFloat(e.target.value)}))}
                             className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                       </div>
                       <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                             <Label>Shake</Label>
                             <span className="text-muted-foreground">{visualizerSettings.shakeIntensity.toFixed(1)}</span>
                          </div>
                          <input
                             type="range" min="0" max="2" step="0.1"
                             value={visualizerSettings.shakeIntensity}
                             onChange={(e) => setVisualizerSettings(s => ({...s, shakeIntensity: parseFloat(e.target.value)}))}
                             className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                       </div>
                    </div>
                 )}
              </div>
           </CardContent>
           )}
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
           <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                 <ImageIcon className="h-4 w-4" /> Layout & Background
              </CardTitle>
           </CardHeader>
           <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label>Aspect Ratio</Label>
                    <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
                       <SelectTrigger className="text-foreground"><SelectValue /></SelectTrigger>
                       <SelectContent>
                          <SelectItem value="16:9">16:9 (YouTube)</SelectItem>
                          <SelectItem value="9:16">9:16 (Shorts/TikTok)</SelectItem>
                          <SelectItem value="1:1">1:1 (Square)</SelectItem>
                          <SelectItem value="4:5">4:5 (Insta)</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label>Background</Label>
                    <div className="flex border rounded-md overflow-hidden">
                       <button
                         onClick={() => setBackgroundColor("black")}
                         className={`flex-1 h-10 ${backgroundColor === "black" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
                       >
                          Black
                       </button>
                       <button
                         onClick={() => setBackgroundColor("white")}
                         className={`flex-1 h-10 border-l ${backgroundColor === "white" ? "bg-gray-200 text-black font-bold" : "bg-white text-black hover:bg-gray-100"}`}
                       >
                          White
                       </button>
                    </div>
                 </div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-xs">
                    <Label>Image Scale</Label>
                    <span className="text-muted-foreground">{imageScaleX.toFixed(2)}x</span>
                 </div>
                 <input
                    type="range" min="0.1" max="1.5" step="0.05"
                    value={imageScaleX}
                    onChange={(e) => {
                       const val = parseFloat(e.target.value);
                       setImageScaleX(val);
                       if (lockImageScale) setImageScaleY(val);
                    }}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-orange-500"
                 />
              </div>

              <div className={`flex items-center justify-between p-3 rounded-md border ${subscriptionStatus?.is_subscribed ? 'bg-green-500/10 border-green-500/30' : 'bg-secondary border-transparent'}`}>
                 <div className="flex items-center gap-2">
                    <input
                       type="checkbox"
                       id="wm-check"
                       checked={removeWatermark}
                       onChange={(e) => {
                          if (!subscriptionStatus?.is_subscribed && e.target.checked) {
                             onUpgrade();
                             return;
                             }
                             setRemoveWatermark(e.target.checked);
                       }}
                       className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="wm-check" className="text-sm font-medium cursor-pointer">Remove Watermark</label>
                 </div>
                 {!subscriptionStatus?.is_subscribed && (
                    <Button size="sm" variant="link" className="h-auto p-0 text-xs text-blue-500" onClick={onUpgrade}>
                       Upgrade to Remove
                    </Button>
                 )}
              </div>
           </CardContent>
        </Card>

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
      <Card className="dashboard-card min-h-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <Youtube className="h-5 w-5 text-red-600" />
             New Upload
          </CardTitle>
          <CardDescription>Upload audio and image to enter the studio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div className={`p-4 rounded-lg flex items-center justify-between ${youtubeConnected ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <div className="flex items-center gap-3">
                 {youtubeConnected ? <CheckCircle2 className="text-green-500 h-5 w-5"/> : <AlertCircle className="text-red-500 h-5 w-5"/>}
                 <div>
                    <p className="font-medium text-sm">{youtubeConnected ? `Connected as ${youtubeName}` : "YouTube Disconnected"}</p>
                    {youtubeConnected && <p className="text-xs opacity-70">{youtubeEmail}</p>}
                 </div>
              </div>
              <Button size="sm" variant="outline" onClick={youtubeConnected ? onDisconnectYouTube : onConnectYouTube}>
                 {youtubeConnected ? "Disconnect" : "Connect"}
              </Button>
           </div>

           <div className="grid md:grid-cols-2 gap-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isAudioDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                onDragOver={(e) => { e.preventDefault(); setIsAudioDragActive(true); }}
                onDragLeave={() => setIsAudioDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setIsAudioDragActive(false); handleAudioUpload(e.dataTransfer.files[0]); }}
              >
                 <Input type="file" accept={AUDIO_EXTENSIONS.join(',')} className="hidden" id="audio-input" onChange={(e) => handleAudioUpload(e.target.files[0])} />
                 <label htmlFor="audio-input" className="cursor-pointer flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                       <Music className="h-6 w-6" />
                    </div>
                    <div>
                       <p className="font-medium">Upload Audio</p>
                       <p className="text-xs text-slate-500">MP3, WAV, FLAC</p>
                    </div>
                    {uploadingAudio && <div className="text-xs text-blue-400">Uploading... {uploadProgress}%</div>}
                    {audioFile && <div className="text-xs text-green-500 font-medium break-all">{audioFile.name}</div>}
                 </label>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isImageDragActive ? 'border-purple-500 bg-purple-500/10' : 'border-slate-700 hover:border-slate-500'}`}
                onDragOver={(e) => { e.preventDefault(); setIsImageDragActive(true); }}
                onDragLeave={() => setIsImageDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setIsImageDragActive(false); handleImageUpload(e.dataTransfer.files[0]); }}
              >
                 <Input type="file" accept={IMAGE_EXTENSIONS.join(',')} className="hidden" id="image-input" onChange={(e) => handleImageUpload(e.target.files[0])} />
                 <label htmlFor="image-input" className="cursor-pointer flex flex-col items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                       <ImageIcon className="h-6 w-6" />
                    </div>
                    <div>
                       <p className="font-medium">Upload Artwork</p>
                       <p className="text-xs text-slate-500">JPG, PNG, WEBP</p>
                    </div>
                    {uploadingImage && <div className="text-xs text-purple-400">Uploading...</div>}
                    {imageFile && <div className="text-xs text-green-500 font-medium break-all">{imageFile.name}</div>}
                 </label>
              </div>
           </div>

           {audioFile && imageFile && (
             <Button onClick={() => setStudioOpen(true)} className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Enter Studio <Wand2 className="ml-2 h-5 w-5" />
             </Button>
           )}
        </CardContent>
      </Card>
    );
  }

  // --- STUDIO OVERLAY (SPLIT VIEW) ---
  return (
    <div className={`fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300`}>
      {audioPreviewUrl && <audio ref={audioPlayerRef} src={audioPreviewUrl} preload="auto" />}

      {/* Header */}
      <div className="flex-none h-14 border-b bg-background/50 backdrop-blur px-4 flex items-center justify-between z-50">
         <div className="flex items-center gap-2">
            <span className="font-bold text-lg gradient-text">Upload Studio</span>
            <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground hidden sm:inline-block">Beta</span>
         </div>
         <div className="flex items-center gap-2">
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
            >
               <div
                  className="absolute inset-0"
                  style={{
                     transform: `translate(${imagePosX * 50}%, ${imagePosY * 50}%) scale(${lockImageScale ? imageScaleX : imageScaleX}, ${lockImageScale ? imageScaleX : imageScaleY})`,
                     transformOrigin: 'center',
                     transition: dragState || pinchState ? 'none' : 'transform 0.1s ease-out'
                  }}
               >
                  <img
                    src={imagePreviewUrl}
                    alt="preview"
                    className="w-full h-full object-contain pointer-events-none select-none"
                    style={{ opacity: visualizerEnabled ? visualizerSettings.backgroundOpacity : 1 }}
                  />
               </div>

               {visualizerEnabled && (
                  <canvas ref={visualizerCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
               )}

               {!subscriptionStatus?.is_subscribed && !removeWatermark && (
                  <div className="absolute top-2 left-0 right-0 text-center pointer-events-none">
                     <span className="text-[10px] text-white/50 bg-black/30 px-2 py-1 rounded">sendmybeat.com</span>
                  </div>
               )}
            </div>

            <div className={`
                mt-4 w-full max-w-xs sm:max-w-md flex items-center gap-3 bg-secondary/50 p-2 rounded-full backdrop-blur-sm border border-border/50
                ${isMobile ? "absolute bottom-24 z-30" : "relative"}
            `}>
               <Button
                 size="icon"
                 variant="ghost"
                 className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                 onClick={toggleAudioPlayback}
               >
                  {isAudioPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
               </Button>
               <div className="flex-1 space-y-1">
                  <div className="h-1 bg-primary/20 rounded-full overflow-hidden">
                     <div
                       className="h-full bg-primary transition-all duration-100"
                       style={{ width: `${(audioCurrentTime / (audioDuration || 1)) * 100}%` }}
                     />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                     <span>{formatTime(audioCurrentTime)}</span>
                     <span>{formatTime(audioDuration)}</span>
                  </div>
               </div>
            </div>

            <p className={`text-[10px] text-muted-foreground mt-2 text-center lg:mb-0 ${isMobile ? "hidden" : ""}`}>
               <Move className="h-3 w-3 inline mr-1" /> Drag to move • Pinch to zoom
            </p>

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
                 <DrawerContent className="max-h-[85vh]">
                     <DrawerHeader>
                         <DrawerTitle>Studio Controls</DrawerTitle>
                         <DrawerDescription>Edit metadata and settings</DrawerDescription>
                     </DrawerHeader>
                     <div className="px-4 pb-8 overflow-y-auto">
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
    </div>
  );
};

export default UploadStudio;
