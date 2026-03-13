import { useState, useEffect, useRef } from "react";
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
import { Music, Sparkles, Save, LogOut, Copy, Trash2, Edit, Plus, Youtube, CheckCircle2, AlertCircle, Target, ChevronLeft, ChevronRight, DollarSign, Link } from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import UpgradeModal from "@/components/UpgradeModal";
import AdBanner from "@/components/AdBanner";
import ProgressBar from "@/components/ProgressBar";
import ThemeCustomizer from "@/components/ThemeCustomizer";
import UploadStudio from "@/components/UploadStudio";
import BeatHelperStudio from "@/components/BeatHelperStudio";
import { clearAuthToken } from "@/lib/auth";

const TAG_LIMIT = 120;
const TAG_HISTORY_LIMIT = 100;
const ADMIN_USERNAMES = new Set(
  (process.env.REACT_APP_ADMIN_USERNAMES || "deadat18")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
);
const DASHBOARD_TABS = [
  { value: "tags", label: "Tags" },
  { value: "descriptions", label: "Descriptions" },
  { value: "upload", label: "Upload" },
  { value: "analytics", label: "Analytics" },
  { value: "grow", label: "Grow in 120" },
  { value: "beathelper", label: "BeatHelper", proOnly: true },
  { value: "settings", label: "Settings" },
];

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toSafeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeAnalyticsData = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const insights = raw.insights && typeof raw.insights === "object" ? raw.insights : {};

  return {
    channel_name: typeof raw.channel_name === "string" ? raw.channel_name : "Unknown Channel",
    subscriber_count: toSafeNumber(raw.subscriber_count, 0),
    total_views: toSafeNumber(raw.total_views, 0),
    total_videos: toSafeNumber(raw.total_videos, 0),
    recent_videos: toSafeArray(raw.recent_videos).map((video) => ({
      title: typeof video?.title === "string" ? video.title : "Untitled",
      views: toSafeNumber(video?.views, 0),
      likes: toSafeNumber(video?.likes, 0),
      comments: toSafeNumber(video?.comments, 0),
      published_at: typeof video?.published_at === "string" ? video.published_at : "",
    })),
    insights: {
      channel_health_score: typeof insights.channel_health_score === "string" ? insights.channel_health_score : "N/A",
      growth_roadmap: typeof insights.growth_roadmap === "string" ? insights.growth_roadmap : "",
      what_works: toSafeArray(insights.what_works),
      critical_issues: toSafeArray(insights.critical_issues),
      immediate_actions: toSafeArray(insights.immediate_actions),
      seo_optimization: toSafeArray(insights.seo_optimization),
      content_strategy: toSafeArray(insights.content_strategy),
      discoverability_tactics: toSafeArray(insights.discoverability_tactics),
      internet_money_lessons: toSafeArray(insights.internet_money_lessons),
    },
  };
};

const normalizeGrowthData = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    current_streak: toSafeNumber(raw.current_streak, 0),
    total_days_completed: toSafeNumber(raw.total_days_completed, 0),
    longest_streak: toSafeNumber(raw.longest_streak, 0),
    badges_earned: toSafeArray(raw.badges_earned),
  };
};

const normalizeCalendarData = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    ...raw,
    calendar: raw.calendar && typeof raw.calendar === "object" ? raw.calendar : {},
  };
};

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
  const [customTags, setCustomTags] = useState("");
  const [additionalTags, setAdditionalTags] = useState("");
  const [generatedTags, setGeneratedTags] = useState([]);
  const [tagDebug, setTagDebug] = useState(null);
  const [showTagDebug, setShowTagDebug] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagHistory, setTagHistory] = useState([]);
  const [selectedTagHistoryIds, setSelectedTagHistoryIds] = useState([]);
  const [activeTagHistoryId, setActiveTagHistoryId] = useState(null);
  const [activeTab, setActiveTab] = useState("tags");
  const [descriptions, setDescriptions] = useState([]);
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);
  const [newDescription, setNewDescription] = useState({ title: "", content: "" });
  const [refineText, setRefineText] = useState("");
  const [loadingRefine, setLoadingRefine] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    email: "",
    socials: "",
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

  // YouTube upload states
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeEmail, setYoutubeEmail] = useState("");
  const [youtubeProfilePicture, setYoutubeProfilePicture] = useState("");
  const [youtubeName, setYoutubeName] = useState("");
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());

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

  // Grow in 120 states
  const [growthData, setGrowthData] = useState(null);
  const [loadingGrowth, setLoadingGrowth] = useState(false);
  const [calendarData, setCalendarData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  // Check-in prompt state
  const [showCheckinPrompt, setShowCheckinPrompt] = useState(false);
  const [beatHelperUploads, setBeatHelperUploads] = useState({ audio_uploads: [], image_uploads: [] });
  const [beatHelperQueue, setBeatHelperQueue] = useState([]);
  const [loadingBeatHelper, setLoadingBeatHelper] = useState(false);
  const [beatHelperImagePreview, setBeatHelperImagePreview] = useState("");
  const [loadingBeatHelperPreview, setLoadingBeatHelperPreview] = useState(false);
  const [beatHelperQueueImagePreviews, setBeatHelperQueueImagePreviews] = useState({});
  const beatHelperPreviewCacheRef = useRef({});
  const [beatHelperContact, setBeatHelperContact] = useState({ email: "", phone: "", email_enabled: false, sms_enabled: false });
  const [beatHelperTemplates, setBeatHelperTemplates] = useState([]);
  const [beatHelperImageSearchQuery, setBeatHelperImageSearchQuery] = useState("");
  const [beatHelperImageResults, setBeatHelperImageResults] = useState([]);
  const [loadingBeatHelperImageSearch, setLoadingBeatHelperImageSearch] = useState(false);
  const [importingBeatHelperImageUrl, setImportingBeatHelperImageUrl] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateTags, setNewTemplateTags] = useState("");
  const [editingQueueById, setEditingQueueById] = useState({});
  const [assistTitlesById, setAssistTitlesById] = useState({});
  const [beatHelperForm, setBeatHelperForm] = useState({
    beat_file_id: "",
    image_file_id: "",
    beat_type: "",
    target_artist: "",
    generated_title_override: "",
    context_tags: "",
    ai_choose_image: false,
    approval_timeout_hours: 12,
    auto_upload_if_no_response: false,
    notify_channel: "email",
    privacy_status: "public",
    template_id: "",
  });

  const [joiningTagsLoading, setJoiningTagsLoading] = useState(false);
  const [joiningTagsProgress, setJoiningTagsProgress] = useState(0);
  const joinProgressIntervalRef = useRef(null);
  const dashboardParallaxRef = useRef(null);

  const isPro = !!subscriptionStatus?.is_subscribed;
  const isAdmin = ADMIN_USERNAMES.has((user?.username || "").toLowerCase());
  const visibleTabs = DASHBOARD_TABS.filter((tab) => !tab.proOnly || isPro);
  const adEligibleTabs = ["tags", "descriptions", "upload", "analytics", "grow", "beathelper"].includes(activeTab);
  const activeTabIndex = Math.max(0, visibleTabs.findIndex((tab) => tab.value === activeTab));
  const activeTabLabel = visibleTabs[activeTabIndex]?.label || "Tags";
  const desktopTabHighlightStyle = {
    width: `${100 / Math.max(visibleTabs.length, 1)}%`,
    transform: `translateX(${activeTabIndex * 100}%)`,
  };
  const canShowAds = Boolean(
    subscriptionStatus &&
    !subscriptionStatus.is_subscribed &&
    userLoaded &&
    adEligibleTabs
  );

  const healthScoreRaw = analyticsData?.insights?.channel_health_score || "";
  const parsedHealthScore = (() => {
    const match = String(healthScoreRaw).match(/\d{1,3}/);
    if (!match) return 0;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  })();

  const analyticsRecentVideos = Array.isArray(analyticsData?.recent_videos) ? analyticsData.recent_videos : [];
  const maxRecentViews = analyticsRecentVideos.length
    ? Math.max(...analyticsRecentVideos.map((video) => Number(video?.views || 0)))
    : 0;
  const avgRecentViews = analyticsRecentVideos.length
    ? Math.round(
      analyticsRecentVideos.reduce((sum, video) => sum + Number(video?.views || 0), 0) /
      analyticsRecentVideos.length
    )
    : 0;
  const avgLikeRate = analyticsRecentVideos.length
    ? analyticsRecentVideos.reduce((sum, video) => {
      const views = Number(video?.views || 0);
      const likes = Number(video?.likes || 0);
      if (views <= 0) return sum;
      return sum + ((likes / views) * 100);
    }, 0) / analyticsRecentVideos.length
    : 0;
  const avgCommentRate = analyticsRecentVideos.length
    ? analyticsRecentVideos.reduce((sum, video) => {
      const views = Number(video?.views || 0);
      const comments = Number(video?.comments || 0);
      if (views <= 0) return sum;
      return sum + ((comments / views) * 100);
    }, 0) / analyticsRecentVideos.length
    : 0;
  const sparklinePoints = analyticsRecentVideos.length > 1 && maxRecentViews > 0
    ? analyticsRecentVideos.slice(0, 8).map((video, index, arr) => {
      const x = (index / (arr.length - 1)) * 100;
      const y = 100 - ((Number(video?.views || 0) / maxRecentViews) * 100);
      return `${x},${Math.max(4, Math.min(96, y))}`;
    }).join(" ")
    : "";
  const growthToday = new Date().toISOString().split("T")[0];
  const growthCheckedInToday = Boolean(growthData?.last_checkin_date === growthToday);
  const growthCompletionPercent = Math.round(((growthData?.total_days_completed || 0) / 120) * 100);
  const growthCurrentDay = Math.min(120, (growthData?.total_days_completed || 0) + 1);
  const growthDaysRemaining = Math.max(0, 120 - (growthData?.total_days_completed || 0));
  const growthRank = (growthData?.current_streak || 0) >= 60
    ? "Mythic Run"
    : (growthData?.current_streak || 0) >= 30
      ? "Locked Legend"
      : (growthData?.current_streak || 0) >= 14
        ? "Momentum Beast"
        : (growthData?.current_streak || 0) >= 7
          ? "Rising Runner"
          : "Starter Arc";
  const nextGrowthMilestone = [7, 14, 30, 60, 90, 120].find((milestone) => milestone > (growthData?.total_days_completed || 0)) || 120;
  const growthMilestoneGap = Math.max(0, nextGrowthMilestone - (growthData?.total_days_completed || 0));

  const goToPreviousTab = () => {
    const previousIndex = (activeTabIndex - 1 + visibleTabs.length) % visibleTabs.length;
    setActiveTab(visibleTabs[previousIndex].value);
  };

  const goToNextTab = () => {
    const nextIndex = (activeTabIndex + 1) % visibleTabs.length;
    setActiveTab(visibleTabs[nextIndex].value);
  };

  useEffect(() => {
    fetchUser();
    fetchDescriptions();
    fetchTagHistory();
    checkYouTubeConnection();
    fetchSubscriptionStatus();
    fetchGrowthStatus();
  }, []);

  useEffect(() => () => {
    if (joinProgressIntervalRef.current) {
      clearInterval(joinProgressIntervalRef.current);
      joinProgressIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    let ticking = false;

    const updateParallaxOffset = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const offset = Math.min(260, scrollY * 0.24);
      if (dashboardParallaxRef.current) {
        dashboardParallaxRef.current.style.setProperty("--dashboard-grid-offset", `${offset}px`);
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallaxOffset);
        ticking = true;
      }
    };

    updateParallaxOffset();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "grow" && isPro && growthData?.challenge_start_date && !calendarData) {
      fetchCalendar();
    }
  }, [activeTab, isPro, growthData?.challenge_start_date, calendarData]);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.value === activeTab)) {
      setActiveTab(visibleTabs[0]?.value || "tags");
    }
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    if (activeTab === "beathelper" && isPro) {
      fetchBeatHelperData();
    }
  }, [activeTab, isPro]);

  useEffect(() => {
    const selectedImageId = (beatHelperForm.image_file_id || "").trim();
    if (!selectedImageId) {
      setBeatHelperImagePreview("");
      return;
    }
    const cachedPreview = beatHelperPreviewCacheRef.current[selectedImageId];
    if (cachedPreview) {
      setBeatHelperImagePreview(cachedPreview);
      setLoadingBeatHelperPreview(false);
      return;
    }
    let cancelled = false;
    const loadPreview = async () => {
      try {
        setLoadingBeatHelperPreview(true);
        const response = await axios.get(`${API}/beat-helper/image/${selectedImageId}/preview`);
        if (!cancelled) {
          const nextPreview = response?.data?.data_url || "";
          if (nextPreview) {
            beatHelperPreviewCacheRef.current[selectedImageId] = nextPreview;
          }
          setBeatHelperImagePreview(nextPreview);
        }
      } catch (error) {
        if (!cancelled) {
          setBeatHelperImagePreview("");
        }
      } finally {
        if (!cancelled) {
          setLoadingBeatHelperPreview(false);
        }
      }
    };
    loadPreview();
    return () => {
      cancelled = true;
    };
  }, [beatHelperForm.image_file_id]);

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

  const upsertTagHistoryItem = (item) => {
    setTagHistory((prev) => {
      const filtered = prev.filter((entry) => entry.id !== item.id);
      return [item, ...filtered].slice(0, TAG_HISTORY_LIMIT);
    });
  };

  const persistTagHistoryEdit = async ({ tagId, nextTags, removedTags = [] }) => {
    if (!tagId) {
      setGeneratedTags(nextTags);
      return;
    }

    const response = await axios.patch(`${API}/tags/history/${tagId}`, {
      tags: nextTags,
      excluded_tags: removedTags,
    });
    setGeneratedTags(response.data?.tags || nextTags);
    upsertTagHistoryItem(response.data);
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

  const fetchBeatHelperData = async () => {
    setLoadingBeatHelper(true);
    try {
      const [uploadsRes, queueRes, contactRes, templatesRes] = await Promise.allSettled([
        axios.get(`${API}/beat-helper/uploads`),
        axios.get(`${API}/beat-helper/queue`),
        axios.get(`${API}/beat-helper/contact-settings`),
        axios.get(`${API}/beat-helper/tag-templates`),
      ]);

      const uploadsData = uploadsRes.status === "fulfilled"
        ? uploadsRes.value?.data
        : { audio_uploads: [], image_uploads: [] };
      const queueData = queueRes.status === "fulfilled"
        ? queueRes.value?.data
        : [];
      const contactData = contactRes.status === "fulfilled"
        ? contactRes.value?.data
        : { email: "", phone: "", email_enabled: false, sms_enabled: false };
      const templatesData = templatesRes.status === "fulfilled"
        ? templatesRes.value?.data
        : [];

      setBeatHelperUploads(uploadsData || { audio_uploads: [], image_uploads: [] });
      const queueItems = Array.isArray(queueData) ? queueData : [];
      setBeatHelperQueue(queueItems);
      setBeatHelperContact(contactData || { email: "", phone: "", email_enabled: false, sms_enabled: false });
      setBeatHelperTemplates(Array.isArray(templatesData) ? templatesData : []);

      const uniqueImageIds = [...new Set(
        queueItems
          .map((item) => (item?.image_file_id || "").trim())
          .filter(Boolean)
      )];
      if (uniqueImageIds.length === 0) {
        setBeatHelperQueueImagePreviews({});
      } else {
        const previewPairs = await Promise.all(
          uniqueImageIds.map(async (fileId) => {
            try {
              if (beatHelperPreviewCacheRef.current[fileId]) {
                return [fileId, beatHelperPreviewCacheRef.current[fileId]];
              }
              const response = await axios.get(`${API}/beat-helper/image/${fileId}/preview`);
              const nextPreview = response?.data?.data_url || "";
              if (nextPreview) {
                beatHelperPreviewCacheRef.current[fileId] = nextPreview;
              }
              return [fileId, nextPreview];
            } catch (error) {
              return [fileId, ""];
            }
          })
        );
        setBeatHelperQueueImagePreviews(Object.fromEntries(previewPairs));
      }

      const hardFailure = [uploadsRes, queueRes].find(
        (result) => result.status === "rejected"
      );
      if (hardFailure) {
        const status = hardFailure?.reason?.response?.status;
        const detail = hardFailure?.reason?.response?.data?.detail;
        if (status === 402) {
          toast.error(typeof detail === "string" ? detail : "BeatHelper is a Pro feature.");
        } else if (status === 401) {
          toast.error("Session expired. Please log in again.");
        } else {
          toast.error(typeof detail === "string" ? detail : "Failed to load core BeatHelper data");
        }
      }

      // Soft failures (older backend / partial deploy) should not break the whole tab.
      [contactRes, templatesRes].forEach((result, idx) => {
        if (result.status === "rejected") {
          const endpoint = idx === 0 ? "contact-settings" : "tag-templates";
          console.warn(`BeatHelper optional endpoint failed: ${endpoint}`, result.reason);
        }
      });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (error?.response?.status === 402) {
        toast.error(typeof detail === "string" ? detail : "BeatHelper is a Pro feature.");
      } else {
        toast.error("Failed to load BeatHelper data");
      }
    } finally {
      setLoadingBeatHelper(false);
    }
  };

  const handleBeatHelperQueue = async (e) => {
    e.preventDefault();
    if (!beatHelperForm.beat_file_id) {
      toast.error("Select a beat audio file");
      return;
    }
    if (!beatHelperForm.image_file_id && !beatHelperForm.ai_choose_image) {
      toast.error("Select a thumbnail or enable AI image");
      return;
    }
    if (!beatHelperForm.target_artist.trim() || !beatHelperForm.beat_type.trim()) {
      toast.error("Enter target artist and beat type");
      return;
    }
    try {
      setLoadingBeatHelper(true);
      const fullPayload = {
        beat_file_id: beatHelperForm.beat_file_id,
        image_file_id: beatHelperForm.image_file_id || null,
        beat_type: beatHelperForm.beat_type.trim(),
        target_artist: beatHelperForm.target_artist.trim(),
        generated_title_override: beatHelperForm.generated_title_override.trim() || null,
        context_tags: beatHelperForm.context_tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        ai_choose_image: !!beatHelperForm.ai_choose_image,
        approval_timeout_hours: Number(beatHelperForm.approval_timeout_hours) || 12,
        auto_upload_if_no_response: !!beatHelperForm.auto_upload_if_no_response,
        notify_channel: beatHelperForm.notify_channel,
        privacy_status: beatHelperForm.privacy_status,
        template_id: beatHelperForm.template_id || null,
      };
      await axios.post(`${API}/beat-helper/queue`, fullPayload);
      toast.success("Beat queued in BeatHelper");
      setBeatHelperImagePreview("");
      await fetchBeatHelperData();
    } catch (error) {
      const noResponse = !error?.response;
      if (noResponse) {
        try {
          // Backward-compatible retry for mixed backend deploys.
          await axios.post(`${API}/beat-helper/queue`, {
            beat_file_id: beatHelperForm.beat_file_id,
            image_file_id: beatHelperForm.image_file_id || null,
            beat_type: beatHelperForm.beat_type.trim(),
            target_artist: beatHelperForm.target_artist.trim(),
            context_tags: beatHelperForm.context_tags.split(",").map((t) => t.trim()).filter(Boolean),
            ai_choose_image: !!beatHelperForm.ai_choose_image,
            approval_timeout_hours: Number(beatHelperForm.approval_timeout_hours) || 12,
            auto_upload_if_no_response: !!beatHelperForm.auto_upload_if_no_response,
            notify_channel: beatHelperForm.notify_channel,
            privacy_status: beatHelperForm.privacy_status,
          });
          toast.success("Beat queued in BeatHelper");
          setBeatHelperImagePreview("");
          await fetchBeatHelperData();
          return;
        } catch (retryError) {
          const retryDetail = retryError?.response?.data?.detail;
          const retryMessage = typeof retryDetail === "string"
            ? retryDetail
            : retryError?.message || "Network error: backend unavailable or not updated";
          toast.error(retryMessage);
          return;
        }
      }

      const detail = error?.response?.data?.detail;
      const message = typeof detail === "string"
        ? detail
        : detail && typeof detail === "object"
          ? JSON.stringify(detail)
          : (error?.message || "Failed to queue beat");
      toast.error(message);
    } finally {
      setLoadingBeatHelper(false);
    }
  };

  const handleBeatHelperImageSearch = async ({ autoBuild = false } = {}) => {
    try {
      setLoadingBeatHelperImageSearch(true);
      const payload = {
        search_query: autoBuild ? "" : beatHelperImageSearchQuery.trim(),
        target_artist: beatHelperForm.target_artist.trim(),
        beat_type: beatHelperForm.beat_type.trim(),
        generated_title_override: beatHelperForm.generated_title_override.trim(),
        context_tags: beatHelperForm.context_tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        k: 8,
      };
      const response = await axios.post(`${API}/beat-helper/image-search`, payload);
      setBeatHelperImageResults(Array.isArray(response?.data?.results) ? response.data.results : []);
      if (!autoBuild && beatHelperImageSearchQuery.trim()) {
        return;
      }
      setBeatHelperImageSearchQuery(response?.data?.query_used || "");
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to search web images");
    } finally {
      setLoadingBeatHelperImageSearch(false);
    }
  };

  const handleBeatHelperImportSearchImage = async (result) => {
    const imageUrl = (result?.image_url || "").trim();
    if (!imageUrl) {
      toast.error("Image URL is missing");
      return;
    }

    try {
      setImportingBeatHelperImageUrl(imageUrl);
      const filenameSeed = [
        beatHelperForm.target_artist.trim(),
        beatHelperForm.beat_type.trim(),
        "web-thumb",
      ].filter(Boolean).join("-").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
      const response = await axios.post(`${API}/upload/image-from-url`, {
        image_url: imageUrl,
        original_filename: `${filenameSeed || "beathelper"}-${Date.now()}.jpg`,
      });
      const nextImageFileId = response?.data?.file_id || "";
      if (!nextImageFileId) {
        throw new Error("Import response missing file_id");
      }
      setBeatHelperForm((prev) => ({
        ...prev,
        image_file_id: nextImageFileId,
        ai_choose_image: false,
      }));
      toast.success("Web image added to BeatHelper");
      await fetchBeatHelperData();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to import selected image");
    } finally {
      setImportingBeatHelperImageUrl("");
    }
  };

  const handleBeatHelperRequestApproval = async (itemId) => {
    try {
      await axios.post(`${API}/beat-helper/queue/${itemId}/request-approval`);
      toast.success("Approval request triggered");
      await fetchBeatHelperData();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to request approval");
    }
  };

  const handleBeatHelperApproveUpload = async (itemId) => {
    try {
      setLoadingBeatHelper(true);
      const response = await axios.post(`${API}/beat-helper/queue/${itemId}/approve-upload`);
      toast.success(response?.data?.message || "Uploaded to YouTube");
      await fetchBeatHelperData();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (typeof detail === "string") {
        toast.error(detail);
      } else {
        toast.error(detail?.message || "Failed to upload queued beat");
      }
    } finally {
      setLoadingBeatHelper(false);
    }
  };

  const handleBeatHelperSetStatus = async (itemId, status) => {
    try {
      await axios.patch(`${API}/beat-helper/queue/${itemId}`, { status });
      toast.success(`Beat marked as ${status}`);
      await fetchBeatHelperData();
    } catch (error) {
      toast.error("Failed to update beat status");
    }
  };

  const handleBeatHelperDelete = async (itemId) => {
    try {
      await axios.delete(`${API}/beat-helper/queue/${itemId}`);
      toast.success("Queue item removed");
      await fetchBeatHelperData();
    } catch (error) {
      toast.error("Failed to delete queue item");
    }
  };

  const handleBeatHelperDispatchNow = async () => {
    try {
      const response = await axios.post(`${API}/beat-helper/dispatch-daily-now`);
      if (response?.data?.success) {
        toast.success("Daily approval dispatch sent");
      } else {
        toast.error(`Dispatch skipped: ${response?.data?.reason || "no eligible queued beat"}`);
      }
      await fetchBeatHelperData();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to trigger daily dispatch");
    }
  };

  const handleBeatHelperCleanupUploads = async () => {
    try {
      setLoadingBeatHelper(true);
      const response = await axios.post(`${API}/beat-helper/uploads/cleanup`);
      const deletedAudio = Number(response?.data?.deleted_audio_uploads || 0);
      const deletedImages = Number(response?.data?.deleted_image_uploads || 0);
      toast.success(`Removed ${deletedAudio} audio file(s) and ${deletedImages} image(s) not in queue`);
      await fetchBeatHelperData();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to clean orphan uploads");
    } finally {
      setLoadingBeatHelper(false);
    }
  };

  const handleBeatHelperSaveContact = async (contactOverride = null) => {
    try {
      const payload = contactOverride || beatHelperContact;
      const response = await axios.put(`${API}/beat-helper/contact-settings`, payload);
      const confirmation = response?.data?.confirmation || {};
      const emailStatus = confirmation.email_enabled
        ? (confirmation.email_confirmation_sent ? "email confirmation sent" : "email confirmation failed")
        : "email disabled";
      const smsStatus = confirmation.sms_enabled
        ? (confirmation.sms_confirmation_sent ? "SMS confirmation sent" : "SMS confirmation failed")
        : "SMS disabled";
      toast.success(`BeatHelper contact settings saved (${emailStatus}, ${smsStatus})`);
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to save contact settings");
    }
  };

  const handleBeatHelperCreateTemplate = async () => {
    const name = newTemplateName.trim();
    if (!name) {
      toast.error("Template name is required");
      return;
    }
    try {
      await axios.post(`${API}/beat-helper/tag-templates`, {
        name,
        tags: newTemplateTags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setNewTemplateName("");
      setNewTemplateTags("");
      toast.success("Tag template created");
      await fetchBeatHelperData();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to create template");
    }
  };

  const startEditBeatHelperItem = (item) => {
    setEditingQueueById((prev) => ({
      ...prev,
      [item.id]: {
        generated_title: item.generated_title || "",
        target_artist: item.target_artist || "",
        beat_type: item.beat_type || "",
        generated_description: item.generated_description || "",
        generated_tags_text: (item.generated_tags || []).join(", "),
        beat_file_id: item.beat_file_id || "",
        image_file_id: item.image_file_id || "",
        template_id: item.template_id || "",
      },
    }));
  };

  const handleBeatHelperAssistTitle = async (itemId) => {
    const edit = editingQueueById[itemId];
    if (!edit) return;
    try {
      const response = await axios.post(`${API}/beat-helper/assist-title`, {
        target_artist: edit.target_artist,
        beat_type: edit.beat_type,
        current_title: edit.generated_title,
        context_tags: (edit.generated_tags_text || "").split(",").map((t) => t.trim()).filter(Boolean),
      });
      setAssistTitlesById((prev) => ({ ...prev, [itemId]: response?.data?.titles || [] }));
    } catch (error) {
      toast.error("Failed to get title suggestions");
    }
  };

  const handleBeatHelperSaveEdit = async (itemId) => {
    const edit = editingQueueById[itemId];
    if (!edit) return;
    try {
      await axios.patch(`${API}/beat-helper/queue/${itemId}/edit`, {
        generated_title: edit.generated_title,
        target_artist: edit.target_artist,
        beat_type: edit.beat_type,
        generated_description: edit.generated_description,
        generated_tags: (edit.generated_tags_text || "").split(",").map((t) => t.trim()).filter(Boolean),
        beat_file_id: edit.beat_file_id || undefined,
        image_file_id: edit.image_file_id || undefined,
        template_id: edit.template_id || undefined,
      });
      toast.success("Queue item updated");
      setEditingQueueById((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      await fetchBeatHelperData();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to update queue item");
    }
  };

  const handleUpgrade = async (plan = "plus") => {
    setUpgradingSubscription(true);
    try {
      const response = await axios.post(`${API}/subscription/create-checkout`, {
        success_url: `${window.location.origin}/dashboard?upgraded=true`,
        cancel_url: `${window.location.origin}/dashboard`,
        plan,
      });

      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error("Failed to start checkout");
      setUpgradingSubscription(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    setIsAuthenticated(false);
    toast.success("Logged out successfully");
  };

  const handleAnalyzeChannel = async () => {
    setLoadingAnalytics(true);
    setProgressActive(true);
    setProgressMessage("📈 Analyzing your channel performance and generating AI growth strategy...");
    setProgressDuration(70000);
    try {
      const response = await axios.post(`${API}/youtube/analytics`);
      setAnalyticsData(normalizeAnalyticsData(response.data));
      toast.success("Channel analysis complete!");

      // Refresh credits after analysis
      await fetchSubscriptionStatus();
    } catch (error) {
      if (error.response?.status === 402) {
        const detail = error.response.data.detail;
        toast.error(detail.message || "Daily limit reached");
        setShowUpgradeModal(true);
      } else if (error.response?.status === 400) {
        const detail = error.response?.data?.detail;
        toast.error(typeof detail === "string" ? detail : "Please connect your YouTube account first");
      } else if (error.response?.status === 401) {
        toast.error("YouTube auth expired. Reconnect your YouTube account.");
      } else {
        console.error("Analytics error:", error);
        const detail = error.response?.data?.detail;
        toast.error(typeof detail === "string" ? detail : "Failed to analyze channel");
      }

      // Still refresh credits on error to show updated count
      await fetchSubscriptionStatus();
    } finally {
      setLoadingAnalytics(false);
      setProgressActive(false);
    }
  };

  const fetchGrowthStatus = async () => {
    try {
      const response = await axios.get(`${API}/growth/status`);
      setGrowthData(normalizeGrowthData(response.data));
    } catch (error) {
      console.error("Failed to fetch growth status:", error);
    }
  };

  const fetchCalendar = async () => {
    try {
      const response = await axios.get(`${API}/growth/calendar`);
      setCalendarData(normalizeCalendarData(response.data));
    } catch (error) {
      console.error("Failed to fetch calendar:", error);
    }
  };

  const handleStartChallenge = async () => {
    setLoadingGrowth(true);
    try {
      const response = await axios.post(`${API}/growth/start`);
      toast.success(response?.data?.message || "Challenge started");
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
      toast.success(response?.data?.message || "Checked in");
      if (response?.data?.badge_unlocked) {
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
    setTagDebug(null);
    setShowTagDebug(false);
    setProgressActive(true);
    setProgressMessage("Generating optimized tags using AI + YouTube + Spotify + SoundCloud signals...");
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
      setActiveTagHistoryId(response.data.id);
      setSelectedTagHistoryIds([response.data.id]);
      setTagDebug(response.data?.debug || null);
      upsertTagHistoryItem(response.data);
      toast.success(`Generated ${response.data.tags.length} tags! (AI + YouTube + Spotify + SoundCloud + custom tags)`);

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
    setTagDebug(null);
    setShowTagDebug(false);
    setAdditionalTags(""); // Clear input
    toast.success(`Added ${newTags.length} tags! Total: ${uniqueTags.length}/${TAG_LIMIT}`);
  };

  const fetchTagDebug = async (tagId) => {
    if (!tagId) {
      setTagDebug(null);
      setShowTagDebug(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/tags/debug/${tagId}`);
      setTagDebug(response.data?.debug || null);
      setShowTagDebug(false);
    } catch (error) {
      setTagDebug(null);
      setShowTagDebug(false);
    }
  };

  const handleTagHistoryTileClick = (item) => {
    const alreadySelected = selectedTagHistoryIds.includes(item.id);
    const nextSelected = alreadySelected
      ? selectedTagHistoryIds.filter((itemId) => itemId !== item.id)
      : [...selectedTagHistoryIds, item.id];

    setSelectedTagHistoryIds(nextSelected);

    const nextActiveId = alreadySelected
      ? (nextSelected[nextSelected.length - 1] || null)
      : item.id;

    setActiveTagHistoryId(nextActiveId);

    if (nextActiveId) {
      const nextActiveItem =
        nextActiveId === item.id ? item : tagHistory.find((entry) => entry.id === nextActiveId);
      if (nextActiveItem) {
        setGeneratedTags(nextActiveItem.tags || []);
        setTagQuery(nextActiveItem.query || "");
        fetchTagDebug(nextActiveItem.id);
        toast.success("Tags loaded!");
      }
    } else {
      setGeneratedTags([]);
      setTagQuery("");
      setTagDebug(null);
      setShowTagDebug(false);
    }
  };

  const handleJoinSelectedTagHistory = async () => {
    const selectedItems = tagHistory.filter((item) => selectedTagHistoryIds.includes(item.id));
    if (selectedItems.length < 2) {
      toast.error("Select at least two generations to join");
      return;
    }

    const joinLabel = selectedItems
      .map((item) => formatTagHistoryLabel(item.query))
      .filter(Boolean)
      .join(" x ");

    setJoiningTagsLoading(true);
    setJoiningTagsProgress(8);
    if (joinProgressIntervalRef.current) {
      clearInterval(joinProgressIntervalRef.current);
    }
    joinProgressIntervalRef.current = setInterval(() => {
      setJoiningTagsProgress((prev) => (prev >= 92 ? 92 : prev + 6));
    }, 280);

    try {
      const candidateTags = selectedItems.flatMap((item) => item.tags || []);
      const joinResponse = await axios.post(`${API}/tags/join-ai`, {
        queries: selectedItems.map((item) => item.query || formatTagHistoryLabel(item.query || "")),
        candidate_tags: candidateTags,
        max_tags: 70,
        llm_provider: tagProvider
      });

      const optimizedTags = Array.isArray(joinResponse?.data?.tags) ? joinResponse.data.tags : [];
      if (!optimizedTags.length) {
        toast.error("AI join returned no tags. Please try again.");
        return;
      }

      setGeneratedTags(optimizedTags);
      setTagDebug(null);
      setShowTagDebug(false);
      setTagQuery(joinLabel || "Joined Tags");
      setSelectedTagHistoryIds([]);
      setActiveTagHistoryId(null);

      const saveResponse = await axios.post(`${API}/tags/history`, {
        query: joinLabel || "Joined Tags",
        tags: optimizedTags
      });
      upsertTagHistoryItem(saveResponse.data);
      setActiveTagHistoryId(saveResponse.data.id);
      setJoiningTagsProgress(100);
      toast.success(
        `AI joined ${selectedItems.length} generations! Optimized to ${optimizedTags.length} SEO tags.`
      );
    } catch (error) {
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily limit reached! Upgrade to continue.");
      } else {
        toast.error("Failed to join with AI. Please try again.");
      }
    } finally {
      if (joinProgressIntervalRef.current) {
        clearInterval(joinProgressIntervalRef.current);
        joinProgressIntervalRef.current = null;
      }
      setJoiningTagsLoading(false);
      setTimeout(() => setJoiningTagsProgress(0), 500);
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
      const response = await axios.post(`${API}/descriptions/generate`, {
        email: generateForm.email,
        socials: generateForm.socials,
        additional_info: generateForm.additional_info,
        key: "",
        bpm: "",
        prices: "",
      });
      setNewDescription({
        title: `Generated - Beat Description`,
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

  return (
    <div
      ref={dashboardParallaxRef}
      className="min-h-screen dashboard-parallax-bg"
      data-testid="dashboard"
    >
      <div className="dashboard-grid-layer" aria-hidden="true" />
      <DarkModeToggle />

      {/* Header */}
      <div className="glass-card mx-2 sm:mx-4 mt-2 sm:mt-4 rounded-xl sm:rounded-2xl border-0 dashboard-card">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 pr-16 sm:pr-20 lg:pr-6 py-3 sm:py-4 dashboard-shell">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4">
            <div className="flex flex-1 items-center gap-2 sm:gap-3 md:gap-4 min-w-0 max-w-full">
              <img src="/sendmybeat.png" alt="SendMyBeat" className="h-10 w-10 sm:h-12 sm:w-12 object-contain" />
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold gradient-text truncate">SendMyBeat</h1>
                {user && (
                  <p
                    className="text-xs sm:text-sm truncate max-w-[180px] sm:max-w-[260px] md:max-w-[340px] lg:max-w-[420px]"
                    style={{ color: "var(--text-secondary)" }}
                    title={`Welcome back, ${user.username}`}
                  >
                    Welcome back, {user.username}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto flex-wrap lg:flex-nowrap lg:justify-end self-stretch lg:self-auto">
              {/* Show Upgrade button for free users */}
              {subscriptionStatus && !subscriptionStatus.is_subscribed && (
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="btn-modern text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap"
                  data-testid="header-upgrade-btn"
                >
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Upgrade to Pro
                </Button>
              )}

              {/* Show Pro badge for subscribed users */}
              {subscriptionStatus && subscriptionStatus.is_subscribed && (
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
                  {subscriptionStatus.plan === "max" ? "Max Member" : "Plus Member"}
                </div>
              )}

              {/* YouTube Profile Picture */}
              {youtubeConnected && youtubeProfilePicture && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full min-w-0 max-w-full xl:max-w-[340px]" style={{backgroundColor: 'var(--bg-secondary)'}}>
                  <img
                    src={youtubeProfilePicture}
                    alt={youtubeName || youtubeEmail}
                    className="h-6 w-6 sm:h-8 sm:w-8 rounded-full border-2 border-[var(--accent-primary)]"
                  />
                  <span className="text-xs sm:text-sm font-medium hidden xl:block truncate max-w-[250px]" style={{color: 'var(--text-primary)'}}>
                    {youtubeName || youtubeEmail}
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => window.location.href = '/spotlight'}
                className="gap-1 sm:gap-2 border-[var(--border-color)] text-xs sm:text-sm px-3 sm:px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 hover:bg-yellow-500/30"
              >
                <Target className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                <span className="hidden xl:inline font-bold text-yellow-500">Spotlight</span>
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/admin/costs'}
                  className="gap-1 sm:gap-2 border-[var(--border-color)] text-xs sm:text-sm px-3 sm:px-4 py-2"
                  title="View Backend Costs"
                >
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xl:inline">Costs</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-1 sm:gap-2 border-[var(--border-color)] text-xs sm:text-sm px-3 sm:px-4 py-2"
                data-testid="logout-btn"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xl:inline">Logout</span>
                <span className="xl:hidden">Exit</span>
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
            creditsTotal={subscriptionStatus.daily_credits_total}
            uploadsTotal={subscriptionStatus.upload_credits_total}
            plan={subscriptionStatus.plan}
            resetsAt={subscriptionStatus.resets_at}
            isSubscribed={subscriptionStatus.is_subscribed}
            onUpgrade={() => setShowUpgradeModal(true)}
            API={API}
          />
        )}

        {/* Progress Bar */}
        <ProgressBar
          isActive={progressActive}
          message={progressMessage}
          duration={progressDuration}
          onCancel={
            loadingTags ? handleCancelTagGeneration :
            null
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="sm:hidden w-full max-w-xs mx-auto flex items-center justify-between gap-2 dashboard-tabs px-2 py-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={goToPreviousTab}
              className="h-8 w-8 rounded-md text-[var(--text-primary)] bg-[var(--bg-secondary)]/80 hover:bg-[var(--bg-tertiary)]"
              aria-label="Previous tab"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div
              className="flex-1 text-center text-sm font-semibold truncate px-2 py-1 rounded-md"
              style={{
                color: "#ffffff",
                background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                boxShadow: "0 0 0 1px var(--border-color) inset",
                textShadow: "0 1px 2px rgba(0,0,0,0.45)",
              }}
            >
              {activeTabLabel}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={goToNextTab}
              className="h-8 w-8 rounded-md text-[var(--text-primary)] bg-[var(--bg-secondary)]/80 hover:bg-[var(--bg-tertiary)]"
              aria-label="Next tab"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <TabsList
            className="hidden sm:grid w-full max-w-5xl mx-auto gap-1 text-xs sm:text-sm dashboard-tabs relative overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${Math.max(visibleTabs.length, 1)}, minmax(0, 1fr))` }}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-xl bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] shadow-md border border-[var(--border-color)] transition-transform duration-300 ease-out"
              style={desktopTabHighlightStyle}
              aria-hidden="true"
            />
            {visibleTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                data-testid={`${tab.value}-tab`}
                className="relative z-10 px-1 sm:px-3 py-1.5 sm:py-2 truncate transition-colors data-[state=active]:bg-transparent data-[state=active]:text-white"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {canShowAds && !["tags", "descriptions"].includes(activeTab) && (
            <AdBanner
              isSubscribed={subscriptionStatus.is_subscribed}
              style={{ marginBottom: "12px" }}
            />
          )}

          {/* BeatHelper Tab (Pro) */}
          <TabsContent value="beathelper" className="space-y-6 dashboard-section">
            {!isPro ? (
              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle>BeatHelper is Pro-only</CardTitle>
                  <CardDescription>
                    Upgrade to Pro to queue beats, match thumbnails 1:1, and run assisted upload approvals.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setShowUpgradeModal(true)}>Upgrade to Pro</Button>
                </CardContent>
              </Card>
            ) : (
              <BeatHelperStudio
                loadingBeatHelper={loadingBeatHelper}
                beatHelperUploads={beatHelperUploads}
                beatHelperQueue={beatHelperQueue}
                beatHelperImagePreview={beatHelperImagePreview}
                loadingBeatHelperPreview={loadingBeatHelperPreview}
                beatHelperQueueImagePreviews={beatHelperQueueImagePreviews}
                beatHelperContact={beatHelperContact}
                setBeatHelperContact={setBeatHelperContact}
                beatHelperTemplates={beatHelperTemplates}
                beatHelperImageSearchQuery={beatHelperImageSearchQuery}
                setBeatHelperImageSearchQuery={setBeatHelperImageSearchQuery}
                beatHelperImageResults={beatHelperImageResults}
                loadingBeatHelperImageSearch={loadingBeatHelperImageSearch}
                importingBeatHelperImageUrl={importingBeatHelperImageUrl}
                beatHelperForm={beatHelperForm}
                setBeatHelperForm={setBeatHelperForm}
                newTemplateName={newTemplateName}
                setNewTemplateName={setNewTemplateName}
                newTemplateTags={newTemplateTags}
                setNewTemplateTags={setNewTemplateTags}
                editingQueueById={editingQueueById}
                setEditingQueueById={setEditingQueueById}
                assistTitlesById={assistTitlesById}
                handleBeatHelperQueue={handleBeatHelperQueue}
                fetchBeatHelperData={fetchBeatHelperData}
                handleBeatHelperDispatchNow={handleBeatHelperDispatchNow}
                handleBeatHelperCleanupUploads={handleBeatHelperCleanupUploads}
                handleBeatHelperImageSearch={handleBeatHelperImageSearch}
                handleBeatHelperImportSearchImage={handleBeatHelperImportSearchImage}
                handleBeatHelperSaveContact={handleBeatHelperSaveContact}
                handleBeatHelperCreateTemplate={handleBeatHelperCreateTemplate}
                handleBeatHelperRequestApproval={handleBeatHelperRequestApproval}
                handleBeatHelperApproveUpload={handleBeatHelperApproveUpload}
                handleBeatHelperSetStatus={handleBeatHelperSetStatus}
                handleBeatHelperDelete={handleBeatHelperDelete}
                startEditBeatHelperItem={startEditBeatHelperItem}
                handleBeatHelperAssistTitle={handleBeatHelperAssistTitle}
                handleBeatHelperSaveEdit={handleBeatHelperSaveEdit}
              />
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 dashboard-section">
            <ThemeCustomizer
              isPro={isPro}
              onUpgrade={() => setShowUpgradeModal(true)}
            />
          </TabsContent>

          {/* Tag Generator Tab */}
          <TabsContent value="tags" className="space-y-4 sm:space-y-6 dashboard-section">
          {canShowAds && activeTab === "tags" && (
            <AdBanner
              isSubscribed={subscriptionStatus.is_subscribed}
              style={{ marginBottom: '24px' }}
            />
          )}

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-4 sm:gap-6">
              <Card className="dashboard-card">
                <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                    <span>Generate YouTube Tags</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">AI generates focused tags using YouTube + Spotify + SoundCloud song signals + your custom tags (up to 120 total)</CardDescription>
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
                              onClick={async (e) => {
                                e.stopPropagation();
                                const removedTag = generatedTags[index];
                                const nextTags = generatedTags.filter((_, i) => i !== index);
                                try {
                                  await persistTagHistoryEdit({
                                    tagId: activeTagHistoryId,
                                    nextTags,
                                    removedTags: removedTag ? [removedTag] : [],
                                  });
                                  setTagDebug(null);
                                  setShowTagDebug(false);
                                  toast.success("Tag removed");
                                } catch (error) {
                                  toast.error("Failed to persist tag removal");
                                }
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

                      {tagDebug && (
                        <div className="p-3 sm:p-4 rounded-lg border" style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border-color)" }}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm sm:text-base font-semibold">Tag Generation Debug</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowTagDebug((prev) => !prev)}
                              className="text-xs sm:text-sm"
                            >
                              {showTagDebug ? "Hide Debug" : "Show Debug"}
                            </Button>
                          </div>
                          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                            Source mix, selected tags, and de-duplication drops for this generation.
                          </p>

                          {showTagDebug && (
                            <div className="mt-3 space-y-3">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                {Object.entries(tagDebug?.source_counts || {}).map(([key, value]) => (
                                  <div key={key} className="rounded-md border px-2 py-1" style={{ borderColor: "var(--border-color)" }}>
                                    <p className="font-semibold">{String(value)}</p>
                                    <p style={{ color: "var(--text-secondary)" }}>{key.replaceAll("_", " ")}</p>
                                  </div>
                                ))}
                              </div>

                              {Object.keys(tagDebug?.source_status || {}).length > 0 && (
                                <div className="rounded-md border px-2 py-2 text-xs" style={{ borderColor: "var(--border-color)" }}>
                                  <p className="font-semibold mb-1">Source Status</p>
                                  {Object.entries(tagDebug?.source_status || {}).map(([key, value]) => (
                                    <p key={key} style={{ color: "var(--text-secondary)" }}>
                                      {key}: {String(value)}
                                    </p>
                                  ))}
                                </div>
                              )}

                              <div>
                                <p className="text-xs font-semibold mb-1">Selected Tags (sample)</p>
                                <div className="max-h-40 overflow-auto space-y-1 text-xs">
                                  {(tagDebug?.selected_tags || []).slice(0, 18).map((entry, idx) => (
                                    <div key={`${entry.tag}-${idx}`} className="rounded px-2 py-1 border" style={{ borderColor: "var(--border-color)" }}>
                                      <span className="font-medium">{entry.tag}</span>{" "}
                                      <span style={{ color: "var(--text-secondary)" }}>[{entry.source}] {entry.reason}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <p className="text-xs font-semibold mb-1">Dropped Tags (sample)</p>
                                <div className="max-h-32 overflow-auto space-y-1 text-xs">
                                  {(tagDebug?.dropped_tags || []).slice(0, 14).map((entry, idx) => (
                                    <div key={`${entry.tag}-${idx}`} className="rounded px-2 py-1 border" style={{ borderColor: "var(--border-color)" }}>
                                      <span className="font-medium">{entry.tag}</span>{" "}
                                      <span style={{ color: "var(--text-secondary)" }}>{entry.reason}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
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
                            disabled={selectedTagHistoryIds.length < 2 || joiningTagsLoading}
                            className="text-xs sm:text-sm"
                          >
                            {joiningTagsLoading ? `Joining... ${joiningTagsProgress}%` : "Join Selected"}
                          </Button>
                          {selectedTagHistoryIds.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTagHistoryIds([]);
                                setActiveTagHistoryId(null);
                                setGeneratedTags([]);
                                setTagQuery("");
                                setTagDebug(null);
                                setShowTagDebug(false);
                              }}
                              className="text-xs sm:text-sm"
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                      {joiningTagsLoading && (
                        <p className="text-xs sm:text-sm" style={{ color: "var(--text-secondary)" }}>
                          Optimizing combined tags with AI...
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <div className="tag-history-scroll">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {tagHistory.slice(0, TAG_HISTORY_LIMIT).map((item) => {
                          const displayLabel = formatTagHistoryLabel(item.query);
                          const isSelected = selectedTagHistoryIds.includes(item.id);
                          const isActive = activeTagHistoryId === item.id;
                          return (
                          <div
                            key={item.id}
                            className="aspect-square p-4 rounded-lg border-2 transition-all hover:border-purple-500 cursor-pointer relative group flex flex-col justify-between overflow-hidden"
                            style={{
                              backgroundColor: 'var(--bg-secondary)',
                              borderColor: isActive ? 'var(--accent-primary)' : isSelected ? 'var(--accent-secondary)' : 'var(--border-color)'
                            }}
                            onClick={() => handleTagHistoryTileClick(item)}
                            data-testid="tag-history-item"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <p
                                  className="font-medium mb-1 leading-snug break-words"
                                  style={{color: 'var(--text-primary)'}}
                                  title={displayLabel}
                                >
                                  {displayLabel}
                                </p>
                                <p className="text-xs sm:text-sm break-words" style={{color: 'var(--text-secondary)'}}>
                                  {item.tags.length} tags
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await axios.delete(`${API}/tags/history/${item.id}`);
                                    const updatedHistory = tagHistory.filter(t => t.id !== item.id);
                                    setTagHistory(updatedHistory);
                                    setSelectedTagHistoryIds((prev) => {
                                      const nextSelected = prev.filter((entryId) => entryId !== item.id);
                                      if (activeTagHistoryId === item.id) {
                                        const nextActiveId = nextSelected[nextSelected.length - 1] || null;
                                        if (nextActiveId) {
                                          const nextActiveItem = updatedHistory.find((entry) => entry.id === nextActiveId);
                                          if (nextActiveItem) {
                                            setActiveTagHistoryId(nextActiveId);
                                            setGeneratedTags(nextActiveItem.tags || []);
                                            setTagQuery(nextActiveItem.query || "");
                                            fetchTagDebug(nextActiveId);
                                          }
                                        } else {
                                          setActiveTagHistoryId(null);
                                          setGeneratedTags([]);
                                          setTagQuery("");
                                          setTagDebug(null);
                                          setShowTagDebug(false);
                                        }
                                      }
                                      return nextSelected;
                                    });
                                    toast.success("Generation deleted");
                                  } catch (error) {
                                    toast.error("Failed to delete");
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="mt-2 text-[11px] sm:text-xs break-words" style={{ color: 'var(--text-secondary)' }}>
                              {isActive ? "Showing tags" : isSelected ? "Selected for join" : "Click to select"}
                            </div>
                          </div>
                        );
                        })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Descriptions Tab */}
          <TabsContent value="descriptions" className="space-y-4 sm:space-y-6 dashboard-section">
          {canShowAds && activeTab === "descriptions" && (
            <AdBanner
              isSubscribed={subscriptionStatus.is_subscribed}
              style={{ marginBottom: '24px' }}
            />
          )}

            <Card className="dashboard-card description-studio-hero">
              <CardContent className="px-4 sm:px-6 py-4 sm:py-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: "var(--text-secondary)" }}>
                      Description Studio
                    </p>
                    <h3 className="text-lg sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      Write faster. Sound bigger. Stay consistent.
                    </h3>
                    <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      Build scroll-stopping descriptions with AI tools, then keep your best templates ready to deploy.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 w-full lg:w-auto">
                    <div className="description-stat-chip">
                      <p className="description-stat-value">{descriptions.length}</p>
                      <p className="description-stat-label">Saved</p>
                    </div>
                    <div className="description-stat-chip">
                      <p className="description-stat-value">{newDescription.content.trim() ? newDescription.content.trim().split(/\s+/).filter(Boolean).length : 0}</p>
                      <p className="description-stat-label">Draft Words</p>
                    </div>
                    <div className="description-stat-chip">
                      <p className="description-stat-value">{Math.max(5, Math.round(((newDescription.content.trim() ? newDescription.content.trim().split(/\s+/).filter(Boolean).length : 0) / 3) || 0))}s</p>
                      <p className="description-stat-label">Read Time</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
              <div className="xl:col-span-7 space-y-4 sm:space-y-6">
                <Card className="dashboard-card description-tool-card">
                  <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                      <Save className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                      <span>Create & Save Description</span>
                    </CardTitle>
                    <CardDescription>Build your reusable template, then save it in one click.</CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        "🔥 Instant vibe hook",
                        "🎧 Lease CTA line",
                        "📌 Socials closer",
                        "⚡ Producer stamp opener",
                      ].map((hook) => (
                        <button
                          key={hook}
                          type="button"
                          className="description-hook-chip"
                          onClick={() => {
                            const text = hook.replace(/^.\s/, "");
                            setNewDescription((prev) => ({
                              ...prev,
                              content: prev.content ? `${text}\n${prev.content}` : text,
                            }));
                          }}
                        >
                          {hook}
                        </button>
                      ))}
                    </div>

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
                        rows={9}
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
                      <div className="flex justify-between items-center text-xs">
                        <p style={{color: 'var(--text-secondary)'}}>
                          Press Enter to save. Use Shift+Enter for a new line.
                        </p>
                        <p style={{color: 'var(--text-secondary)'}}>
                          {(newDescription.content || "").length} chars
                        </p>
                      </div>
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

                <Card className="dashboard-card producer-card">
                  <CardHeader>
                    <CardTitle>Saved Descriptions ({descriptions.length})</CardTitle>
                    <CardDescription>Tap any description body to expand/collapse quickly.</CardDescription>
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
                          const words = desc.content.trim() ? desc.content.trim().split(/\s+/).filter(Boolean).length : 0;

                          return (
                            <div key={desc.id} className="description-entry-card" data-testid={`desc-item-${desc.id}`}>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="min-w-0">
                                  <h3 className="font-semibold truncate" style={{color: 'var(--text-primary)'}}>{desc.title}</h3>
                                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{words} words</p>
                                </div>
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
                                className="text-sm whitespace-pre-wrap cursor-pointer"
                                style={{ color: "var(--text-primary)" }}
                                onClick={() => toggleDescriptionExpand(desc.id)}
                              >
                                {showPreview ? (
                                  <>
                                    {preview}...
                                    <span className="description-expand-hint">Click to expand</span>
                                  </>
                                ) : (
                                  <>
                                    {desc.content}
                                    {desc.content.length > 150 && (
                                      <span className="description-expand-hint block mt-2">Click to collapse</span>
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
              </div>

              <div className="xl:col-span-5 space-y-4 sm:space-y-6">
                <Card className="dashboard-card description-tool-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      AI Refine
                    </CardTitle>
                    <CardDescription>Paste your text and let AI sharpen clarity + conversion.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="Paste your description to refine..."
                      className="resize-y min-h-[140px] max-h-[420px]"
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

                <Card className="dashboard-card description-tool-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5 text-blue-600" />
                      AI Generate
                    </CardTitle>
                    <CardDescription>Build a full description from beat metadata and sales info.</CardDescription>
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
                    <Textarea
                      placeholder="Additional info"
                      rows={2}
                      value={generateForm.additional_info}
                      onChange={(e) => setGenerateForm({ ...generateForm, additional_info: e.target.value })}
                      data-testid="gen-additional-input"
                    />
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      Key, BPM, and pricing are now handled in Upload Studio after your beat is loaded.
                    </p>
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
          </TabsContent>

          {/* YouTube Upload Tab (Refactored) */}
          <TabsContent value="upload" className="space-y-6 dashboard-section">
             <UploadStudio
               user={user}
               subscriptionStatus={subscriptionStatus}
               youtubeConnected={youtubeConnected}
               youtubeProfilePicture={youtubeProfilePicture}
               youtubeName={youtubeName}
               youtubeEmail={youtubeEmail}
               descriptions={descriptions}
               tagHistory={tagHistory}
               API={API}
               onUpgrade={() => setShowUpgradeModal(true)}
               onDisconnectYouTube={disconnectYouTube}
               onConnectYouTube={connectYouTube}
               onExitUploadTab={() => setActiveTab("tags")}
             />
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
                          <p className="text-4xl font-bold gradient-text mb-3">{analyticsData.insights?.channel_health_score?.split('-')[0] || 'N/A'}</p>
                          <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{analyticsData.insights?.channel_health_score?.split('-').slice(1).join('-') || ''}</p>
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

                    {/* Visual Performance Snapshot */}
                    <Card className="producer-card">
                      <CardHeader>
                        <CardTitle className="text-lg">Performance Snapshot</CardTitle>
                        <CardDescription>Visual breakdown of channel momentum and audience interaction</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
                            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Health Meter</p>
                            <p className="text-2xl font-bold gradient-text mt-1">{parsedHealthScore}/100</p>
                            <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-tertiary)" }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${parsedHealthScore}%`,
                                  background: "linear-gradient(90deg, #22c55e, #3b82f6, #a855f7)",
                                }}
                              />
                            </div>
                          </div>
                          <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
                            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Avg Views (Recent)</p>
                            <p className="text-2xl font-bold gradient-text mt-1">{avgRecentViews.toLocaleString()}</p>
                            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                              Based on last {analyticsRecentVideos.length || 0} videos
                            </p>
                          </div>
                          <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
                            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>Engagement Pulse</p>
                            <p className="text-2xl font-bold gradient-text mt-1">{avgLikeRate.toFixed(2)}%</p>
                            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                              Avg likes rate | Comments {avgCommentRate.toFixed(2)}%
                            </p>
                          </div>
                        </div>

                        {analyticsRecentVideos.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Recent Video Views Trend</p>
                            <div className="p-3 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
                              {sparklinePoints ? (
                                <svg viewBox="0 0 100 100" className="w-full h-24">
                                  <polyline
                                    fill="none"
                                    stroke="var(--accent-primary)"
                                    strokeWidth="2.5"
                                    points={sparklinePoints}
                                  />
                                </svg>
                              ) : (
                                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Not enough video data for trend line.</p>
                              )}
                            </div>
                          </div>
                        )}

                        {analyticsRecentVideos.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Top Recent Videos by Views</p>
                            <div className="space-y-2">
                              {analyticsRecentVideos.slice(0, 6).map((video, idx) => {
                                const views = Number(video?.views || 0);
                                const likes = Number(video?.likes || 0);
                                const comments = Number(video?.comments || 0);
                                const likeRate = views > 0 ? (likes / views) * 100 : 0;
                                const commentRate = views > 0 ? (comments / views) * 100 : 0;
                                const barWidth = maxRecentViews > 0 ? (views / maxRecentViews) * 100 : 0;

                                return (
                                  <div key={`analytics-visual-${idx}`} className="p-2 rounded-lg border" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
                                    <div className="flex items-center justify-between gap-3">
                                      <p className="text-xs font-medium truncate flex-1">{video.title}</p>
                                      <p className="text-xs font-semibold">{views.toLocaleString()}</p>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-tertiary)" }}>
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${Math.max(6, barWidth)}%`,
                                          background: "linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))",
                                        }}
                                      />
                                    </div>
                                    <div className="mt-2 flex items-center gap-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                                      <span>Likes {likeRate.toFixed(2)}%</span>
                                      <span>Comments {commentRate.toFixed(2)}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
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
                        <p className="leading-relaxed whitespace-pre-wrap">{analyticsData.insights?.growth_roadmap}</p>
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
                          {analyticsData.insights?.what_works?.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                              <span className="text-green-500 text-xl">âœ“</span>
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
                          {analyticsData.insights?.critical_issues?.map((issue, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                              <span className="text-red-500 text-xl">âš </span>
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
                          {analyticsData.insights?.immediate_actions?.map((action, idx) => (
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
                          {analyticsData.insights?.seo_optimization?.map((tip, idx) => (
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
                          {analyticsData.insights?.content_strategy?.map((strategy, idx) => (
                            <li key={idx} className="flex items-start gap-3 p-3 rounded-lg" style={{backgroundColor: 'var(--bg-secondary)'}}>
                              <span className="text-indigo-500">🎹</span>
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
                          {analyticsData.insights?.discoverability_tactics?.map((tactic, idx) => (
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
                          {analyticsData.insights?.internet_money_lessons?.map((lesson, idx) => (
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
          </TabsContent>          {/* Grow in 120 Tab */}
          <TabsContent value="grow" className="space-y-4 sm:space-y-6 dashboard-section">
            <div className="grow-quest-shell relative">
              <div
                style={{
                  filter: isPro ? "none" : "blur(6px)",
                  pointerEvents: isPro ? "auto" : "none"
                }}
              >
                {!growthData?.challenge_start_date ? (
                  <Card className="dashboard-card grow-quest-hero grow-gameboard-card">
                    <CardContent className="p-8 sm:p-12">
                      <div className="grow-gameboard-onboarding">
                        <div className="grow-orbit grow-orbit-a" aria-hidden="true" />
                        <div className="grow-orbit grow-orbit-b" aria-hidden="true" />
                        <div className="grow-onboarding-copy text-center">
                          <div className="grow-chip mx-auto">Challenge Mode</div>
                          <h3 className="mt-4 text-3xl sm:text-5xl font-extrabold grow-game-title">Grow in 120</h3>
                          <p className="mt-4 text-sm sm:text-base max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
                            Turn your upload routine into a streak machine. Hit the board every day, clear your mission, fill the quest map, and stack momentum until the whole run is complete.
                          </p>
                        </div>
                        <div className="grow-onboarding-grid">
                          <div className="grow-hype-card">
                            <p className="grow-hype-label">Loop</p>
                            <p className="grow-hype-value">Create</p>
                            <p className="grow-hype-sub">Generate tags, sharpen descriptions, upload, repeat.</p>
                          </div>
                          <div className="grow-hype-card">
                            <p className="grow-hype-label">Reward</p>
                            <p className="grow-hype-value">Streaks</p>
                            <p className="grow-hype-sub">Every check-in adds visible momentum and badge unlocks.</p>
                          </div>
                          <div className="grow-hype-card">
                            <p className="grow-hype-label">Target</p>
                            <p className="grow-hype-value">120 Days</p>
                            <p className="grow-hype-sub">A full-season consistency run built for producers.</p>
                          </div>
                        </div>
                        <div className="mt-8 flex flex-col items-center gap-3">
                          <Button
                            onClick={handleStartChallenge}
                            disabled={loadingGrowth}
                            className="btn-modern text-base sm:text-lg py-6 px-12 grow-claim-button"
                          >
                            {loadingGrowth ? "Loading Quest..." : "Start My 120-Day Run"}
                          </Button>
                          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-secondary)" }}>
                            Build the habit. Protect the streak. Finish the arc.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    <Card className="dashboard-card grow-quest-hero grow-gameboard-card">
                      <CardContent className="p-4 sm:p-6 space-y-5">
                        <div className="grow-gameboard-top">
                          <div className="min-w-0">
                            <div className="grow-chip">Producer Quest Board</div>
                            <h3 className="mt-3 text-3xl sm:text-4xl font-extrabold grow-game-title">
                              Day {growthCurrentDay} / 120
                            </h3>
                            <p className="mt-2 text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
                              {growthCheckedInToday
                                ? "Today's check-in is locked. Keep the rhythm going tomorrow."
                                : "Today's streak is still unclaimed. Finish a task and stamp the board."}
                            </p>
                          </div>
                          <div className="grow-quest-rank grow-rank-panel">
                            <p className="text-xs uppercase tracking-wider">Current Rank</p>
                            <p className="font-bold text-lg">{growthRank}</p>
                            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                              {growthMilestoneGap} day{growthMilestoneGap === 1 ? "" : "s"} until the next milestone
                            </p>
                          </div>
                        </div>

                        <div className="grow-arc-track" aria-hidden="true">
                          <div className="grow-arc-fill" style={{ width: `${growthCompletionPercent}%` }} />
                        </div>

                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                          <div className="grow-stat-card grow-stat-card-hot">
                            <p className="grow-stat-kicker">Heat</p>
                            <p className="grow-stat-value">{growthData.current_streak} 🔥</p>
                            <p className="grow-stat-label">Live Streak</p>
                          </div>
                          <div className="grow-stat-card">
                            <p className="grow-stat-kicker">XP</p>
                            <p className="grow-stat-value">{growthData.total_days_completed}/120</p>
                            <p className="grow-stat-label">Days Cleared</p>
                          </div>
                          <div className="grow-stat-card">
                            <p className="grow-stat-kicker">Peak</p>
                            <p className="grow-stat-value">{growthData.longest_streak} 🏆</p>
                            <p className="grow-stat-label">Best Run</p>
                          </div>
                          <div className="grow-stat-card">
                            <p className="grow-stat-kicker">Finish</p>
                            <p className="grow-stat-value">{growthCompletionPercent}%</p>
                            <p className="grow-stat-label">{growthDaysRemaining} days left</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                      <Card className="dashboard-card lg:col-span-4 grow-mission-hub">
                        <CardHeader>
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-500" />
                            Daily Mission Hub
                          </CardTitle>
                          <CardDescription>Touch one productive action, then claim today.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grow-daily-status">
                            <div>
                              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--text-secondary)" }}>
                                Status
                              </p>
                              <p className="text-2xl font-extrabold gradient-text">
                                {growthCheckedInToday ? "Claimed" : "Ready"}
                              </p>
                            </div>
                            <div className={`grow-status-pulse ${growthCheckedInToday ? "is-complete" : ""}`}>
                              {growthCheckedInToday ? "✓" : "!"}
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="grow-mission-item">
                              <span className="grow-mission-dot">1</span>
                              <div>
                                <p className="font-semibold">Generate a fresh tag run</p>
                                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Wake up your next upload idea.</p>
                              </div>
                            </div>
                            <div className="grow-mission-item">
                              <span className="grow-mission-dot">2</span>
                              <div>
                                <p className="font-semibold">Refine or write a description</p>
                                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Keep the upload pipeline moving.</p>
                              </div>
                            </div>
                            <div className="grow-mission-item">
                              <span className="grow-mission-dot">3</span>
                              <div>
                                <p className="font-semibold">Upload or queue a beat</p>
                                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Progress counts. Momentum matters.</p>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={handleCheckin}
                            disabled={loadingGrowth}
                            className="w-full btn-modern py-4 grow-claim-button"
                          >
                            <CheckCircle2 className="mr-2 h-5 w-5" />
                            {loadingGrowth ? "Stamping..." : growthCheckedInToday ? "Today's Claim Locked" : "Claim Today's Streak"}
                          </Button>
                          <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
                            {growthCheckedInToday ? "You already banked today's progress." : "One click after any real task. Keep it honest and keep it moving."}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="dashboard-card lg:col-span-8 grow-map-card">
                        <CardHeader>
                          <div className="flex flex-wrap justify-between gap-2 items-center">
                            <CardTitle className="text-lg">120-Day Quest Map</CardTitle>
                            <Button onClick={fetchCalendar} variant="outline" size="sm">Refresh</Button>
                          </div>
                          <CardDescription>Hit completed tiles, avoid missed breaks, and inspect each day like a level node.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grow-map-stats">
                            <div className="grow-mini-pill">Next milestone: Day {nextGrowthMilestone}</div>
                            <div className="grow-mini-pill">{growthDaysRemaining} days to finish</div>
                            <div className="grow-mini-pill">{growthData.badges_earned?.length || 0} rewards unlocked</div>
                          </div>
                          {calendarData && (
                            <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2">
                              {Object.entries(calendarData.calendar || {}).slice(0, 120).map(([date, statusData], index) => {
                                const dayNumber = index + 1;
                                const safeStatusData = statusData && typeof statusData === "object" ? statusData : null;
                                const status = typeof statusData === "string" ? statusData : (safeStatusData?.status || "future");
                                const activity = safeStatusData?.activity || null;
                                const tileClass =
                                  status === "completed" ? "grow-tile-complete" :
                                  status === "missed" ? "grow-tile-missed" :
                                  status === "today" ? "grow-tile-today" :
                                  "grow-tile-future";

                                return (
                                  <button
                                    key={date}
                                    type="button"
                                    className={`grow-calendar-tile ${tileClass}`}
                                    onClick={() => setSelectedDay({ date, status, dayNumber, activity })}
                                    title={`Day ${dayNumber} - ${date}`}
                                  >
                                    <span className="grow-day-id">D{dayNumber}</span>
                                    {status === "completed" && <span className="text-[10px] font-extrabold">✓</span>}
                                    {status === "missed" && <span className="text-[10px] font-extrabold">X</span>}
                                    {status === "today" && <span className="text-[10px] font-extrabold">NOW</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {selectedDay && (
                            <div className="grow-day-panel">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <p className="font-bold gradient-text text-lg">Day {selectedDay.dayNumber}</p>
                                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{selectedDay.date}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>×</Button>
                              </div>
                              <div className="mt-3 text-sm">
                                {selectedDay.status === "completed" && (
                                  <p className="text-green-600 font-semibold">Mission cleared: {selectedDay.activity || "activity recorded"}</p>
                                )}
                                {selectedDay.status === "missed" && (
                                  <p className="text-red-600 font-semibold">Missed day. Momentum broke here.</p>
                                )}
                                {selectedDay.status === "today" && (
                                  <p className="text-purple-600 font-semibold">Live mission node. Do one real task, then lock it in.</p>
                                )}
                                {selectedDay.status === "future" && (
                                  <p style={{ color: "var(--text-secondary)" }}>Future tile. Protect the run until you get here.</p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="grow-legend-chip"><span className="grow-dot bg-green-500" /> Complete</span>
                            <span className="grow-legend-chip"><span className="grow-dot bg-red-500" /> Missed</span>
                            <span className="grow-legend-chip"><span className="grow-dot bg-purple-500" /> Today</span>
                            <span className="grow-legend-chip"><span className="grow-dot bg-gray-500" /> Future</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {growthData.badges_earned?.length > 0 && (
                      <Card className="dashboard-card grow-reward-vault">
                        <CardHeader>
                          <CardTitle className="text-lg">🏆 Reward Vault</CardTitle>
                          <CardDescription>Visible proof you stayed locked in.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {growthData.badges_earned.map((badge, idx) => (
                              <span key={idx} className="grow-badge-chip">{badge}</span>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
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
            </div>
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


