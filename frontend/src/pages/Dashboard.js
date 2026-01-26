
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Music, Sparkles, Save, LogOut, Copy, Trash2, Edit, Plus, Upload, Youtube, Link, CheckCircle2, AlertCircle, Target, Wand2, ChevronDown, ChevronUp } from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import UpgradeModal from "@/components/UpgradeModal";
import AdBanner from "@/components/AdBanner";
import ProgressBar from "@/components/ProgressBar";

const TAG_LIMIT = 120;
const TAG_HISTORY_LIMIT = 100;
const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".flac", ".ogg"];
const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/flac",
  "audio/ogg"
];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".heic", ".heif"];
const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif"
];

  const formatTagHistoryLabel = (query = "") => {
    if (!query) return "Untitled";
    const cleaned = query
      .replace(/\([^)]*\)/g, "")
      .replace(/\btype beat\b/gi, "")
      .replace(/\btype\b/gi, "")
      .replace(/\bbeat\b/gi, "")
      .replace(/\binstrumental\b/gi, "")
      .replace(/\bfree\b/gi, "")
      .replace(/\bfor profit\b/gi, "")
      .replace(/\bnon profit\b/gi, "")
      .replace(/\bprod\.?\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const parts = cleaned.split(/\s+x\s+/i).map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return parts.join(" x ");
    }
    return cleaned || query;
  };

const Dashboard = ({ setIsAuthenticated }) => {
  const [user, setUser] = useState(null);
  const [tagQuery, setTagQuery] = useState("");
  const [tagProvider, setTagProvider] = useState("grok");
  const [customTags, setCustomTags] = useState(""); // User's custom tags (comma-separated)
  const [additionalTags, setAdditionalTags] = useState(""); // Add more tags to existing generation
  const [generatedTags, setGeneratedTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagHistory, setTagHistory] = useState([]);
  const [selectedTagHistoryIds, setSelectedTagHistoryIds] = useState([]);
  const [descriptions, setDescriptions] = useState([]);
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);
  const [newDescription, setNewDescription] = useState({ title: "", content: "" });
  const [refineText, setRefineText] = useState("");
  const [loadingRefine, setLoadingRefine] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    email: "",
    socials: "",
    key: "",
    bpm: "",
    prices: "",
    additional_info: ""
  });
  const [loadingGenerate, setLoadingGenerate] = useState(false);
  const [editingDesc, setEditingDesc] = useState(null);
  const [showSaveRefinedDialog, setShowSaveRefinedDialog] = useState(false);
  const [refinedTextToSave, setRefinedTextToSave] = useState("");
  
  // Progress bar states
  const [progressActive, setProgressActive] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [progressDuration, setProgressDuration] = useState(30000);
  
  // Cancel operation states
  const [tagGenerationController, setTagGenerationController] = useState(null);
  const [uploadController, setUploadController] = useState(null);
  
  // YouTube upload states
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeEmail, setYoutubeEmail] = useState("");
  const [youtubeProfilePicture, setYoutubeProfilePicture] = useState("");
  const [youtubeName, setYoutubeName] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedDescriptionId, setSelectedDescriptionId] = useState("");
  const [uploadDescriptionText, setUploadDescriptionText] = useState("");
  const [selectedTagsId, setSelectedTagsId] = useState("");
  const [refinedTags, setRefinedTags] = useState([]);
  const [refinedTagsLabel, setRefinedTagsLabel] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("public");
  const [videoAspectRatio, setVideoAspectRatio] = useState("16:9");
  const [imageScaleX, setImageScaleX] = useState(1);
  const [imageScaleY, setImageScaleY] = useState(1);
  const [lockImageScale, setLockImageScale] = useState(true);
  const [imagePosX, setImagePosX] = useState(0);
  const [imagePosY, setImagePosY] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState("black");
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [audioFileId, setAudioFileId] = useState("");
  const [imageFileId, setImageFileId] = useState("");
  const [uploadingToYouTube, setUploadingToYouTube] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());
  const [isAudioDragActive, setIsAudioDragActive] = useState(false);
  const [isAudioDragValid, setIsAudioDragValid] = useState(false);
  const [isImageDragActive, setIsImageDragActive] = useState(false);
  const [isImageDragValid, setIsImageDragValid] = useState(false);
  
  // Subscription states
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradingSubscription, setUpgradingSubscription] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [descriptionsLoaded, setDescriptionsLoaded] = useState(false);
  const [tagHistoryLoaded, setTagHistoryLoaded] = useState(false);

  // Analytics states
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [joiningTagHistory, setJoiningTagHistory] = useState(false);

  // Grow in 120 states
  const [growthData, setGrowthData] = useState(null);
  const [loadingGrowth, setLoadingGrowth] = useState(false);
  const [calendarData, setCalendarData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  // Check-in prompt state
  const [showCheckinPrompt, setShowCheckinPrompt] = useState(false);
  const [activeTab, setActiveTab] = useState("tags");

  // Beat Analyzer states
  const [beatAnalysis, setBeatAnalysis] = useState(null);
  const [applyingBeatFixes, setApplyingBeatFixes] = useState(false);
  const [analyzingBeat, setAnalyzingBeat] = useState(false);
  const [showAiYoutubeTools, setShowAiYoutubeTools] = useState(false);

  // Thumbnail Checker states
  const [thumbnailCheckFile, setThumbnailCheckFile] = useState(null);
  const [thumbnailCheckResult, setThumbnailCheckResult] = useState(null);
  const [checkingThumbnail, setCheckingThumbnail] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const thumbnailAbortRef = useRef(null);
  const thumbnailProgressIntervalRef = useRef(null);

  const isPro = !!subscriptionStatus?.is_subscribed;
  const selectedTagRecord = useMemo(
    () => tagHistory.find((tag) => tag.id === selectedTagsId),
    [tagHistory, selectedTagsId]
  );
  const effectiveTags = selectedTagsId === "refined"
    ? refinedTags
    : (generatedTags.length ? generatedTags : (selectedTagRecord?.tags || []));
  const hasEffectiveTags = effectiveTags.length > 0;
  const thumbnailContextReady = Boolean(
    uploadTitle?.trim() &&
    uploadDescriptionText?.trim() &&
    hasEffectiveTags
  );
  const canShowAds = Boolean(
    subscriptionStatus &&
    !subscriptionStatus.is_subscribed &&
    userLoaded &&
    descriptionsLoaded &&
    tagHistoryLoaded
  );
  const adsUnlocked = generatedTags.length > 0 || (tagHistory?.length || 0) > 0;

  useEffect(() => {
    fetchUser();
    fetchDescriptions();
    fetchTagHistory();
    checkYouTubeConnection();
    fetchSubscriptionStatus();
    fetchGrowthStatus();
  }, []);

  useEffect(() => {
    if (!selectedDescriptionId) {
      setUploadDescriptionText("");
      return;
    }
    const selectedDesc = descriptions.find(d => d.id === selectedDescriptionId);
    setUploadDescriptionText(selectedDesc?.content || "");
  }, [selectedDescriptionId, descriptions]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      toast.error("Failed to fetch user data");
    } finally {
      setUserLoaded(true);
    }
  };

  const fetchDescriptions = async () => {
    try {
      const response = await axios.get(`${API}/descriptions`);
      setDescriptions(response.data);
    } catch (error) {
      toast.error("Failed to fetch descriptions");
    } finally {
      setDescriptionsLoaded(true);
    }
  };

  const fetchTagHistory = async () => {
    try {
      const response = await axios.get(`${API}/tags/history`);
      setTagHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch tag history", error);
    } finally {
      setTagHistoryLoaded(true);
    }
  };

  const checkYouTubeConnection = async () => {
    try {
      const response = await axios.get(`${API}/youtube/status`);
      setYoutubeConnected(response.data.connected);
      setYoutubeEmail(response.data.email || "");
      setYoutubeProfilePicture(response.data.profile_picture || "");
      setYoutubeName(response.data.name || "");
    } catch (error) {
      console.error("Failed to check YouTube connection", error);
    }
  };

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await axios.get(`${API}/subscription/status`);
      console.log("📊 Subscription Status Updated:", response.data);
      setSubscriptionStatus(response.data);
    } catch (error) {
      console.error("Failed to fetch subscription status", error);
    }
  };

  const handleUpgrade = async () => {
    setUpgradingSubscription(true);
    try {
      const response = await axios.post(`${API}/subscription/create-checkout`, {
        success_url: `${window.location.origin}/dashboard?upgraded=true`,
        cancel_url: `${window.location.origin}/dashboard`
      });
      
      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error("Failed to start checkout");
      setUpgradingSubscription(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    toast.success("Logged out successfully");
  };

  const fileHasAllowedExtension = (fileName, allowedExtensions) => {
    const lower = (fileName || "").toLowerCase();
    return allowedExtensions.some((ext) => lower.endsWith(ext));
  };

  const isValidAudioFile = (file) => {
    if (!file) return false;
    if (file.type && AUDIO_MIME_TYPES.includes(file.type)) return true;
    return fileHasAllowedExtension(file.name, AUDIO_EXTENSIONS);
  };

  const isValidImageFile = (file) => {
    if (!file) return false;
    if (file.type && IMAGE_MIME_TYPES.includes(file.type)) return true;
    return fileHasAllowedExtension(file.name, IMAGE_EXTENSIONS);
  };

  const isValidDragItem = (item, type) => {
    if (!item || item.kind !== "file") return false;
    const mime = item.type || "";
    if (type === "audio") {
      return AUDIO_MIME_TYPES.includes(mime);
    }
    if (type === "image") {
      return IMAGE_MIME_TYPES.includes(mime);
    }
    return false;
  };

  const handleAnalyzeChannel = async () => {
    setLoadingAnalytics(true);
    try {
      const response = await axios.post(`${API}/youtube/analytics`);
      setAnalyticsData(response.data);
      toast.success("Channel analysis complete!");
      
      // Refresh credits after analysis
      await fetchSubscriptionStatus();
    } catch (error) {
      if (error.response?.status === 402) {
        const detail = error.response.data.detail;
        toast.error(detail.message || "Daily limit reached");
        setShowUpgradeModal(true);
      } else if (error.response?.status === 400) {
        toast.error("Please connect your YouTube account first");
      } else {
        console.error("Analytics error:", error);
        toast.error("Failed to analyze channel");
      }
      
      // Still refresh credits on error to show updated count
      await fetchSubscriptionStatus();
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchGrowthStatus = async () => {
    try {
      const response = await axios.get(`${API}/growth/status`);
      setGrowthData(response.data);
    } catch (error) {
      console.error("Failed to fetch growth status:", error);
    }
  };

  const fetchCalendar = async () => {
    try {
      const response = await axios.get(`${API}/growth/calendar`);
      setCalendarData(response.data);
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
    }
  };

  const handleStartChallenge = async () => {
    setLoadingGrowth(true);
    try {
      const response = await axios.post(`${API}/growth/start`);
      toast.success(response.data.message);
      await fetchGrowthStatus();
      await fetchCalendar();
    } catch (error) {
      console.error("Failed to start challenge:", error);
      toast.error("Failed to start challenge");
    } finally {
      setLoadingGrowth(false);
    }
  };

  const handleCheckin = async () => {
    setLoadingGrowth(true);
    try {
      const response = await axios.post(`${API}/growth/checkin`);
      toast.success(response.data.message);
      if (response.data.badge_unlocked) {
        toast.success(`🎉 ${response.data.badge_unlocked}`);
      }
      await fetchGrowthStatus();
      await fetchCalendar();
    } catch (error) {
      console.error("Failed to checkin:", error);
      toast.error(error.response?.data?.detail || "Failed to check in");
    } finally {
      setLoadingGrowth(false);
    }
  };

  const promptCheckin = () => {
    // Only show if user has started the challenge and hasn't checked in today
    if (growthData && growthData.challenge_start_date) {
      const today = new Date().toISOString().split('T')[0];
      if (growthData.last_checkin_date !== today) {
        setShowCheckinPrompt(true);
      }
    }
  };

  const handleGenerateTags = async (e) => {
    e.preventDefault();
    if (!tagQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }
    
    // Parse custom tags
    const customTagsArray = customTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    // Create abort controller for cancellation
    const controller = new AbortController();
    setTagGenerationController(controller);
    
    setLoadingTags(true);
    setProgressActive(true);
    setProgressMessage("🎵 Generating optimized YouTube tags + searching artist's popular songs...");
    setProgressDuration(45000); // 45 seconds for tag generation
    
    try {
      const response = await axios.post(
        `${API}/tags/generate`, 
        { 
          query: tagQuery,
          custom_tags: customTagsArray,
          llm_provider: tagProvider
        },
        { signal: controller.signal }
      );
      setGeneratedTags(response.data.tags);
      toast.success(`Generated ${response.data.tags.length} tags! (AI + YouTube search + your custom tags)`);
      fetchTagHistory();
      
      // Refresh credits after a short delay to ensure backend has updated
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
      
      // Prompt check-in after successful generation
      setTimeout(() => {
        promptCheckin();
      }, 1000);
    } catch (error) {
      // Check if cancelled
      if (axios.isCancel(error)) {
        toast.info("Tag generation cancelled. No credits used.");
        return;
      }
      
      // Handle credit limit
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily limit reached! Upgrade to continue.");
      } else {
        toast.error(error.response?.data?.detail?.message || error.response?.data?.detail || "Failed to generate tags");
      }
      
      // Refresh credits even on error
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    } finally {
      setLoadingTags(false);
      setProgressActive(false);
      setTagGenerationController(null);
    }
  };

  const handleCancelTagGeneration = () => {
    if (tagGenerationController) {
      tagGenerationController.abort();
      setLoadingTags(false);
      setProgressActive(false);
      setTagGenerationController(null);
    }
  };

  const toggleDescriptionExpand = (descId) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(descId)) {
        newSet.delete(descId);
      } else {
        newSet.add(descId);
      }
      return newSet;
    });
  };

  const copyTags = () => {
    const text = generatedTags.join(", ");
    
    // Fallback copy method for when Clipboard API is blocked
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast.success("Tags copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy tags");
    }
    
    document.body.removeChild(textArea);
  };

  const handleAddMoreTags = () => {
    if (!additionalTags.trim()) {
      toast.error("Please enter tags to add");
      return;
    }

    // Parse additional tags
    const newTags = additionalTags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // Combine with existing tags
    const combinedTags = [...generatedTags, ...newTags];

    // Remove duplicates
    const seen = new Set();
    const uniqueTags = [];
    for (const tag of combinedTags) {
      const tagLower = tag.toLowerCase();
      if (!seen.has(tagLower)) {
        seen.add(tagLower);
        uniqueTags.push(tag);
      }
    }

    // Check limit
    if (uniqueTags.length > TAG_LIMIT) {
      const excess = uniqueTags.length - TAG_LIMIT;
      toast.error(`Cannot add all tags. Would exceed ${TAG_LIMIT} limit by ${excess} tags.`);
      return;
    }

    setGeneratedTags(uniqueTags);
    setAdditionalTags(""); // Clear input
    toast.success(`Added ${newTags.length} tags! Total: ${uniqueTags.length}/${TAG_LIMIT}`);
  };

  const toggleTagHistorySelection = (id) => {
    setSelectedTagHistoryIds((prev) => (
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    ));
  };

  const handleJoinSelectedTagHistory = async () => {
    const selectedItems = tagHistory.filter((item) => selectedTagHistoryIds.includes(item.id));
    if (selectedItems.length < 2) {
      toast.error("Select at least two generations to join");
      return;
    }
    if (selectedItems.length > 3) {
      toast.error("You can join up to 3 generations at once.");
      return;
    }

    setJoiningTagHistory(true);
    const mergedTags = selectedItems.flatMap((item) => item.tags || []);
    const seen = new Set();
    const candidateTags = [];
    for (const tag of mergedTags) {
      const tagLower = tag.toLowerCase();
      if (!seen.has(tagLower)) {
        seen.add(tagLower);
        candidateTags.push(tag);
      }
    }

    const joinLabel = selectedItems
      .map((item) => formatTagHistoryLabel(item.query))
      .filter(Boolean)
      .join(" x ");

    try {
      const response = await axios.post(`${API}/tags/join-ai`, {
        queries: selectedItems.map((item) => item.query),
        candidate_tags: candidateTags,
        max_tags: TAG_LIMIT
      });

      const aiTags = response.data?.tags || [];
      if (!aiTags.length) {
        throw new Error("No tags returned");
      }

      setGeneratedTags(aiTags);
      setSelectedTagHistoryIds([]);

      const saveResponse = await axios.post(`${API}/tags/history`, {
        query: joinLabel || "Joined Tags",
        tags: aiTags
      });
      setTagHistory((prev) => {
        const merged = [saveResponse.data, ...prev];
        return merged.slice(0, TAG_HISTORY_LIMIT);
      });
      toast.success(`Joined ${selectedItems.length} generations! Total: ${aiTags.length}/${TAG_LIMIT}`);
    } catch (error) {
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily limit reached! Upgrade to continue.");
      } else {
        toast.error("Failed to join tags with AI. Try again.");
      }
    } finally {
      setJoiningTagHistory(false);
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    }
  };

  const copyDescription = (content) => {
    // Fallback copy method for when Clipboard API is blocked
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        toast.success("Description copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy description");
      }
      document.body.removeChild(textarea);
    };
    
    // Try modern API first, fallback if blocked
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content)
        .then(() => toast.success("Description copied to clipboard!"))
        .catch(() => fallbackCopy());
    } else {
      fallbackCopy();
    }
  };

  const handleSaveDescription = async () => {
    if (!newDescription.title.trim() || !newDescription.content.trim()) {
      toast.error("Please fill in both title and content");
      return;
    }

    setLoadingDescriptions(true);
    try {
      await axios.post(`${API}/descriptions`, newDescription);
      toast.success("Description saved successfully!");
      setNewDescription({ title: "", content: "" });
      fetchDescriptions();
    } catch (error) {
      toast.error("Failed to save description");
    } finally {
      setLoadingDescriptions(false);
    }
  };

  const handleDeleteDescription = async (id) => {
    // Confirmation dialog
    const confirmed = window.confirm(
      "Are you sure you want to delete this description?\n\nThis action cannot be undone. This is your last chance to save it!"
    );
    
    if (!confirmed) {
      return; // User cancelled, don't delete
    }
    
    try {
      await axios.delete(`${API}/descriptions/${id}`);
      toast.success("Description deleted");
      fetchDescriptions();
    } catch (error) {
      toast.error("Failed to delete description");
    }
  };

  const handleUpdateDescription = async () => {
    if (!editingDesc) return;
    
    try {
      await axios.put(`${API}/descriptions/${editingDesc.id}`, {
        title: editingDesc.title,
        content: editingDesc.content
      });
      toast.success("Description updated!");
      setEditingDesc(null);
      fetchDescriptions();
    } catch (error) {
      toast.error("Failed to update description");
    }
  };

  const handleRefineDescription = async () => {
    if (!refineText.trim()) {
      toast.error("Please enter a description to refine");
      return;
    }

    setLoadingRefine(true);
    try {
      const response = await axios.post(`${API}/descriptions/refine`, { description: refineText });
      setRefineText(response.data.refined_description);
      setRefinedTextToSave(response.data.refined_description);
      setShowSaveRefinedDialog(true);
      toast.success("Description refined!");
      
      // Refresh credits
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    } catch (error) {
      // Handle credit limit
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily limit reached! Upgrade to continue.");
      } else {
        toast.error("Failed to refine description");
      }
      
      // Refresh credits even on error
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    } finally {
      setLoadingRefine(false);
    }
  };

  const handleSaveRefinedAsTemplate = async () => {
    if (!refinedTextToSave.trim()) return;
    
    try {
      await axios.post(`${API}/descriptions`, {
        title: `Refined - ${new Date().toLocaleDateString()}`,
        content: refinedTextToSave,
        is_ai_generated: true
      });
      toast.success("Refined text saved as template!");
      setShowSaveRefinedDialog(false);
      fetchDescriptions();
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  const handleGenerateDescription = async () => {
    setLoadingGenerate(true);
    try {
      const response = await axios.post(`${API}/descriptions/generate`, generateForm);
      setNewDescription({ 
        title: `Generated - ${generateForm.key || generateForm.bpm || 'Beat'}`,
        content: response.data.generated_description 
      });
      toast.success("Description generated! You can edit and save it.");
      
      // Refresh credits
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    } catch (error) {
      // Handle credit limit
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily limit reached! Upgrade to continue.");
      } else {
        toast.error("Failed to generate description");
      }
      
      // Refresh credits even on error
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    } finally {
      setLoadingGenerate(false);
    }
  };

  const connectYouTube = async () => {
    try {
      const response = await axios.get(`${API}/youtube/auth-url`);
      window.location.href = response.data.auth_url;
    } catch (error) {
      if (error.response?.status === 400) {
        toast.error("Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to backend/.env");
      } else {
        toast.error("Failed to connect YouTube");
      }
    }
  };

  const handleAnalyzeBeat = async () => {
    if (!uploadTitle || !hasEffectiveTags) {
      toast.error("Please add a title and tags first");
      return;
    }

    setAnalyzingBeat(true);
    try {
      const selectedDesc = descriptions.find(d => d.id === selectedDescriptionId);
      const descriptionText = uploadDescriptionText?.trim()
        ? uploadDescriptionText
        : (selectedDesc?.content || "");
      
      const response = await axios.post(`${API}/beat/analyze`, {
        title: uploadTitle,
        tags: effectiveTags,
        description: descriptionText
      });
      
      setBeatAnalysis(response.data);
      toast.success(`Analysis complete! Score: ${response.data.overall_score}/100`);
    } catch (error) {
      console.error("Beat analysis failed:", error);
      toast.error("Failed to analyze beat");
    } finally {
      setAnalyzingBeat(false);
    }
  };

  const handleApplyBeatFixes = async () => {
    if (!beatAnalysis) {
      toast.error("Analyze your beat first to unlock fixes");
      return;
    }
    if (!uploadTitle || !hasEffectiveTags) {
      toast.error("Please add a title and tags first");
      return;
    }

    setApplyingBeatFixes(true);
    try {
      const selectedDesc = descriptions.find(d => d.id === selectedDescriptionId);
      const baseDescription = uploadDescriptionText?.trim()
        ? uploadDescriptionText
        : (selectedDesc?.content || "");

      const response = await axios.post(`${API}/beat/fix`, {
        title: uploadTitle,
        tags: effectiveTags,
        description: baseDescription,
        analysis: beatAnalysis
      });

      const fixed = response.data || {};
      const applied = fixed.applied_fixes || {};
      if (fixed.title) {
        setUploadTitle(fixed.title);
      }
      if (applied.tags && Array.isArray(fixed.tags) && fixed.tags.length) {
        setRefinedTags(fixed.tags);
        const baseLabel = formatTagHistoryLabel(
          selectedTagRecord?.query || tagQuery || uploadTitle || "Tag list"
        );
        setRefinedTagsLabel(`${baseLabel} (refined)`);
        setSelectedTagsId("refined");
      }
      if (fixed.description !== undefined) {
        setUploadDescriptionText(fixed.description);
      }

      const appliedList = [
        applied.title ? "title" : null,
        applied.description ? "description" : null,
        applied.tags ? "tags" : null
      ].filter(Boolean);

      if (appliedList.length === 0) {
        toast.info("No fixes needed based on your analysis.");
      } else {
        toast.success(`Applied fixes to: ${appliedList.join(", ")}`);
      }
    } catch (error) {
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily limit reached! Upgrade to continue.");
      } else {
        toast.error("Failed to apply fixes");
      }
    } finally {
      setApplyingBeatFixes(false);
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    }
  };

  const handleThumbnailCheck = async (fileOverride = null) => {
    const fileToUse = fileOverride || thumbnailCheckFile;
    if (!fileToUse) {
      toast.error("Please upload a thumbnail image first");
      return;
    }
    if (!thumbnailContextReady) {
      toast.error("Add a title, description, and tags first");
      return;
    }

    setCheckingThumbnail(true);
    if (fileOverride) {
      setThumbnailCheckFile(fileOverride);
    }
    setThumbnailProgress(5);
    const controller = new AbortController();
    thumbnailAbortRef.current = controller;
    if (thumbnailProgressIntervalRef.current) {
      clearInterval(thumbnailProgressIntervalRef.current);
    }
    thumbnailProgressIntervalRef.current = setInterval(() => {
      setThumbnailProgress((prev) => (prev < 95 ? prev + 5 : prev));
    }, 500);
    try {
      const formData = new FormData();
      formData.append("file", fileToUse);
      formData.append("title", uploadTitle || "");
      formData.append("tags", effectiveTags.join(", "));
      formData.append("description", uploadDescriptionText || "");
      formData.append("llm_provider", "grok");

      const response = await axios.post(`${API}/beat/thumbnail-check`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: controller.signal
      });
      setThumbnailCheckResult(response.data);
      setThumbnailProgress(100);
      toast.success("Thumbnail check complete!");
    } catch (error) {
      if (error?.code === "ERR_CANCELED") {
        return;
      }
      setThumbnailProgress(0);
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily limit reached! Upgrade to continue.");
      } else {
        toast.error("Failed to analyze thumbnail");
      }
    } finally {
      if (thumbnailProgressIntervalRef.current) {
        clearInterval(thumbnailProgressIntervalRef.current);
        thumbnailProgressIntervalRef.current = null;
      }
      thumbnailAbortRef.current = null;
      setCheckingThumbnail(false);
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    }
  };

  const cancelThumbnailCheck = () => {
    if (!checkingThumbnail) {
      return;
    }
    if (thumbnailAbortRef.current) {
      thumbnailAbortRef.current.abort();
      thumbnailAbortRef.current = null;
    }
    if (thumbnailProgressIntervalRef.current) {
      clearInterval(thumbnailProgressIntervalRef.current);
      thumbnailProgressIntervalRef.current = null;
    }
    setThumbnailProgress(0);
    setCheckingThumbnail(false);
    toast.info("Thumbnail check canceled");
  };

  const disconnectYouTube = async () => {
    try {
      await axios.delete(`${API}/youtube/disconnect`);
      setYoutubeConnected(false);
      setYoutubeEmail("");
      toast.success("YouTube disconnected");
    } catch (error) {
      toast.error("Failed to disconnect YouTube");
    }
  };

  const handleAudioUpload = async (input) => {
    const file = input?.target?.files?.[0] || input;
    if (!file) return;
    if (!isValidAudioFile(file)) {
      toast.error("Invalid audio file. Please use MP3, WAV, M4A, FLAC, or OGG.");
      return;
    }

    // Warn for very large files
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 200) {
      toast.error("File too large! Please use files under 200MB.");
      return;
    }
    
    if (fileSizeMB > 100) {
      toast.warning(`${fileSizeMB.toFixed(0)}MB file detected. Processing may take 3-5 minutes...`, {duration: 5000});
    }

    setUploadingAudio(true);
    setUploadProgress(0);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 600000,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      setAudioFile(file);
      setAudioFileId(response.data.file_id);
      toast.success("Audio uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error.response?.data?.detail || "Failed to upload audio");
    } finally {
      setUploadingAudio(false);
      setUploadProgress(0);
    }
  };

  const handleImageUpload = async (input) => {
    const file = input?.target?.files?.[0] || input;
    if (!file) return;
    if (!isValidImageFile(file)) {
      toast.error("Invalid image file. Please use JPG, PNG, WEBP, AVIF, HEIC, or HEIF.");
      return;
    }

    setUploadingImage(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImageFile(file);
      setImageFileId(response.data.file_id);
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAudioDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAudioDragActive(true);
    setIsAudioDragValid(isValidDragItem(e.dataTransfer?.items?.[0], "audio"));
  };

  const handleAudioDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAudioDragActive(false);
    setIsAudioDragValid(false);
  };

  const handleAudioDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAudioDragActive(false);
    setIsAudioDragValid(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    handleAudioUpload(file);
  };

  const handleImageDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageDragActive(true);
    setIsImageDragValid(isValidDragItem(e.dataTransfer?.items?.[0], "image"));
  };

  const handleImageDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageDragActive(false);
    setIsImageDragValid(false);
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageDragActive(false);
    setIsImageDragValid(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    handleImageUpload(file);
  };

  const handleYouTubeUpload = async () => {
    if (!uploadTitle || !selectedDescriptionId || !audioFileId || !imageFileId) {
      toast.error("Please fill all required fields and upload files");
      return;
    }

    // Create abort controller for cancellation
    const controller = new AbortController();
    setUploadController(controller);

    setUploadingToYouTube(true);
    setProgressActive(true);
    setProgressMessage("🎬 Creating video and uploading to YouTube...");
    setProgressDuration(120000); // 2 minutes for upload
    
    try {
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

      const response = await axios.post(`${API}/youtube/upload`, formData, {
        timeout: 180000, // 3 minute timeout
        signal: controller.signal
      });
      
      if (response.data.video_url) {
        toast.success(
          <div>
            <p className="font-semibold">Video uploaded successfully! 🎉</p>
            <a href={response.data.video_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              View on YouTube
            </a>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.success(response.data.message || "Upload process started!");
      }
      
      if (response.data.note) {
        toast.info(response.data.note, { duration: 8000 });
      }
      
      // Prompt check-in after successful upload
      setTimeout(() => {
        promptCheckin();
      }, 1500);
      
      // Refresh credits after upload
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    } catch (error) {
      // Check if cancelled
      if (axios.isCancel(error)) {
        toast.info("Upload cancelled. No credits used.");
        return;
      }
      
      // Handle credit limit and watermark removal
      if (error.response?.status === 402) {
        const errorDetail = error.response.data.detail;
        if (errorDetail?.feature === 'remove_watermark') {
          // Watermark removal requires Pro
          setShowUpgradeModal(true);
          setRemoveWatermark(false); // Uncheck the box
          toast.error("Watermark removal is a Pro feature! Upgrade to remove watermarks.");
        } else {
          // Daily upload limit
          setShowUpgradeModal(true);
          toast.error("Daily upload limit reached! Upgrade to continue.");
        }
      } else if (error.code === 'ECONNABORTED') {
        toast.error("Upload timed out. Your audio file might be too long. Try a shorter file.");
      } else {
        toast.error(error.response?.data?.detail?.message || error.response?.data?.detail || "Failed to upload to YouTube");
      }
      
      // Refresh credits even on error
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    } finally {
      setUploadingToYouTube(false);
      setProgressActive(false);
      setUploadController(null);
    }
  };

  const handleCancelUpload = () => {
    if (uploadController) {
      uploadController.abort();
      setUploadingToYouTube(false);
      setProgressActive(false);
      setUploadController(null);
    }
  };

  const previewAspectRatio = videoAspectRatio === "1:1"
    ? "1 / 1"
    : videoAspectRatio === "9:16"
    ? "9 / 16"
    : videoAspectRatio === "4:5"
    ? "4 / 5"
    : "16 / 9";
  const previewRatio = videoAspectRatio === "1:1"
    ? 1
    : videoAspectRatio === "9:16"
    ? 9 / 16
    : videoAspectRatio === "4:5"
    ? 4 / 5
    : 16 / 9;

  const previewSectionRef = useRef(null);
  const previewContainerRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const [previewSize, setPreviewSize] = useState(720);
  const [imageMeta, setImageMeta] = useState({ width: 0, height: 0, ratio: 1 });
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState("");

  const frameWidth = previewSize;
  const frameHeight = previewSize / previewRatio;
  const imageRatio = imageMeta.ratio || 1;
  const fitWidth = previewRatio > imageRatio ? frameHeight * imageRatio : frameWidth;
  const fitHeight = previewRatio > imageRatio ? frameHeight : frameWidth / imageRatio;
  const fitLeft = (frameWidth - fitWidth) / 2;
  const fitTop = (frameHeight - fitHeight) / 2;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (event) => {
      if (!previewContainerRef.current) return;
      const rect = previewContainerRef.current.getBoundingClientRect();
      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      const nextX = clamp(dragState.originX + deltaX / (rect.width / 2), -1, 1);
      const nextY = clamp(dragState.originY + deltaY / (rect.height / 2), -1, 1);
      setImagePosX(nextX);
      setImagePosY(nextY);
    };

    const handleUp = () => setDragState(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragState, imagePosX, imagePosY]);

  const fitImageToFrame = () => {
    setImageScaleX(1);
    setImageScaleY(1);
    setImagePosX(0);
    setImagePosY(0);
    setLockImageScale(true);
  };

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl("");
      setImageMeta({ width: 0, height: 0, ratio: 1 });
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    const img = new Image();
    img.onload = () => {
      const ratio = img.width && img.height ? img.width / img.height : 1;
      setImageMeta({ width: img.width, height: img.height, ratio });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    if (imageFile) {
      fitImageToFrame();
    }
  }, [imageFile, videoAspectRatio]);

  useEffect(() => {
    if (audioFile && imageFile) {
      setShowImageSettings(true);
      return;
    }
    setShowImageSettings(false);
  }, [audioFile, imageFile]);

  useEffect(() => {
    if (!audioFile) {
      setAudioPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(audioFile);
    setAudioPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioFile]);

  useEffect(() => {
    if (!resizeState || !previewContainerRef.current) return;

    const handleMove = (event) => {
      const rect = previewContainerRef.current.getBoundingClientRect();
      const deltaX = event.clientX - resizeState.startX;
      const deltaY = event.clientY - resizeState.startY;
      const xSign = resizeState.corner.includes("l") ? -1 : 1;
      const ySign = resizeState.corner.includes("t") ? -1 : 1;
      const nextX = clamp(resizeState.originX + xSign * deltaX / (rect.width / 2), 0.5, 1);
      const nextY = clamp(resizeState.originY + ySign * deltaY / (rect.height / 2), 0.5, 1);

      if (lockImageScale) {
        const locked = clamp((nextX + nextY) / 2, 0.5, 1);
        setImageScaleX(locked);
        setImageScaleY(locked);
      } else {
        setImageScaleX(nextX);
        setImageScaleY(nextY);
      }
    };

    const handleUp = () => setResizeState(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [resizeState, lockImageScale]);

  const handlePreviewMouseDown = (event) => {
    if (!previewContainerRef.current) return;
    setLockImageScale(true);
    setDragState({
      startX: event.clientX,
      startY: event.clientY,
      originX: imagePosX,
      originY: imagePosY
    });
  };

  const handleResizeStart = (corner) => (event) => {
    event.stopPropagation();
    if (!previewContainerRef.current) return;
    setResizeState({
      corner,
      startX: event.clientX,
      startY: event.clientY,
      originX: imageScaleX,
      originY: imageScaleY
    });
  };

  const scrollToPreview = () => {
    setActiveTab("upload");
    setTimeout(() => {
      previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 200);
  };

  return (
    <div className="min-h-screen mesh-gradient" data-testid="dashboard">
      <DarkModeToggle />
      
      {/* Header */}
      <div className="glass-card mx-2 sm:mx-4 mt-2 sm:mt-4 rounded-xl sm:rounded-2xl border-0 dashboard-card">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 dashboard-shell">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <img src="/sendmybeat.png" alt="SendMyBeat" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold gradient-text">SendMyBeat</h1>
                {user && <p className="text-xs sm:text-sm" style={{color: 'var(--text-secondary)'}}>Welcome back, {user.username}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
              {/* Show Upgrade button for free users */}
              {subscriptionStatus && !subscriptionStatus.is_subscribed && (
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="btn-modern text-xs sm:text-sm px-3 sm:px-4 py-2"
                  data-testid="header-upgrade-btn"
                >
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Upgrade to Pro
                </Button>
              )}
              
              {/* Show Pro badge for subscribed users */}
              {subscriptionStatus && subscriptionStatus.is_subscribed && (
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                  ✨ Pro Member
                </div>
              )}
              
              {/* YouTube Profile Picture */}
              {youtubeConnected && youtubeProfilePicture && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full" style={{backgroundColor: 'var(--bg-secondary)'}}>
                  <img 
                    src={youtubeProfilePicture} 
                    alt={youtubeName || youtubeEmail}
                    className="h-6 w-6 sm:h-8 sm:w-8 rounded-full border-2 border-[var(--accent-primary)]"
                  />
                  <span className="text-xs sm:text-sm font-medium hidden sm:block" style={{color: 'var(--text-primary)'}}>
                    {youtubeName || youtubeEmail}
                  </span>
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-1 sm:gap-2 border-[var(--border-color)] text-xs sm:text-sm px-3 sm:px-4 py-2"
                data-testid="logout-btn"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8 dashboard-shell space-y-6 sm:space-y-8">
        {/* Subscription Banner */}
        {subscriptionStatus && (
          <SubscriptionBanner
            creditsRemaining={subscriptionStatus.daily_credits_remaining}
            uploadCreditsRemaining={subscriptionStatus.upload_credits_remaining}
            isSubscribed={subscriptionStatus.is_subscribed}
            onUpgrade={() => setShowUpgradeModal(true)}
            API={API}
          />
        )}

        {/* Advertisement Banner - Only for free users */}
        {canShowAds && adsUnlocked && (
          <AdBanner 
            isSubscribed={subscriptionStatus.is_subscribed}
            style={{ marginBottom: '24px' }}
          />
        )}

        {/* Progress Bar */}
        <ProgressBar
          isActive={progressActive}
          message={progressMessage}
          duration={progressDuration}
          onCancel={
            loadingTags ? handleCancelTagGeneration : 
            uploadingToYouTube ? handleCancelUpload : 
            null
          }
        />

        {audioFile && imageFile && (
          <div
            className="fixed bottom-4 right-4 z-50 border rounded-lg shadow-lg p-2"
            style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="rounded overflow-hidden"
                style={{ width: 72, height: 72, backgroundColor: backgroundColor === "white" ? "#ffffff" : "#000000" }}
              >
                <img
                  src={imagePreviewUrl}
                  alt="Mini preview"
                  className="w-full h-full object-contain"
                  style={{
                    objectFit: "contain",
                    transform: `translate(${imagePosX * 50}%, ${imagePosY * 50}%) scale(${imageScaleX}, ${imageScaleY})`,
                    transformOrigin: 'center'
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <audio controls src={audioPreviewUrl} className="h-8 w-40 sm:w-56" />
                <Button type="button" size="sm" variant="outline" onClick={scrollToPreview}>
                  Back to preview
                </Button>
              </div>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-5 gap-1 text-xs sm:text-sm dashboard-tabs">
            <TabsTrigger value="tags" data-testid="tags-tab" className="px-1 sm:px-3 py-1.5 sm:py-2 truncate">Tags</TabsTrigger>
            <TabsTrigger value="descriptions" data-testid="descriptions-tab" className="px-1 sm:px-3 py-1.5 sm:py-2 truncate">Descriptions</TabsTrigger>
            <TabsTrigger value="upload" data-testid="upload-tab" className="px-1 sm:px-3 py-1.5 sm:py-2 truncate">Upload</TabsTrigger>
            <TabsTrigger value="analytics" data-testid="analytics-tab" className="px-1 sm:px-3 py-1.5 sm:py-2 truncate">Analytics</TabsTrigger>
            <TabsTrigger value="grow" data-testid="grow-tab" className="px-1 sm:px-3 py-1.5 sm:py-2 truncate">Grow in 120</TabsTrigger>
          </TabsList>

          {/* Tag Generator Tab */}
          <TabsContent value="tags" className="space-y-4 sm:space-y-6 dashboard-section">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-4 sm:gap-6">
              <Card className="dashboard-card">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                    <span>Generate YouTube Tags</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">AI generates focused tags + searches artist's popular songs + adds your custom tags (up to 120 total)</CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <form onSubmit={handleGenerateTags} className="space-y-3 sm:space-y-4" data-testid="tag-generator-form">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="tag-query" className="text-sm sm:text-base">Search Query</Label>
                      <Input
                        id="tag-query"
                        placeholder="e.g., lil uzi, travis scott, dark trap beat"
                        value={tagQuery}
                        onChange={(e) => setTagQuery(e.target.value)}
                        data-testid="tag-query-input"
                        className="text-sm sm:text-base"
                      />
                      <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                        Tip: Include artist name for popular song "type beat" variations
                      </p>
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="tag-provider" className="text-sm sm:text-base">AI Provider (Grok)</Label>
                      <Select value={tagProvider} onValueChange={setTagProvider}>
                        <SelectTrigger id="tag-provider" data-testid="tag-provider">
                          <SelectValue placeholder="Grok" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="grok">Grok</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                        Uses the Grok API key configured on the backend
                      </p>
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label htmlFor="custom-tags" className="text-sm sm:text-base">Your Custom Tags (Optional)</Label>
                      <Textarea
                        id="custom-tags"
                        placeholder="e.g., free for profit, exclusive beat, lease available (comma-separated)"
                        value={customTags}
                        onChange={(e) => setCustomTags(e.target.value)}
                        rows={3}
                        data-testid="custom-tags-input"
                        className="text-sm sm:text-base"
                      />
                      <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                        Add your own tags (comma-separated). Total limit: {TAG_LIMIT} tags
                      </p>
                    </div>
                    
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-sm sm:text-base py-5 sm:py-6"
                      disabled={loadingTags}
                      data-testid="generate-tags-btn"
                    >
                      {loadingTags ? "Generating Tags..." : "Generate 60-80 Tags (AI + YouTube + Custom)"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="space-y-4 sm:space-y-6">
                {generatedTags.length > 0 && (
                  <Card className="dashboard-card" data-testid="generated-tags-section">
                    <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                        <CardTitle className="text-sm sm:text-base" style={{color: 'var(--text-primary)'}}>
                          Generated Tags ({generatedTags.length})
                        </CardTitle>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleGenerateTags}
                            className="gap-1 sm:gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 border-0 text-xs sm:text-sm flex-1 sm:flex-none py-2"
                            disabled={loadingTags}
                            data-testid="refine-tags-btn"
                          >
                            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                            Refine
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={copyTags}
                            className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none py-2"
                            data-testid="copy-tags-btn"
                          >
                            <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                            Copy All
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
                      <div className="tag-cloud" data-testid="tags-list">
                        {generatedTags.map((tag, index) => (
                          <span 
                            key={index} 
                            className="tag-item group relative" 
                            data-testid={`tag-${index}`}
                          >
                            {tag}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setGeneratedTags(generatedTags.filter((_, i) => i !== index));
                                toast.success("Tag removed");
                              }}
                              className="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-700"
                              title="Delete tag"
                              aria-label="Delete tag"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                      
                      {/* Add More Tags Section */}
                      <div className="p-3 sm:p-4 rounded-lg border-2 border-green-500" style={{backgroundColor: 'var(--bg-secondary)'}}>
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="additional-tags" className="font-semibold text-sm sm:text-base">
                              <Plus className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              Add More Tags
                            </Label>
                            <span className="text-xs sm:text-sm" style={{color: 'var(--text-secondary)'}}>
                              {generatedTags.length}/{TAG_LIMIT}
                            </span>
                          </div>
                          <Textarea
                            id="additional-tags"
                            placeholder="Add more tags (comma-separated)"
                            value={additionalTags}
                            onChange={(e) => setAdditionalTags(e.target.value)}
                            rows={2}
                            disabled={generatedTags.length >= TAG_LIMIT}
                            className="text-sm sm:text-base"
                          />
                          <Button
                            size="sm"
                            onClick={handleAddMoreTags}
                            disabled={generatedTags.length >= TAG_LIMIT || !additionalTags.trim()}
                            className="w-full gap-1 sm:gap-2 bg-green-600 hover:bg-green-700 text-sm py-2.5"
                          >
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                            {generatedTags.length >= TAG_LIMIT ? `Limit Reached (${TAG_LIMIT})` : "Add Tags"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tag History */}
                {tagHistory.length > 0 && (
                  <Card className="dashboard-card-muted">
                    <CardHeader className="px-4 sm:px-6 py-4 sm:py-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-sm sm:text-base">Recent Generations</CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                            {selectedTagHistoryIds.length} selected
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleJoinSelectedTagHistory}
                            disabled={selectedTagHistoryIds.length < 2 || joiningTagHistory}
                            className="text-xs sm:text-sm"
                          >
                            {joiningTagHistory ? "Joining..." : "Join Selected"}
                          </Button>
                          {selectedTagHistoryIds.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTagHistoryIds([])}
                              className="text-xs sm:text-sm"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <div className="space-y-3 tag-history-scroll">
                        {tagHistory.slice(0, TAG_HISTORY_LIMIT).map((item) => {
                          const displayLabel = formatTagHistoryLabel(item.query);
                          return (
                          <div
                            key={item.id}
                            className="p-4 rounded-lg border-2 transition-all hover:border-purple-500 cursor-pointer relative group"
                            style={{
                              backgroundColor: 'var(--bg-secondary)',
                              borderColor: selectedTagHistoryIds.includes(item.id) ? 'var(--accent-primary)' : 'var(--border-color)'
                            }}
                            onClick={() => {
                              setGeneratedTags(item.tags);
                              setTagQuery(item.query);
                              toast.success("Tags loaded!");
                            }}
                            data-testid="tag-history-item"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-3 flex-1">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4 accent-green-500"
                                  checked={selectedTagHistoryIds.includes(item.id)}
                                  onChange={() => toggleTagHistorySelection(item.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Select ${displayLabel}`}
                                />
                                <div className="flex-1">
                                  <p className="font-medium mb-1" style={{color: 'var(--text-primary)'}}>{displayLabel}</p>
                                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{item.tags.length} tags generated</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    // Delete from tag history
                                    const updatedHistory = tagHistory.filter(t => t.id !== item.id);
                                    setTagHistory(updatedHistory);
                                    toast.success("Generation deleted");
                                  } catch (error) {
                                    toast.error("Failed to delete");
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Descriptions Tab */}
          <TabsContent value="descriptions" className="space-y-4 sm:space-y-6 dashboard-section">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Create/Save Description */}
              <Card className="dashboard-card">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Save className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                    <span>Create & Save Description</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="desc-title">Title</Label>
                    <Input
                      id="desc-title"
                      placeholder="e.g., Trap Beat Template"
                      value={newDescription.title}
                      onChange={(e) => setNewDescription({ ...newDescription, title: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newDescription.content.trim()) {
                          e.preventDefault();
                          handleSaveDescription();
                        }
                      }}
                      data-testid="desc-title-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc-content">Content</Label>
                    <Textarea
                      id="desc-content"
                      placeholder="Write your description here..."
                      rows={8}
                      value={newDescription.content}
                      onChange={(e) => setNewDescription({ ...newDescription, content: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && newDescription.title.trim()) {
                          e.preventDefault();
                          handleSaveDescription();
                        }
                      }}
                      data-testid="desc-content-input"
                    />
                    <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                      Press Enter to save. Use Shift+Enter for a new line.
                    </p>
                  </div>
                  <Button
                    onClick={handleSaveDescription}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={loadingDescriptions}
                    data-testid="save-desc-btn"
                  >
                    Save Description
                  </Button>
                </CardContent>
              </Card>

              {/* AI Tools */}
              <div className="space-y-6">
                {/* Refine Description */}
              <Card className="dashboard-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      AI Refine
                    </CardTitle>
                    <CardDescription>Improve your existing description</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Paste your description to refine..."
                      className="resize-y min-h-[120px] max-h-[400px]"
                      value={refineText}
                      onChange={(e) => setRefineText(e.target.value)}
                      data-testid="refine-text-input"
                    />
                    <Button
                      onClick={handleRefineDescription}
                      className="w-full"
                      disabled={loadingRefine}
                      data-testid="refine-btn"
                    >
                      {loadingRefine ? "Refining..." : "Refine with AI"}
                    </Button>
                  </CardContent>
                </Card>

              {/* Generate Description */}
              <Card className="dashboard-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-blue-600" />
                      AI Generate
                    </CardTitle>
                    <CardDescription>Generate from beat details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      placeholder="Email"
                      value={generateForm.email}
                      onChange={(e) => setGenerateForm({ ...generateForm, email: e.target.value })}
                      data-testid="gen-email-input"
                    />
                    <Input
                      placeholder="Socials"
                      value={generateForm.socials}
                      onChange={(e) => setGenerateForm({ ...generateForm, socials: e.target.value })}
                      data-testid="gen-socials-input"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Key"
                        value={generateForm.key}
                        onChange={(e) => setGenerateForm({ ...generateForm, key: e.target.value })}
                        data-testid="gen-key-input"
                      />
                      <Input
                        placeholder="BPM"
                        value={generateForm.bpm}
                        onChange={(e) => setGenerateForm({ ...generateForm, bpm: e.target.value })}
                        data-testid="gen-bpm-input"
                      />
                    </div>
                    <Input
                      placeholder="Prices"
                      value={generateForm.prices}
                      onChange={(e) => setGenerateForm({ ...generateForm, prices: e.target.value })}
                      data-testid="gen-prices-input"
                    />
                    <Textarea
                      placeholder="Additional info"
                      rows={2}
                      value={generateForm.additional_info}
                      onChange={(e) => setGenerateForm({ ...generateForm, additional_info: e.target.value })}
                      data-testid="gen-additional-input"
                    />
                    <Button
                      onClick={handleGenerateDescription}
                      className="w-full"
                      disabled={loadingGenerate}
                      data-testid="generate-desc-btn"
                    >
                      {loadingGenerate ? "Generating..." : "Generate with AI"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Saved Descriptions */}
            <Card className="dashboard-card producer-card">
              <CardHeader>
                <CardTitle>Saved Descriptions ({descriptions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {descriptions.length === 0 ? (
                  <p className="text-center py-8" style={{color: 'var(--text-secondary)'}} data-testid="no-descriptions-msg">No saved descriptions yet. Create one above!</p>
                ) : (
                  <div className="space-y-3" data-testid="descriptions-list">
                    {descriptions.map((desc) => {
                      const isExpanded = expandedDescriptions.has(desc.id);
                      const preview = desc.content.substring(0, 150);
                      const showPreview = !isExpanded && desc.content.length > 150;
                      
                      return (
                        <div key={desc.id} className="p-4 rounded-lg bg-black/20 dark:bg-black/40 backdrop-blur-sm" data-testid={`desc-item-${desc.id}`}>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold" style={{color: 'var(--text-primary)'}}>{desc.title}</h3>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyDescription(desc.content)}
                                data-testid={`copy-desc-${desc.id}`}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingDesc(desc)}
                                    data-testid={`edit-desc-${desc.id}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Description</DialogTitle>
                                    <DialogDescription>Make changes to your description</DialogDescription>
                                  </DialogHeader>
                                  {editingDesc && (
                                    <div className="space-y-4">
                                      <Input
                                        value={editingDesc.title}
                                        onChange={(e) => setEditingDesc({ ...editingDesc, title: e.target.value })}
                                        data-testid="edit-title-input"
                                      />
                                      <Textarea
                                        rows={8}
                                        value={editingDesc.content}
                                        onChange={(e) => setEditingDesc({ ...editingDesc, content: e.target.value })}
                                        data-testid="edit-content-input"
                                      />
                                      <Button onClick={handleUpdateDescription} className="w-full" data-testid="update-desc-btn">
                                        Save Changes
                                      </Button>
                                    </div>
                                  )}
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteDescription(desc.id)}
                                data-testid={`delete-desc-${desc.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div 
                            className="text-sm text-slate-600 whitespace-pre-wrap cursor-pointer"
                            onClick={() => toggleDescriptionExpand(desc.id)}
                          >
                            {showPreview ? (
                              <>
                                {preview}...
                                <span className="text-blue-600 font-medium ml-2">Click to expand</span>
                              </>
                            ) : (
                              <>
                                {desc.content}
                                {desc.content.length > 150 && (
                                  <span className="text-blue-600 font-medium ml-2 block mt-2">Click to collapse</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* YouTube Upload Tab */}
          <TabsContent value="upload" className="space-y-6 dashboard-section">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-600" />
                  Upload Beat to YouTube
                </CardTitle>
                <CardDescription>Connect your YouTube account and upload beats automatically</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                {/* YouTube Connection Status */}
                <div className="p-4 sm:p-5 md:p-6 rounded-lg dashboard-card-muted">
                  {youtubeConnected ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1">
                        {youtubeProfilePicture && (
                          <img 
                            src={youtubeProfilePicture} 
                            alt={youtubeName || youtubeEmail}
                            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full border-2 border-green-500 flex-shrink-0"
                          />
                        )}
                        {!youtubeProfilePicture && (
                          <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate" style={{color: 'var(--text-primary)'}}>
                            {youtubeName || "YouTube Connected"}
                          </p>
                          <p className="text-xs sm:text-sm truncate" style={{color: 'var(--text-secondary)'}}>{youtubeEmail}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={disconnectYouTube}
                        data-testid="disconnect-youtube-btn"
                        className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base whitespace-nowrap"
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-3 mb-3 sm:mb-4">
                        <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 flex-shrink-0" />
                        <p className="font-medium text-sm sm:text-base" style={{color: 'var(--text-primary)'}}>YouTube Not Connected</p>
                      </div>
                      <Button
                        onClick={connectYouTube}
                        className="w-full bg-red-600 hover:bg-red-700 text-white py-5 sm:py-6 text-base sm:text-lg"
                        data-testid="connect-youtube-btn"
                      >
                        <Link className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                        Login to Connect Your YouTube Account!
                      </Button>
                    </div>
                  )}
                </div>

                {/* AI YouTube Tools */}
                <Card className="producer-card border-l-4 border-emerald-500">
                  <CardContent className="p-4 sm:p-5 md:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <p className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                        <Wand2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 flex-shrink-0" />
                        <span>AI YouTube Tools</span>
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAiYoutubeTools((prev) => !prev)}
                        className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm whitespace-nowrap"
                      >
                        {showAiYoutubeTools ? "Hide" : "Show"}
                        {showAiYoutubeTools ? (
                          <ChevronUp className="ml-2 h-4 w-4" />
                        ) : (
                          <ChevronDown className="ml-2 h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs sm:text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
                      Beat Analyzer + Thumbnail Checker
                    </p>

                    {showAiYoutubeTools && (
                      <div className="mt-4 space-y-4">
                        <div className="rounded-lg border p-4 sm:p-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                            <p className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                              <Target className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 flex-shrink-0" />
                              <span>Check Your Beat's Potential</span>
                            </p>
                            <Button
                              onClick={handleAnalyzeBeat}
                              disabled={analyzingBeat || !uploadTitle || !hasEffectiveTags}
                              variant="outline"
                              size="default"
                              className="w-full sm:w-auto border-yellow-500 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950 px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base whitespace-nowrap"
                              title={!uploadTitle ? "Please add a title first" : !hasEffectiveTags ? "Please select or generate tags first" : "Analyze your beat"}
                            >
                              {analyzingBeat ? "Analyzing..." : "Analyze Beat"}
                            </Button>
                          </div>

                          {(!uploadTitle || !hasEffectiveTags) && !beatAnalysis && !analyzingBeat && (
                            <Alert className="mb-4 p-3 sm:p-4">
                              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                              <AlertDescription className="text-xs sm:text-sm leading-relaxed">
                                {!uploadTitle && !hasEffectiveTags ? (
                                  <>First, add a title and either generate tags in <strong>Tags</strong> or select tags in <strong>Upload</strong>.</>
                                ) : !uploadTitle ? (
                                  <>Add a title below to analyze your beat.</>
                                ) : (
                                  <>Select tags in <strong>Upload</strong> or generate them in <strong>Tags</strong> first, then analyze.</>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                          {beatAnalysis && (
                            <div className="space-y-3 sm:space-y-4 mt-4">
                              <div className="text-center p-4 rounded-lg" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                                <p className="text-3xl font-bold gradient-text mb-1">{beatAnalysis.overall_score}/100</p>
                                <p className="text-sm font-semibold" style={{color: 'var(--text-secondary)'}}>
                                  Predicted: {beatAnalysis.predicted_performance}
                                </p>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="text-center p-2 rounded" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                                  <p className="text-xl font-bold">{beatAnalysis.title_score}</p>
                                  <p className="text-xs" style={{color: 'var(--text-secondary)'}}>Title</p>
                                </div>
                                <div className="text-center p-2 rounded" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                                  <p className="text-xl font-bold">{beatAnalysis.tags_score}</p>
                                  <p className="text-xs" style={{color: 'var(--text-secondary)'}}>Tags</p>
                                </div>
                                <div className="text-center p-2 rounded" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                                  <p className="text-xl font-bold">{beatAnalysis.seo_score}</p>
                                  <p className="text-xs" style={{color: 'var(--text-secondary)'}}>SEO</p>
                                </div>
                              </div>

                              <div>
                                <p className="font-semibold text-green-600 mb-2 text-sm">Strengths:</p>
                                <ul className="text-sm space-y-1">
                                  {beatAnalysis.strengths.map((s, i) => (
                                    <li key={i} className="text-green-600">- {s}</li>
                                  ))}
                                </ul>
                              </div>

                              {beatAnalysis.weaknesses.length > 0 && (
                                <div>
                                  <p className="font-semibold text-orange-600 mb-2 text-sm">Needs Work:</p>
                                  <ul className="text-sm space-y-1">
                                    {beatAnalysis.weaknesses.map((w, i) => (
                                      <li key={i} className="text-orange-600">- {w}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              <div>
                                <p className="font-semibold text-blue-600 mb-2 text-sm">Suggestions:</p>
                                <ul className="text-sm space-y-1">
                                  {beatAnalysis.suggestions.map((s, i) => (
                                    <li key={i} style={{color: 'var(--text-primary)'}}>- {s}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                          {beatAnalysis && (
                            <div className="mt-4 flex justify-center">
                              <Button
                                onClick={handleApplyBeatFixes}
                                disabled={applyingBeatFixes}
                                variant="outline"
                                size="default"
                                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950 px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base whitespace-nowrap"
                              >
                                {applyingBeatFixes ? "Applying Fixes..." : "Add Fixes"}
                              </Button>
                            </div>
                          )}

                          {!beatAnalysis && !analyzingBeat && (
                            <p className="text-xs sm:text-sm text-center leading-relaxed px-2" style={{color: 'var(--text-secondary)'}}>
                              Fill in title & tags, then analyze to see how well your beat will perform!
                            </p>
                          )}
                        </div>

                        <div className="rounded-lg border p-4 sm:p-5" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                            <p className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 flex-shrink-0" />
                              <span>Thumbnail Checker (AI)</span>
                            </p>
                            <div className="flex w-full sm:w-auto gap-2">
                              <Button
                                onClick={handleThumbnailCheck}
                                disabled={checkingThumbnail || !thumbnailCheckFile || !thumbnailContextReady}
                                variant="outline"
                                size="default"
                                className="w-full sm:w-auto border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950 px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base whitespace-nowrap"
                              >
                                {checkingThumbnail ? "Checking..." : "Check Thumbnail"}
                              </Button>
                              {imageFile && (
                                <Button
                                  onClick={() => handleThumbnailCheck(imageFile)}
                                  disabled={checkingThumbnail || !thumbnailContextReady}
                                  variant="outline"
                                  size="default"
                                  className="w-full sm:w-auto border-emerald-500/70 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950 px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base whitespace-nowrap"
                                >
                                  Check Uploaded Thumbnail
                                </Button>
                              )}
                              {checkingThumbnail && (
                                <Button
                                  onClick={cancelThumbnailCheck}
                                  variant="ghost"
                                  size="default"
                                  className="w-full sm:w-auto text-slate-600 dark:text-slate-300"
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </div>
                          {checkingThumbnail && (
                            <div className="mb-3">
                              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 bg-emerald-500 transition-all duration-300"
                                  style={{ width: `${thumbnailProgress}%` }}
                                />
                              </div>
                              <p className="text-xs text-center mt-1" style={{ color: 'var(--text-secondary)' }}>
                                Analyzing thumbnail... {thumbnailProgress}%
                              </p>
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="border-2 border-dashed rounded-lg p-3 text-center" style={{ borderColor: 'var(--border-color)' }}>
                              <Input
                                id="thumbnail-check-upload"
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,.avif,.heic,.heif"
                                onChange={(e) => setThumbnailCheckFile(e.target.files?.[0] || null)}
                                className="hidden"
                                data-testid="thumbnail-check-upload-input"
                              />
                              <label htmlFor="thumbnail-check-upload" className="cursor-pointer">
                                <Upload className="h-7 w-7 mx-auto mb-2 text-slate-400" />
                                {thumbnailCheckFile ? (
                                  <p className="text-sm text-green-600 font-medium">{thumbnailCheckFile.name}</p>
                                ) : (
                                  <p className="text-sm text-slate-600">Click to upload thumbnail</p>
                                )}
                              </label>
                            </div>

                            {imageFile && !thumbnailCheckFile && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setThumbnailCheckFile(imageFile)}
                                className="w-full text-xs sm:text-sm"
                              >
                                Use uploaded thumbnail image
                              </Button>
                            )}

                            <p className="text-xs text-center" style={{color: 'var(--text-secondary)'}}>
                              Requires title, description, and tags. Uses 1 AI credit.
                            </p>
                          </div>

                          {thumbnailCheckResult && (
                            <div className="mt-4 space-y-3">
                              <div className="text-center p-3 rounded-lg" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                                <p className="text-2xl font-bold gradient-text mb-1">{thumbnailCheckResult.score}/100</p>
                                <p className="text-xs sm:text-sm" style={{color: 'var(--text-secondary)'}}>
                                  {thumbnailCheckResult.verdict}
                                </p>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <p className="font-semibold text-emerald-600 mb-1 text-sm">Strengths</p>
                                  <ul className="text-xs sm:text-sm space-y-1">
                                    {thumbnailCheckResult.strengths.map((s, i) => (
                                      <li key={i} className="text-emerald-600">- {s}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <p className="font-semibold text-orange-600 mb-1 text-sm">Issues</p>
                                  <ul className="text-xs sm:text-sm space-y-1">
                                    {thumbnailCheckResult.issues.map((s, i) => (
                                      <li key={i} className="text-orange-600">- {s}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                              <div>
                                <p className="font-semibold text-blue-600 mb-1 text-sm">Suggestions</p>
                                <ul className="text-xs sm:text-sm space-y-1">
                                  {thumbnailCheckResult.suggestions.map((s, i) => (
                                    <li key={i} style={{color: 'var(--text-primary)'}}>- {s}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="text-xs sm:text-sm rounded-lg p-3" style={{backgroundColor: 'var(--bg-secondary)'}}>
                                <p><strong>Overlay idea:</strong> {thumbnailCheckResult.text_overlay_suggestion}</p>
                                <p><strong>Branding:</strong> {thumbnailCheckResult.branding_suggestion}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {youtubeConnected && (
                  <div className="space-y-6">
                    {/* File Uploads */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="audio-upload">Audio File (MP3, WAV)</Label>
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition-shadow ${
                            isAudioDragActive && isAudioDragValid
                              ? "border-white shadow-[0_0_24px_rgba(255,255,255,0.9)]"
                              : "border-slate-300"
                          }`}
                          onDragOver={handleAudioDragOver}
                          onDragEnter={handleAudioDragOver}
                          onDragLeave={handleAudioDragLeave}
                          onDrop={handleAudioDrop}
                        >
                          <Input
                            id="audio-upload"
                            type="file"
                            accept=".mp3,.wav,.m4a,.flac,.ogg"
                            onChange={handleAudioUpload}
                            className="hidden"
                            data-testid="audio-upload-input"
                          />
                          <label htmlFor="audio-upload" className="cursor-pointer">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                            {uploadingAudio ? (
                              <div>
                                <p className="text-sm text-slate-600 mb-2">Uploading... {uploadProgress}%</p>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                                    style={{width: `${uploadProgress}%`}}
                                  />
                                </div>
                              </div>
                            ) : audioFile ? (
                              <p className="text-sm text-green-600 font-medium">{audioFile.name}</p>
                            ) : (
                              <p className="text-sm text-slate-600">Click to upload audio</p>
                            )}
                          </label>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="image-upload">Thumbnail Image (JPG, PNG)</Label>
                        <div
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition-shadow ${
                            isImageDragActive && isImageDragValid
                              ? "border-white shadow-[0_0_24px_rgba(255,255,255,0.9)]"
                              : "border-slate-300"
                          }`}
                          onDragOver={handleImageDragOver}
                          onDragEnter={handleImageDragOver}
                          onDragLeave={handleImageDragLeave}
                          onDrop={handleImageDrop}
                        >
                          <Input
                            id="image-upload"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.avif,.heic,.heif"
                            onChange={handleImageUpload}
                            className="hidden"
                            data-testid="image-upload-input"
                          />
                          <label htmlFor="image-upload" className="cursor-pointer">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                            {uploadingImage ? (
                              <p className="text-sm text-slate-600">Uploading...</p>
                            ) : imageFile ? (
                              <p className="text-sm text-green-600 font-medium">{imageFile.name}</p>
                            ) : (
                              <p className="text-sm text-slate-600">Click to upload image</p>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Upload Details */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="upload-title">Video Title</Label>
                        <Input
                          id="upload-title"
                          placeholder="Your Beat Title"
                          value={uploadTitle}
                          onChange={(e) => setUploadTitle(e.target.value)}
                          data-testid="upload-title-input"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="select-description">Select Description Template</Label>
                        <Select value={selectedDescriptionId} onValueChange={setSelectedDescriptionId}>
                          <SelectTrigger id="select-description" data-testid="select-description">
                            <SelectValue placeholder="Choose a description" />
                          </SelectTrigger>
                          <SelectContent>
                            {descriptions.map((desc) => (
                              <SelectItem key={desc.id} value={desc.id}>
                                {desc.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="upload-description">Edit Description</Label>
                        <Textarea
                          id="upload-description"
                          placeholder="Edit your description before upload"
                          value={uploadDescriptionText}
                          onChange={(e) => setUploadDescriptionText(e.target.value)}
                          rows={6}
                        />
                        <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                          A line will be added to the top: "Visit www.sendmybeat.com to upload beats for free!"
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="select-tags">Select Tags (Optional)</Label>
                        <Select value={selectedTagsId} onValueChange={setSelectedTagsId}>
                          <SelectTrigger id="select-tags" data-testid="select-tags">
                            <SelectValue placeholder="Choose tags" />
                          </SelectTrigger>
                          <SelectContent>
                            {refinedTags.length > 0 && (
                              <SelectItem value="refined">
                                {refinedTagsLabel || "Refined Tags"} ({refinedTags.length} tags)
                              </SelectItem>
                            )}
                            {tagHistory.map((tag) => (
                              <SelectItem key={tag.id} value={tag.id}>
                                {formatTagHistoryLabel(tag.query)} ({tag.tags.length} tags)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {hasEffectiveTags && (
                          <p className="text-xs" style={{color: 'var(--text-secondary)'}}>
                            Using {effectiveTags.length} tags
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="aspect-ratio">Video Aspect Ratio</Label>
                        <Select value={videoAspectRatio} onValueChange={setVideoAspectRatio}>
                          <SelectTrigger id="aspect-ratio" data-testid="aspect-ratio">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="16:9">16:9 (Wide)</SelectItem>
                            <SelectItem value="1:1">1:1 (Square)</SelectItem>
                            <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                            <SelectItem value="4:5">4:5 (Portrait)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {audioFile && imageFile && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Image Settings</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowImageSettings((prev) => !prev)}
                          >
                            {showImageSettings ? "Hide" : "Show"}
                          </Button>
                        </div>

                        {showImageSettings && (
                          <>
                        <Label>Background & Image Position</Label>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant={backgroundColor === "black" ? "default" : "outline"}
                            onClick={() => setBackgroundColor("black")}
                            className="text-xs sm:text-sm"
                          >
                            Black Background
                          </Button>
                          <Button
                            type="button"
                            variant={backgroundColor === "white" ? "default" : "outline"}
                            onClick={() => setBackgroundColor("white")}
                            className="text-xs sm:text-sm"
                          >
                            White Background
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Quick Position</Label>
                          <div className="grid grid-cols-3 gap-2">
                            <Button type="button" variant="outline" className="text-xs" onClick={() => { setImagePosX(-1); setImagePosY(0); }}>
                              Left
                            </Button>
                            <Button type="button" variant="outline" className="text-xs" onClick={() => { setImagePosX(0); setImagePosY(0); }}>
                              Center
                            </Button>
                            <Button type="button" variant="outline" className="text-xs" onClick={() => { setImagePosX(1); setImagePosY(0); }}>
                              Right
                            </Button>
                          </div>
                          <div className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={fitImageToFrame}>
                              Fit image
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="image-scale-x" className="text-sm">Scale X</Label>
                            <span className="text-xs" style={{color: 'var(--text-secondary)'}}>{imageScaleX.toFixed(2)}x</span>
                          </div>
                          <Input
                            id="image-scale-x"
                            type="range"
                            min="0.5"
                            max="1"
                            step="0.05"
                            value={imageScaleX}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setImageScaleX(value);
                              if (lockImageScale) setImageScaleY(value);
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="image-scale-y" className="text-sm">Scale Y</Label>
                            <span className="text-xs" style={{color: 'var(--text-secondary)'}}>{imageScaleY.toFixed(2)}x</span>
                          </div>
                          <Input
                            id="image-scale-y"
                            type="range"
                            min="0.5"
                            max="1"
                            step="0.05"
                            value={imageScaleY}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              setImageScaleY(value);
                              if (lockImageScale) setImageScaleX(value);
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="preview-size" className="text-sm">Preview Scale</Label>
                            <span className="text-xs" style={{color: 'var(--text-secondary)'}}>{previewSize}px</span>
                          </div>
                          <Input
                            id="preview-size"
                            type="range"
                            min="280"
                            max="720"
                            step="10"
                            value={previewSize}
                            onChange={(e) => setPreviewSize(Number(e.target.value))}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              id="lock-image-scale"
                              type="checkbox"
                              checked={lockImageScale}
                              onChange={(e) => {
                                const locked = e.target.checked;
                                setLockImageScale(locked);
                                if (locked) setImageScaleY(imageScaleX);
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <Label htmlFor="lock-image-scale" className="text-sm cursor-pointer">
                              Lock X/Y scale
                            </Label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="image-pos-x" className="text-sm">Horizontal Position</Label>
                            <span className="text-xs" style={{color: 'var(--text-secondary)'}}>{imagePosX.toFixed(2)}</span>
                          </div>
                          <Input
                            id="image-pos-x"
                            type="range"
                            min="-1"
                            max="1"
                            step="0.05"
                            value={imagePosX}
                            onChange={(e) => setImagePosX(Number(e.target.value))}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="image-pos-y" className="text-sm">Vertical Position</Label>
                            <span className="text-xs" style={{color: 'var(--text-secondary)'}}>{imagePosY.toFixed(2)}</span>
                          </div>
                          <Input
                            id="image-pos-y"
                            type="range"
                            min="-1"
                            max="1"
                            step="0.05"
                            value={imagePosY}
                            onChange={(e) => setImagePosY(Number(e.target.value))}
                          />
                        </div>
                        </>
                        )}
                      </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="privacy-status">Privacy Status</Label>
                        <Select value={privacyStatus} onValueChange={setPrivacyStatus}>
                          <SelectTrigger id="privacy-status" data-testid="privacy-status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="unlisted">Unlisted</SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Watermark Removal Option */}
                      <div className="space-y-2 p-4 rounded-lg border-2" style={{
                        borderColor: subscriptionStatus?.is_subscribed ? 'var(--accent-primary)' : 'var(--border-color)',
                        backgroundColor: 'var(--bg-secondary)'
                      }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="remove-watermark"
                              checked={removeWatermark}
                              onChange={(e) => {
                                if (!subscriptionStatus?.is_subscribed && e.target.checked) {
                                  // Free user trying to enable - show upgrade modal
                                  setShowUpgradeModal(true);
                                  toast.info("Upgrade to Pro to remove watermarks!");
                                } else {
                                  setRemoveWatermark(e.target.checked);
                                }
                              }}
                              disabled={!subscriptionStatus?.is_subscribed && removeWatermark}
                              className="w-4 h-4 cursor-pointer"
                              data-testid="remove-watermark-checkbox"
                            />
                            <Label htmlFor="remove-watermark" className="cursor-pointer text-sm font-medium">
                              Remove watermark
                            </Label>
                          </div>
                          {!subscriptionStatus?.is_subscribed && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold">
                              PRO
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                          {subscriptionStatus?.is_subscribed 
                            ? "✅ As a Pro member, you can remove the watermark from your videos"
                            : "⚠️ Free users get a small watermark at the top: \"Upload your beats online: https://sendmybeat.com\""}}
                        </p>
                      </div>

                      {/* Preview Player */}
                      {audioFile && imageFile && (
                        <Card className="producer-card border-l-4 border-blue-500" ref={previewSectionRef}>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Music className="h-5 w-5 text-blue-500" />
                              Preview Your Beat Video
                            </CardTitle>
                            <CardDescription>See how your beat will look on YouTube</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div
                              className="relative rounded-lg overflow-hidden"
                              ref={previewContainerRef}
                              style={{
                                backgroundColor: backgroundColor === "white" ? "#ffffff" : "#000000",
                                overflow: 'hidden',
                                width: `${frameWidth}px`,
                                height: `${frameHeight}px`,
                                maxWidth: '100%',
                                minWidth: '220px',
                                minHeight: '220px',
                                aspectRatio: previewAspectRatio
                              }}
                            >
                              <div
                                className="absolute inset-0 cursor-move"
                                onMouseDown={handlePreviewMouseDown}
                                aria-label="Drag image"
                              />
                              <div
                                className="absolute"
                                style={{
                                  width: `${fitWidth}px`,
                                  height: `${fitHeight}px`,
                                  left: `${fitLeft}px`,
                                  top: `${fitTop}px`,
                                  transform: `translate(${imagePosX * 50}%, ${imagePosY * 50}%) scale(${imageScaleX}, ${imageScaleY})`,
                                  transformOrigin: "center"
                                }}
                              >
                                <img 
                                  src={imagePreviewUrl} 
                                  alt="Beat cover"
                                  className="w-full h-full object-contain"
                                  style={{ objectFit: "contain" }}
                                />
                                <div className="absolute inset-0 pointer-events-none">
                                  <button
                                    type="button"
                                    onMouseDown={handleResizeStart("tl")}
                                    className="absolute -top-3 -left-3 h-6 w-6 rounded-full aspect-square border-2 border-white/80 bg-black/80 shadow-md pointer-events-auto"
                                    aria-label="Resize top left"
                                  />
                                  <button
                                    type="button"
                                    onMouseDown={handleResizeStart("tr")}
                                    className="absolute -top-3 -right-3 h-6 w-6 rounded-full aspect-square border-2 border-white/80 bg-black/80 shadow-md pointer-events-auto"
                                    aria-label="Resize top right"
                                  />
                                  <button
                                    type="button"
                                    onMouseDown={handleResizeStart("bl")}
                                    className="absolute -bottom-3 -left-3 h-6 w-6 rounded-full aspect-square border-2 border-white/80 bg-black/80 shadow-md pointer-events-auto"
                                    aria-label="Resize bottom left"
                                  />
                                  <button
                                    type="button"
                                    onMouseDown={handleResizeStart("br")}
                                    className="absolute -bottom-3 -right-3 h-6 w-6 rounded-full aspect-square border-2 border-white/80 bg-black/80 shadow-md pointer-events-auto"
                                    aria-label="Resize bottom right"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-lg p-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                              <audio 
                                controls 
                                className="w-full"
                                src={audioPreviewUrl}
                                style={{
                                  height: '40px',
                                  filter: 'invert(1) hue-rotate(180deg)'
                                }}
                              >
                                Your browser doesn't support audio
                              </audio>
                            </div>
                              <p className="text-sm mt-3 text-center" style={{color: 'var(--text-secondary)'}}>
                                Drag to reposition. Scale down only. Use "Fit image" to lock. Aspect ratio: {videoAspectRatio}
                              </p>
                          </CardContent>
                        </Card>
                      )}

                      <Button
                        onClick={handleYouTubeUpload}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        disabled={uploadingToYouTube || !audioFileId || !imageFileId}
                        data-testid="youtube-upload-btn"
                      >
                        {uploadingToYouTube ? "Uploading to YouTube..." : "Upload to YouTube"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* YouTube Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 dashboard-section">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-purple-500" />
                  YouTube Channel Analytics
                </CardTitle>
                <CardDescription>
                  Get AI-powered insights on your channel performance (uses 1 AI credit)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isPro && (
                  <div>
                    {!youtubeConnected ? (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Connect your YouTube account first to analyze your channel.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Button
                        onClick={handleAnalyzeChannel}
                        disabled={loadingAnalytics || !isPro}
                        className="w-full btn-modern"
                      >
                        <Sparkles className="mr-2 h-5 w-5" />
                        {loadingAnalytics ? "Analyzing..." : "Analyze My Channel"}
                      </Button>
                    )}

                    {analyticsData && (
                      <div className="space-y-6 mt-6">
                    {/* Channel Health Score */}
                    <Card className="producer-card glass-card border-2 border-purple-500">
                      <CardContent className="p-6">
                        <div className="text-center">
                          <p className="text-sm font-semibold text-purple-500 mb-2">CHANNEL HEALTH SCORE</p>
                          <p className="text-4xl font-bold gradient-text mb-3">{analyticsData.insights.channel_health_score?.split('-')[0] || 'N/A'}</p>
                          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{analyticsData.insights.channel_health_score?.split('-').slice(1).join('-') || ''}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Channel Overview Stats */}
                    <Card className="producer-card">
                      <CardHeader>
                        <CardTitle className="text-lg">{analyticsData.channel_name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold gradient-text">{analyticsData.subscriber_count.toLocaleString()}</p>
                            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Subscribers</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold gradient-text">{analyticsData.total_views.toLocaleString()}</p>
                            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Total Views</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold gradient-text">{analyticsData.total_videos}</p>
                            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Videos</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Growth Roadmap - Featured Section */}
                    <Card className="producer-card border-l-4 border-purple-500">
                      <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Music className="h-6 w-6 text-purple-500" />
                          Your Growth Roadmap
                        </CardTitle>
                        <CardDescription>Your personalized path to YouTube success</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="leading-relaxed whitespace-pre-wrap">{analyticsData.insights.growth_roadmap}</p>
                      </CardContent>
                    </Card>

                    {/* What's Working Well */}
                    <Card className="producer-card border-l-4 border-green-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                          What's Working Well
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {analyticsData.insights.what_works?.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                              <span className="text-green-500 text-xl">✓</span>
                              <span className="flex-1">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Critical Issues */}
                    <Card className="producer-card border-l-4 border-red-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          Critical Issues Holding You Back
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {analyticsData.insights.critical_issues?.map((issue, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                              <span className="text-red-500 text-xl">⚠</span>
                              <span className="flex-1">{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Immediate Actions */}
                    <Card className="producer-card border-l-4 border-blue-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-blue-500" />
                          Immediate Action Steps
                        </CardTitle>
                        <CardDescription>Do these TODAY to start growing</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {analyticsData.insights.immediate_actions?.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 rounded-lg border-2 border-blue-500/20" style={{backgroundColor: 'var(--bg-secondary)'}}>
                              <span className="text-blue-500 font-bold text-lg">{idx + 1}</span>
                              <span className="flex-1 font-medium">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* SEO Optimization */}
                    <Card className="producer-card border-l-4 border-yellow-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-yellow-500" />
                          SEO & Discoverability Strategy
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {analyticsData.insights.seo_optimization?.map((tip, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                              <span className="text-yellow-500">🔍</span>
                              <span className="flex-1">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Content Strategy */}
                    <Card className="producer-card border-l-4 border-indigo-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Youtube className="h-5 w-5 text-indigo-500" />
                          Content Strategy
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {analyticsData.insights.content_strategy?.map((strategy, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                              <span className="text-indigo-500">📹</span>
                              <span className="flex-1">{strategy}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Discoverability Tactics */}
                    <Card className="producer-card border-l-4 border-cyan-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Link className="h-5 w-5 text-cyan-500" />
                          Discoverability Tactics
                        </CardTitle>
                        <CardDescription>Get more eyeballs on your beats</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {analyticsData.insights.discoverability_tactics?.map((tactic, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                              <span className="text-cyan-500">🚀</span>
                              <span className="flex-1">{tactic}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Internet Money Lessons */}
                    <Card className="producer-card border-l-4 border-pink-500">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Music className="h-5 w-5 text-pink-500" />
                          Learn From Internet Money
                        </CardTitle>
                        <CardDescription>Proven tactics from successful producers</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {analyticsData.insights.internet_money_lessons?.map((lesson, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                              <span className="text-pink-500">💎</span>
                              <span className="flex-1">{lesson}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    {/* Recent Videos Performance */}
                    {analyticsData.recent_videos?.length > 0 && (
                      <Card className="producer-card">
                        <CardHeader>
                          <CardTitle className="text-lg">Recent Videos Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {analyticsData.recent_videos.slice(0, 5).map((video, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                                <div className="flex-1 pr-4">
                                  <p className="font-medium text-sm">{video.title}</p>
                                </div>
                                <div className="flex gap-4 text-sm">
                                  <span>{video.views.toLocaleString()} views</span>
                                  <span>{video.likes.toLocaleString()} likes</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                    )}
                  </div>
                )}

                {!isPro && (
                  <div className="flex items-center justify-center py-8">
                    <div
                      className="w-full max-w-md text-center p-6 rounded-xl border-2 shadow-lg"
                      style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--accent-primary)" }}
                    >
                      <p className="text-lg font-semibold mb-2">Unlock Analytics</p>
                      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                        Premium-only insights. Upgrade to access analytics and AI coaching.
                      </p>
                      <Button onClick={() => setShowUpgradeModal(true)} className="btn-modern">
                        Upgrade to Pro
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grow in 120 Tab */}
          <TabsContent value="grow" className="space-y-4 sm:space-y-6 dashboard-section">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">🔥</span>
                  Grow in 120 - Build Your Producer Momentum
                </CardTitle>
                <CardDescription>
                  Work every day for 120 days. Generate tags, upload beats, or create descriptions to maintain your streak!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 relative">
                <div
                  style={{
                    filter: isPro ? "none" : "blur(6px)",
                    pointerEvents: isPro ? "auto" : "none"
                  }}
                >
                {!growthData?.challenge_start_date ? (
                  // Not started
                  <div className="text-center py-12">
                    <div className="mb-6">
                      <p className="text-5xl mb-4">🚀</p>
                      <h3 className="text-2xl font-bold mb-2">Ready to Commit?</h3>
                      <p className="text-lg mb-6" style={{color: 'var(--text-secondary)'}}>
                        Join the 120-day challenge and build unstoppable momentum
                      </p>
                    </div>
                    <Button
                      onClick={handleStartChallenge}
                      disabled={loadingGrowth}
                      className="btn-modern text-lg py-6 px-12"
                    >
                      {loadingGrowth ? "Starting..." : "Start My 120-Day Journey"}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <Card className="producer-card">
                        <CardContent className="p-4 sm:p-6 text-center">
                          <p className="text-3xl sm:text-4xl font-bold mb-2">{growthData.current_streak} 🔥</p>
                          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Current Streak</p>
                        </CardContent>
                      </Card>
                      <Card className="producer-card">
                        <CardContent className="p-4 sm:p-6 text-center">
                          <p className="text-3xl sm:text-4xl font-bold mb-2">{growthData.total_days_completed}/120</p>
                          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Days Complete</p>
                        </CardContent>
                      </Card>
                      <Card className="producer-card">
                        <CardContent className="p-4 sm:p-6 text-center">
                          <p className="text-3xl sm:text-4xl font-bold mb-2">{growthData.longest_streak} 🏆</p>
                          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Longest Streak</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Progress Bar */}
                    <Card className="producer-card">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-wrap justify-between gap-2 mb-2">
                          <p className="font-semibold">Challenge Progress</p>
                          <p className="font-bold gradient-text">
                            {Math.round((growthData.total_days_completed / 120) * 100)}%
                          </p>
                        </div>
                        <div className="h-4 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                            style={{ width: `${(growthData.total_days_completed / 120) * 100}%` }}
                          />
                        </div>
                        <p className="text-sm mt-2 text-center" style={{color: 'var(--text-secondary)'}}>
                          {120 - growthData.total_days_completed} days remaining
                        </p>
                      </CardContent>
                    </Card>

                    {/* Check-in Button */}
                    <Card className="producer-card border-l-4 border-blue-500">
                      <CardContent className="p-4 sm:p-6">
                        <div className="mb-4">
                          <p className="font-semibold mb-2">📋 Daily Requirements:</p>
                          <ul className="text-sm space-y-1" style={{color: 'var(--text-secondary)'}}>
                            <li>✓ Generate tags for a beat</li>
                            <li>✓ Upload a beat to YouTube</li>
                            <li>✓ OR create/edit a description</li>
                          </ul>
                          <p className="text-xs mt-3 font-medium" style={{color: 'var(--text-primary)'}}>
                            Complete any task above, then check in to maintain your streak!
                          </p>
                        </div>
                        <Button
                          onClick={handleCheckin}
                          disabled={loadingGrowth}
                          className="w-full btn-modern py-4"
                        >
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          {loadingGrowth ? "Checking in..." : "Check In Today"}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Badges */}
                    {growthData.badges_earned?.length > 0 && (
                      <Card className="producer-card border-l-4 border-yellow-500">
                        <CardHeader>
                          <CardTitle className="text-lg">🏆 Badges Earned</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-3">
                            {growthData.badges_earned.map((badge, idx) => (
                              <div
                                key={idx}
                                className="px-4 py-2 rounded-full font-semibold"
                                style={{backgroundColor: 'var(--bg-secondary)'}}
                              >
                                {badge}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Calendar View */}
                    {calendarData && (
                      <Card className="producer-card">
                        <CardHeader>
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <CardTitle className="text-lg">📅 Your 120-Day Calendar</CardTitle>
                            <Button
                              onClick={fetchCalendar}
                              variant="outline"
                              size="sm"
                            >
                              Refresh
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2 mb-4">
                            {Object.entries(calendarData.calendar || {}).slice(0, 120).map(([date, statusData], index) => {
                              const dayNumber = index + 1;
                              const status = typeof statusData === 'string' ? statusData : statusData.status;
                              const activity = typeof statusData === 'object' ? statusData.activity : null;
                              
                              const bgColor = 
                                status === 'completed' ? 'bg-green-500' :
                                status === 'missed' ? 'bg-red-500' :
                                status === 'today' ? 'bg-purple-500' :
                                'bg-gray-500';
                              
                              return (
                                <div
                                  key={date}
                                  className={`h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12 rounded ${bgColor} opacity-80 hover:opacity-100 transition-all cursor-pointer flex flex-col items-center justify-center text-white font-bold text-[10px] hover:scale-105`}
                                  onClick={() => setSelectedDay({ date, status, dayNumber, activity })}
                                  title={`Day ${dayNumber} - ${date}`}
                                >
                                  <span className="text-[9px] sm:text-[10px]">D{dayNumber}</span>
                                  {status === 'completed' && <span className="text-lg">✓</span>}
                                  {status === 'missed' && <span className="text-lg">✗</span>}
                                  {status === 'today' && <span className="text-lg">•</span>}
                                </div>
                              );
                            })}
                          </div>

                          {/* Selected Day Details */}
                          {selectedDay && (
                            <Card className="mb-4 border-l-4 border-purple-500" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <p className="font-bold text-lg gradient-text">Day {selectedDay.dayNumber}</p>
                                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{selectedDay.date}</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedDay(null)}
                                  >
                                    ×
                                  </Button>
                                </div>
                                <div className="mt-3">
                                  {selectedDay.status === 'completed' && (
                                    <div className="space-y-2">
                                      <p className="font-semibold text-green-600 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Completed!
                                      </p>
                                      <p className="text-sm" style={{color: 'var(--text-primary)'}}>
                                        You crushed it this day! You completed:
                                      </p>
                                      <ul className="text-sm space-y-1">
                                        <li className={selectedDay.activity === 'tag_generation' ? 'text-green-600 font-semibold' : ''} style={{color: selectedDay.activity === 'tag_generation' ? undefined : 'var(--text-secondary)'}}>
                                          {selectedDay.activity === 'tag_generation' ? '✓ ' : '• '}Generated YouTube tags
                                        </li>
                                        <li className={selectedDay.activity === 'youtube_upload' ? 'text-green-600 font-semibold' : ''} style={{color: selectedDay.activity === 'youtube_upload' ? undefined : 'var(--text-secondary)'}}>
                                          {selectedDay.activity === 'youtube_upload' ? '✓ ' : '• '}Uploaded a beat to YouTube
                                        </li>
                                        <li className={selectedDay.activity === 'description_work' ? 'text-green-600 font-semibold' : ''} style={{color: selectedDay.activity === 'description_work' ? undefined : 'var(--text-secondary)'}}>
                                          {selectedDay.activity === 'description_work' ? '✓ ' : '• '}Created/edited a description
                                        </li>
                                        {selectedDay.activity === 'manual_checkin' && (
                                          <li className="text-green-600 font-semibold">
                                            ✓ Manual check-in
                                          </li>
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                  {selectedDay.status === 'missed' && (
                                    <div>
                                      <p className="font-semibold text-red-600 flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Missed Day
                                      </p>
                                      <p className="text-sm mt-2" style={{color: 'var(--text-primary)'}}>
                                        No activity recorded. Your streak reset. Keep pushing forward!
                                      </p>
                                    </div>
                                  )}
                                  {selectedDay.status === 'today' && (
                                    <div>
                                      <p className="font-semibold text-purple-600 flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        Today's the Day!
                                      </p>
                                      <p className="text-sm mt-2" style={{color: 'var(--text-primary)'}}>
                                        Complete a task and check in to keep your streak alive!
                                      </p>
                                    </div>
                                  )}
                                  {selectedDay.status === 'future' && (
                                    <div>
                                      <p className="font-semibold" style={{color: 'var(--text-secondary)'}}>
                                        Future Day
                                      </p>
                                      <p className="text-sm mt-2" style={{color: 'var(--text-secondary)'}}>
                                        This day is coming up. Stay consistent!
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}

                          <div className="flex flex-wrap gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded bg-green-500" />
                              <span>Complete</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded bg-red-500" />
                              <span>Missed</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded bg-purple-500" />
                              <span>Today</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded bg-gray-500" />
                              <span>Future</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Load calendar on tab view */}
                    {!calendarData && fetchCalendar()}
                  </>
                )}
                </div>

                {!isPro && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center p-6 rounded-xl border-2 shadow-lg max-w-md"
                      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--accent-primary)' }}
                    >
                      <p className="text-lg font-semibold mb-2">Unlock Grow in 120</p>
                      <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
                        Premium-only momentum tracking. Upgrade to access the 120-day challenge.
                      </p>
                      <Button onClick={() => setShowUpgradeModal(true)} className="btn-modern">
                        Upgrade to Pro
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Save Refined Text Dialog */}
      <Dialog open={showSaveRefinedDialog} onOpenChange={setShowSaveRefinedDialog}>
        <DialogContent data-testid="save-refined-dialog">
          <DialogHeader>
            <DialogTitle>Save Refined Description?</DialogTitle>
            <DialogDescription>
              Would you like to save this AI-refined description as a template?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={refinedTextToSave}
              readOnly
              rows={6}
              className="resize-none"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSaveRefinedAsTemplate}
                className="flex-1"
                data-testid="save-refined-yes-btn"
              >
                Yes, Save as Template
              </Button>
              <Button
                onClick={() => setShowSaveRefinedDialog(false)}
                variant="outline"
                className="flex-1"
                data-testid="save-refined-no-btn"
              >
                No, Thanks
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        loading={upgradingSubscription}
      />

      {/* Check-in Prompt Dialog */}
      <Dialog open={showCheckinPrompt} onOpenChange={setShowCheckinPrompt}>
        <DialogContent className="sm:max-w-md" data-testid="checkin-prompt-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              Keep Your Streak Alive!
            </DialogTitle>
            <DialogDescription>
              Great work! You just completed an activity. Check in now to maintain your Grow in 120 streak!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {growthData && (
              <div className="text-center p-4 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                <p className="text-3xl font-bold gradient-text mb-1">{growthData.current_streak}</p>
                <p className="text-sm font-semibold" style={{color: 'var(--text-secondary)'}}>Day Streak</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  setShowCheckinPrompt(false);
                  await handleCheckin();
                }}
                className="flex-1 btn-modern"
                data-testid="checkin-now-btn"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Check In Now
              </Button>
              <Button
                onClick={() => setShowCheckinPrompt(false)}
                variant="outline"
                className="flex-1"
                data-testid="checkin-later-btn"
              >
                Maybe Later
              </Button>
            </div>
            <p className="text-xs text-center" style={{color: 'var(--text-secondary)'}}>
              You can also check in from the "Grow in 120" tab anytime
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
