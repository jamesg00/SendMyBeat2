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
import { Sparkles, Save, LogOut, Copy, Trash2, Edit, Plus, Youtube, AlertCircle, Target, ChevronLeft, ChevronRight, DollarSign, Link, CircleAlert, CheckCircle2, Settings } from "lucide-react";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import UpgradeModal from "@/components/UpgradeModal";
import AdBanner from "@/components/AdBanner";
import ProgressBar from "@/components/ProgressBar";
import PublishWorkflow from "@/components/workflow/PublishWorkflow";
import { clearAuthToken } from "@/lib/auth";

const TAG_LIMIT = 120;
const TAG_HISTORY_LIMIT = 100;
const DEFAULT_TAG_PROVIDER = "grok";
const DASHBOARD_TABS = [
  { value: "workflow", label: "Workflow" },
  { value: "analytics", label: "Analytics", proOnly: true },
];

const DESCRIPTION_TEMPLATES = [
  {
    id: "basic-type-beat",
    name: "Basic Type Beat",
    blurb: "Simple SEO-friendly layout for standard YouTube beat uploads.",
    content: `🔥 Purchase / Download:

🎵 BPM:
🎹 Key:
🎧 Genre:

📩 Contact:
Email:

📺 YouTube:

⚠️ Usage:
Free for non-profit use only.
Credit: Prod. by [Your Name]

🏷️ Tags:
#typebeat #[artistname]typebeat #[genre]beat`,
  },
  {
    id: "beat-sales",
    name: "Beat Sales",
    blurb: "Built to drive traffic to your beat store and license page.",
    content: `🛒 Buy / Lease This Beat:

💰 Licensing:
Basic Lease -
Premium Lease -
Exclusive -

📧 Business Email:

📺 YouTube:

🎧 More Beats / Playlist:

🏷️ Tags:
#beatsforsale #typebeat #[genre]beat`,
  },
  {
    id: "seo-discovery",
    name: "SEO Discovery",
    blurb: "Keyword-first structure for artist, subgenre, and discovery terms.",
    content: `🎤 Artist / Style:
🔥 Mood / Subgenre:

🎵 BPM:
🎹 Key:

🛒 Buy / Lease:

📩 Custom Beat Contact:
Email:

📺 YouTube:

🏷️ Search Tags:
#[artistname]typebeat
#[subgenre]typebeat
#[year]typebeat
#freestylebeat`,
  },
  {
    id: "free-profit",
    name: "Free for Profit",
    blurb: "Clear rules for downloads, credits, and commercial upgrades.",
    content: `🔥 FREE FOR PROFIT 🔥

🎧 Free Download:

📌 Rules:
1. Credit: Prod. by [Your Name]
2. Lease required for Spotify / Apple Music / DSP release
3. Contact for exclusive rights

📩 Email:

📺 YouTube:

🎵 Beat Details:
BPM:
Key:

🏷️ Tags:
#freeforprofit #typebeat #freerapbeat`,
  },
  {
    id: "channel-conversion",
    name: "Channel Conversion",
    blurb: "For producers pushing repeat listeners into playlists, socials, and store clicks.",
    content: `🛒 Buy / Lease:

🎵 BPM:
🎹 Key:

🔥 More Beats:
Playlist:

📧 Business Contact:
Email:

📺 YouTube:

⚠️ Rights:
All rights reserved unless licensed.

🏷️ Tags:
#typebeat #beatsforsale #[artistname]typebeat`,
  },
];

const toSafeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toSafeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeAnalyticsText = (value) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/âœ"/g, "")
    .replace(/âš /g, "")
    .replace(/âš /g, "")
    .replace(/â€™/g, "'")
    .replace(/â€"/g, "-")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .trim();
};

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
      channel_health_score: normalizeAnalyticsText(typeof insights.channel_health_score === "string" ? insights.channel_health_score : "N/A"),
      growth_roadmap: normalizeAnalyticsText(typeof insights.growth_roadmap === "string" ? insights.growth_roadmap : ""),
      what_works: toSafeArray(insights.what_works).map(normalizeAnalyticsText).filter(Boolean),
      critical_issues: toSafeArray(insights.critical_issues).map(normalizeAnalyticsText).filter(Boolean),
      immediate_actions: toSafeArray(insights.immediate_actions).map(normalizeAnalyticsText).filter(Boolean),
      seo_optimization: toSafeArray(insights.seo_optimization).map(normalizeAnalyticsText).filter(Boolean),
      content_strategy: toSafeArray(insights.content_strategy).map(normalizeAnalyticsText).filter(Boolean),
      discoverability_tactics: toSafeArray(insights.discoverability_tactics).map(normalizeAnalyticsText).filter(Boolean),
      internet_money_lessons: toSafeArray(insights.internet_money_lessons).map(normalizeAnalyticsText).filter(Boolean),
    },
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

  const normalizeTagKey = (tag = "") => String(tag || "").trim().toLowerCase();

  const buildTagScoreMap = (scoredTags = []) => {
    const next = {};
    (Array.isArray(scoredTags) ? scoredTags : []).forEach((entry) => {
      const key = normalizeTagKey(entry?.tag);
      if (key) {
        next[key] = entry;
      }
    });
    return next;
  };

const Dashboard = ({ setIsAuthenticated }) => {
  const [user, setUser] = useState(null);
  const [tagQuery, setTagQuery] = useState("");
  const [customTags, setCustomTags] = useState("");
  const [additionalTags, setAdditionalTags] = useState("");
  const [generatedTags, setGeneratedTags] = useState([]);
  const [generatedTagScores, setGeneratedTagScores] = useState({});
  const [tagDebug, setTagDebug] = useState(null);
  const [showTagDebug, setShowTagDebug] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagHistory, setTagHistory] = useState([]);
  const [selectedTagHistoryIds, setSelectedTagHistoryIds] = useState([]);
  const [activeTagHistoryId, setActiveTagHistoryId] = useState(null);
  const [activeTab, setActiveTab] = useState("workflow");
  const [descriptions, setDescriptions] = useState([]);
  const [loadingDescriptions, setLoadingDescriptions] = useState(false);
  const [newDescription, setNewDescription] = useState({ title: "", content: "" });
  const [showAllDescriptionTemplates, setShowAllDescriptionTemplates] = useState(false);
  const [editingDesc, setEditingDesc] = useState(null);

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
  const [syncingSubscription, setSyncingSubscription] = useState(false);
  const [userLoaded, setUserLoaded] = useState(false);
  const [descriptionsLoaded, setDescriptionsLoaded] = useState(false);
  const [tagHistoryLoaded, setTagHistoryLoaded] = useState(false);

  // Analytics states
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [previousUtilityTab, setPreviousUtilityTab] = useState("workflow");


  const [joiningTagsLoading, setJoiningTagsLoading] = useState(false);
  const [joiningTagsProgress, setJoiningTagsProgress] = useState(0);
  const joinProgressIntervalRef = useRef(null);
  const dashboardParallaxRef = useRef(null);

  const analyticsPlan = subscriptionStatus?.plan || "free";
  const hasPaidAnalyticsAccess = ["plus", "max"].includes(analyticsPlan);
  const isAdmin = Boolean(user?.is_admin);
  const canViewTagDebug = isAdmin;
  const visibleTabs = DASHBOARD_TABS;
  const isAnalyticsLocked = !hasPaidAnalyticsAccess;
  const adEligibleTabs = ["workflow", "analytics"].includes(activeTab);
  const activeTabIndex = Math.max(0, visibleTabs.findIndex((tab) => tab.value === activeTab));
  const activeTabLabel = visibleTabs[activeTabIndex]?.label || "Workflow";
  const canShowAds = Boolean(
    subscriptionStatus &&
    !subscriptionStatus.is_subscribed &&
    userLoaded &&
    adEligibleTabs
  );
  const visibleDescriptionTemplates = showAllDescriptionTemplates
    ? DESCRIPTION_TEMPLATES
    : DESCRIPTION_TEMPLATES.slice(0, 2);

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
  const goToPreviousTab = () => {
    const previousIndex = (activeTabIndex - 1 + visibleTabs.length) % visibleTabs.length;
    const previousTab = visibleTabs[previousIndex]?.value;
    if (previousTab === "analytics" && isAnalyticsLocked) return;
    setActiveTab(previousTab);
  };

  const goToNextTab = () => {
    const nextIndex = (activeTabIndex + 1) % visibleTabs.length;
    const nextTab = visibleTabs[nextIndex]?.value;
    if (nextTab === "analytics" && isAnalyticsLocked) return;
    setActiveTab(nextTab);
  };

  const handleDashboardTabChange = (nextTab) => {
    if (nextTab === "analytics" && isAnalyticsLocked) {
      return;
    }
    setActiveTab(nextTab);
  };

  useEffect(() => {
    fetchUser();
    fetchDescriptions();
    fetchTagHistory();
    checkYouTubeConnection();
    fetchSubscriptionStatus();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") !== "true") {
      return;
    }

    syncSubscriptionStatus({ silent: true })
      .then((data) => {
        if (data?.is_subscribed) {
          toast.success(`Your ${data.plan === "max" ? "Max" : "Plus"} plan is active`);
        } else {
          toast.error("Payment return detected, but billing has not synced yet. Try Refresh Billing Status.");
        }
      })
      .catch(() => {
        toast.error("Could not verify your subscription yet. Try Refresh Billing Status.");
      })
      .finally(() => {
        params.delete("upgraded");
        const nextQuery = params.toString();
        const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash || ""}`;
        window.history.replaceState({}, "", nextUrl);
      });
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
    const isUtilityView = activeTab === "settings";
    if (!isUtilityView && !visibleTabs.some((tab) => tab.value === activeTab)) {
      setActiveTab(visibleTabs[0]?.value || "workflow");
    }
  }, [activeTab, visibleTabs]);


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
      setGeneratedTagScores((prev) => {
        const next = {};
        nextTags.forEach((tag) => {
          const existing = prev[normalizeTagKey(tag)];
          if (existing) {
            next[normalizeTagKey(tag)] = existing;
          }
        });
        return next;
      });
      return;
    }

    const response = await axios.patch(`${API}/tags/history/${tagId}`, {
      tags: nextTags,
      excluded_tags: removedTags,
    });
    setGeneratedTags(response.data?.tags || nextTags);
    setGeneratedTagScores(buildTagScoreMap(response.data?.scored_tags || []));
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

  const syncSubscriptionStatus = async ({ silent = false } = {}) => {
    setSyncingSubscription(true);
    try {
      const response = await axios.post(`${API}/subscription/sync`);
      setSubscriptionStatus(response.data);
      if (!silent) {
        toast.success(response.data?.is_subscribed ? "Subscription refreshed" : "No active paid subscription found");
      }
      return response.data;
    } catch (error) {
      const detail = error?.response?.data?.detail;
      if (!silent) {
        toast.error(typeof detail === "string" ? detail : "Failed to refresh billing status");
      }
      throw error;
    } finally {
      setSyncingSubscription(false);
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

  const pollBackgroundJobUntilDone = async (jobId, { intervalMs = 2500, maxAttempts = 240 } = {}) => {
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

  const handleAnalyzeChannel = async () => {
    setLoadingAnalytics(true);
    setProgressActive(true);
    setProgressMessage("📈 Analyzing your channel performance and generating AI growth strategy...");
    setProgressDuration(45000);
    try {
      const response = await axios.post(`${API}/youtube/analytics`);
      if (response?.data?.result) {
        setAnalyticsData(normalizeAnalyticsData(response.data.result));
        toast.success(response?.data?.cached ? "Loaded recent channel analysis" : "Channel analysis complete!");
        await fetchSubscriptionStatus();
        return;
      }
      const jobId = response?.data?.job?.id;
      if (!jobId) {
        throw new Error("Channel analytics job was not created");
      }
      const result = await pollBackgroundJobUntilDone(jobId, { intervalMs: 3000 });
      setAnalyticsData(normalizeAnalyticsData(result));
      toast.success("Channel analysis complete!");

      // Refresh credits after analysis
      await fetchSubscriptionStatus();
    } catch (error) {
      if (error.response?.status === 402) {
      const detail = error.response.data.detail;
      toast.error(detail.message || "Analytics limit reached");
      setShowUpgradeModal(true);
      } else if (error.response?.status === 400) {
        const detail = error.response?.data?.detail;
        toast.error(typeof detail === "string" ? detail : (detail?.message || "Please connect your YouTube account first"));
      } else if (error.response?.status === 401) {
        toast.error("YouTube auth expired. Reconnect your YouTube account.");
      } else {
        console.error("Analytics error:", error);
        toast.error(getApiErrorMessage(error, "Failed to analyze channel"));
      }

      // Still refresh credits on error to show updated count
      await fetchSubscriptionStatus();
    } finally {
      setLoadingAnalytics(false);
      setProgressActive(false);
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
    setProgressMessage("Generating optimized tags using AI + YouTube signals...");
    setProgressDuration(45000); // 45 seconds for tag generation

    try {
      const response = await axios.post(
        `${API}/tags/generate`,
          {
            query: tagQuery,
            custom_tags: customTagsArray,
            llm_provider: DEFAULT_TAG_PROVIDER
          },
        { signal: controller.signal }
      );
      const queuedJobId = response?.data?.job?.id;
      const resultPayload = queuedJobId ? await pollBackgroundJobUntilDone(queuedJobId, { intervalMs: 2500, maxAttempts: 180 }) : response.data;
      setGeneratedTags(resultPayload.tags);
      setGeneratedTagScores(buildTagScoreMap(resultPayload?.scored_tags || []));
      setActiveTagHistoryId(resultPayload.id);
      setSelectedTagHistoryIds([resultPayload.id]);
      setTagDebug(canViewTagDebug ? resultPayload?.debug || null : null);
      upsertTagHistoryItem(resultPayload);
      const minScore = resultPayload?.debug?.source_counts?.min_publish_score
        ?? resultPayload?.debug?.tag_metrics?.effective_min_score
        ?? 58;
      toast.success(`Generated ${resultPayload.tags.length} high-intent tags (score ≥ ${minScore})`);

      // Refresh credits after a short delay to ensure backend has updated
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);

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
        toast.error(getApiErrorMessage(error, "Failed to generate tags"));
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

  const handleAddMoreTags = async () => {
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

    const nextScoreState = (() => {
      const next = {};
      uniqueTags.forEach((tag) => {
        const existing = generatedTagScores[normalizeTagKey(tag)];
        if (existing) {
          next[normalizeTagKey(tag)] = existing;
        }
      });
      newTags.forEach((tag) => {
        const key = normalizeTagKey(tag);
        if (!next[key]) {
          next[key] = {
            tag,
            score: 52,
            reason: "Manually added by the user. No model quality rating yet.",
            source: "manual",
          };
        }
      });
      return next;
    })();

    setGeneratedTags(uniqueTags);
    setGeneratedTagScores(nextScoreState);
    if (activeTagHistoryId) {
      try {
        const response = await axios.patch(`${API}/tags/history/${activeTagHistoryId}`, {
          tags: uniqueTags,
          added_tags: newTags,
        });
        setGeneratedTags(response.data?.tags || uniqueTags);
        setGeneratedTagScores(buildTagScoreMap(response.data?.scored_tags || []));
        upsertTagHistoryItem(response.data);
      } catch (error) {
        toast.error("Added locally, but failed to save tag feedback");
      }
    }
    setTagDebug(null);
    setShowTagDebug(false);
    setAdditionalTags(""); // Clear input
    toast.success(`Added ${newTags.length} tags! Total: ${uniqueTags.length}/${TAG_LIMIT}`);
  };

  const fetchTagDebug = async (tagId) => {
    if (!tagId || !canViewTagDebug) {
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
        setGeneratedTagScores(buildTagScoreMap(nextActiveItem?.scored_tags || []));
        setTagQuery(nextActiveItem.query || "");
        fetchTagDebug(nextActiveItem.id);
        toast.success("Tags loaded!");
      }
    } else {
      setGeneratedTags([]);
      setGeneratedTagScores({});
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
        llm_provider: DEFAULT_TAG_PROVIDER
      });
      const queuedJobId = joinResponse?.data?.job?.id;
      const joinPayload = queuedJobId ? await pollBackgroundJobUntilDone(queuedJobId, { intervalMs: 2500, maxAttempts: 180 }) : joinResponse.data;
      const optimizedTags = Array.isArray(joinPayload?.tags) ? joinPayload.tags : [];
      if (!optimizedTags.length) {
        toast.error("AI join returned no tags. Please try again.");
        return;
      }

      setGeneratedTags(optimizedTags);
      setGeneratedTagScores(buildTagScoreMap(joinPayload?.scored_tags || []));
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
      setGeneratedTagScores(buildTagScoreMap(saveResponse.data?.scored_tags || []));
      setJoiningTagsProgress(100);
      toast.success(
        `AI joined ${selectedItems.length} generations! Optimized to ${optimizedTags.length} SEO tags.`
      );
    } catch (error) {
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily limit reached! Upgrade to continue.");
      } else {
        toast.error(getApiErrorMessage(error, "Failed to join with AI. Please try again."));
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

  const handleClearTagSelection = () => {
    setSelectedTagHistoryIds([]);
    setActiveTagHistoryId(null);
    setGeneratedTags([]);
    setGeneratedTagScores({});
    setTagQuery("");
    setTagDebug(null);
    setShowTagDebug(false);
  };

  const handleDeleteTagHistoryItem = async (itemId) => {
    try {
      await axios.delete(`${API}/tags/history/${itemId}`);
      const updatedHistory = tagHistory.filter((t) => t.id !== itemId);
      setTagHistory(updatedHistory);
      setSelectedTagHistoryIds((prev) => {
        const nextSelected = prev.filter((entryId) => entryId !== itemId);
        if (activeTagHistoryId === itemId) {
          const nextActiveId = nextSelected[nextSelected.length - 1] || null;
          if (nextActiveId) {
            const nextActiveItem = updatedHistory.find((entry) => entry.id === nextActiveId);
            if (nextActiveItem) {
              setActiveTagHistoryId(nextActiveId);
              setGeneratedTags(nextActiveItem.tags || []);
              setGeneratedTagScores(buildTagScoreMap(nextActiveItem?.scored_tags || []));
              setTagQuery(nextActiveItem.query || "");
              fetchTagDebug(nextActiveId);
            }
          } else {
            setActiveTagHistoryId(null);
            setGeneratedTags([]);
            setGeneratedTagScores({});
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
  };

  const handleRemoveGeneratedTag = async (tagIndex) => {
    const removedTag = generatedTags[tagIndex];
    const nextTags = generatedTags.filter((_, i) => i !== tagIndex);
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

  const handleApplyDescriptionTemplate = (template) => {
    setNewDescription((prev) => ({
      ...prev,
      content: template.content,
    }));
    toast.success(`${template.name} template loaded`);
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

  const handleManageSubscriptionPortal = async () => {
    try {
      const response = await axios.post(`${API}/subscription/portal`);
      window.location.href = response.data.url;
    } catch (error) {
      toast.error("Failed to open subscription management");
    }
  };

  const openSettingsView = () => {
    if (activeTab !== "settings") {
      setPreviousUtilityTab(activeTab || "workflow");
    }
    setActiveTab("settings");
  };

  const closeSettingsView = () => {
    setActiveTab(previousUtilityTab || "workflow");
  };

  return (
    <div
      ref={dashboardParallaxRef}
      className="min-h-screen dashboard-parallax-bg"
      data-testid="dashboard"
    >
      <div className="dashboard-grid-layer" aria-hidden="true" />

      {/* Header */}
      <div className="terminal-topbar">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 dashboard-shell">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4">
            <div className="flex flex-1 items-center gap-2 sm:gap-3 md:gap-4 min-w-0 max-w-full">
              <div className="min-w-0 flex-1">
                <h1 className="dashboard-brand-title text-lg sm:text-xl md:text-2xl font-bold">SENDMYBEAT</h1>
                {user && (
                  <p
                    className="dashboard-brand-subtitle text-xs sm:text-sm truncate max-w-[180px] sm:max-w-[260px] md:max-w-[340px] lg:max-w-[420px]"
                    style={{ color: "var(--text-secondary)" }}
                    title={`Welcome back, ${user.username}`}
                  >
                    {user.username}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto flex-wrap lg:flex-nowrap lg:justify-end self-stretch lg:self-auto">
              {/* Show Upgrade button for free users */}
              {subscriptionStatus && !subscriptionStatus.is_subscribed && (
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  variant="outline"
                  className="terminal-header-button text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap"
                  data-testid="header-upgrade-btn"
                >
                  <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Plan
                </Button>
              )}

              {/* Show Pro badge for subscribed users */}
              {subscriptionStatus && subscriptionStatus.is_subscribed && (
                <div className="terminal-plan-badge px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm whitespace-nowrap">
                  {subscriptionStatus.plan === "max" ? "MAX" : "PLUS"}
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => window.location.href = '/spotlight'}
                className="terminal-header-button gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2"
              >
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xl:inline font-bold">Spotlight</span>
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/admin/costs'}
                  className="terminal-header-button gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2"
                  title="View Backend Costs"
                >
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xl:inline">Costs</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={openSettingsView}
                className="terminal-header-button gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2"
                data-testid="header-settings-btn"
              >
                <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xl:inline">Prefs</span>
                <span className="xl:hidden">Prefs</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="terminal-header-button gap-1 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2"
                data-testid="logout-btn"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xl:inline">Exit</span>
                <span className="xl:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
       <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8 dashboard-shell space-y-6 sm:space-y-8">
         {!youtubeConnected && (
           <div className="rounded-3xl border border-yellow-400/40 bg-gradient-to-r from-yellow-500/12 via-orange-500/10 to-transparent px-4 py-4 sm:px-5 shadow-[0_0_34px_rgba(249,115,22,0.12)]">
             <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
               <div>
                 <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                   Connect your Google account for uploads, channel tools, and a stronger Producer Spotlight profile.
                 </p>
                 <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                   Your spotlight profile can still show up without it, but connecting helps verify your identity and channel data.
                 </p>
               </div>
               <Button
                 onClick={connectYouTube}
                 className="gap-2 self-start bg-gradient-to-r from-yellow-400 to-orange-500 font-semibold text-black hover:from-yellow-300 hover:to-orange-400 lg:self-center"
               >
                 <Youtube className="h-4 w-4" />
                 Connect Google Account
               </Button>
             </div>
           </div>
         )}
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
            showManageButton={false}
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

        <Tabs value={activeTab} onValueChange={handleDashboardTabChange} className="space-y-4 sm:space-y-6">
          {activeTab !== "settings" && (
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
          )}

          {activeTab !== "settings" && (
          <TabsList
            className="hidden sm:grid w-full max-w-3xl mx-auto gap-0.5 text-[10px] sm:text-[11px] dashboard-tabs dashboard-tabs-desktop relative overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${Math.max(visibleTabs.length, 1)}, minmax(0, 1fr))` }}
          >
            {visibleTabs.map((tab, index) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  data-testid={`${tab.value}-tab`}
                  disabled={tab.value === "analytics" && isAnalyticsLocked}
                  className={`dashboard-tab-trigger relative z-10 flex min-h-[42px] items-center justify-center px-1.5 py-1 text-center leading-none whitespace-nowrap transition-colors data-[state=active]:bg-transparent data-[state=active]:text-white ${index > 0 ? "dashboard-tab-trigger--separated" : ""} ${tab.value === "analytics" && isAnalyticsLocked ? "dashboard-tab-trigger--locked" : ""}`}
                >
                  {tab.value === "analytics" && isAnalyticsLocked ? (
                    <span className="dashboard-tab-lock-copy">
                      <span>{tab.label}</span>
                      <span className="dashboard-tab-lock-badge">Pro Only</span>
                    </span>
                  ) : (
                    tab.label
                  )}
                </TabsTrigger>
            ))}
          </TabsList>
          )}

          {canShowAds && activeTab !== "workflow" && (
            <AdBanner
              isSubscribed={subscriptionStatus.is_subscribed}
              style={{ marginBottom: "12px" }}
            />
          )}

          <TabsContent value="workflow" className="space-y-4 sm:space-y-6 dashboard-section">
            <PublishWorkflow
              subscriptionStatus={subscriptionStatus}
              youtubeConnected={youtubeConnected}
              youtubeProfilePicture={youtubeProfilePicture}
              youtubeName={youtubeName}
              youtubeEmail={youtubeEmail}
              onConnectYouTube={connectYouTube}
              onDisconnectYouTube={disconnectYouTube}
              onOpenAnalytics={() => {
                if (!hasPaidAnalyticsAccess) {
                  setShowUpgradeModal(true);
                  return;
                }
                setActiveTab("analytics");
              }}
              onOpenUpgrade={() => setShowUpgradeModal(true)}
              hasPaidAnalyticsAccess={hasPaidAnalyticsAccess}
              tagsSectionProps={{
                tagHistory,
                selectedTagHistoryIds,
                joiningTagsLoading,
                joiningTagsProgress,
                handleJoinSelectedTagHistory,
                handleClearTagSelection,
                formatTagHistoryLabel,
                activeTagHistoryId,
                handleTagHistoryTileClick,
                handleDeleteTagHistoryItem,
                generatedTags,
                loadingTags,
                handleGenerateTags,
                copyTags,
                generatedTagScores,
                normalizeTagKey,
                handleRemoveGeneratedTag,
                additionalTags,
                setAdditionalTags,
                tagLimit: TAG_LIMIT,
                handleAddMoreTags,
                canViewTagDebug,
                tagDebug,
                showTagDebug,
                setShowTagDebug,
                tagQuery,
                setTagQuery,
                minPublishScore:
                  tagDebug?.source_counts?.min_publish_score
                  ?? tagDebug?.tag_metrics?.effective_min_score
                  ?? 58,
              }}
              descriptionsSectionProps={{
                descriptions,
                newDescription,
                visibleDescriptionTemplates,
                descriptionTemplates: DESCRIPTION_TEMPLATES,
                showAllDescriptionTemplates,
                setShowAllDescriptionTemplates,
                handleApplyDescriptionTemplate,
                setNewDescription,
                handleSaveDescription,
                loadingDescriptions,
                expandedDescriptions,
                editingDesc,
                setEditingDesc,
                handleUpdateDescription,
                handleDeleteDescription,
                copyDescription,
                toggleDescriptionExpand,
              }}
              uploadStudioProps={{
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
                onUpgrade: () => setShowUpgradeModal(true),
                onDisconnectYouTube: disconnectYouTube,
                onConnectYouTube: connectYouTube,
              }}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 dashboard-section">
            <div className="flex justify-start">
              <Button variant="outline" onClick={closeSettingsView} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                  <CardDescription>
                    Manage billing and plan changes without leaving settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Current plan: {(subscriptionStatus?.plan || "free").toUpperCase()}
                    </div>
                    <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {subscriptionStatus?.is_subscribed ? "Active paid subscription" : "Free plan active"}
                    </div>
                  </div>
                  {subscriptionStatus?.is_subscribed ? (
                    <Button onClick={handleManageSubscriptionPortal} variant="outline" className="w-full">
                      Manage Subscription
                    </Button>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button onClick={() => setShowUpgradeModal(true)} className="w-full">
                        Upgrade Plan
                      </Button>
                      <Button onClick={() => syncSubscriptionStatus()} variant="outline" className="w-full" disabled={syncingSubscription}>
                        {syncingSubscription ? "Refreshing..." : "Refresh Billing Status"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="dashboard-card">
                <CardHeader>
                  <CardTitle>Google Account</CardTitle>
                  <CardDescription>
                    Connect or disconnect the Google account used for YouTube uploads.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border p-4" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {youtubeConnected ? (youtubeName || youtubeEmail || "Google account connected") : "No Google account connected"}
                    </div>
                    <div className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {youtubeConnected ? "Disconnect to switch to another Google account." : "Connect a Google account to upload to YouTube."}
                    </div>
                  </div>
                  {youtubeConnected ? (
                    <Button onClick={disconnectYouTube} variant="outline" className="w-full">
                      Disconnect Google Account
                    </Button>
                  ) : (
                    <Button onClick={connectYouTube} className="w-full">
                      Connect Google Account
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
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
                  {hasPaidAnalyticsAccess
                    ? "Get AI-powered insights on your channel performance (uses 1 AI credit)"
                    : "Channel analytics is available on paid plans."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!hasPaidAnalyticsAccess && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Channel analytics is a paid feature. Upgrade to Plus or Max to unlock channel analysis.
                    </AlertDescription>
                  </Alert>
                )}
                <div>
                  {!youtubeConnected ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Connect your YouTube account first to analyze your channel.
                      </AlertDescription>
                    </Alert>
                  ) : hasPaidAnalyticsAccess ? (
                    <Button
                      onClick={handleAnalyzeChannel}
                      disabled={loadingAnalytics}
                      className="w-full btn-modern"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      {loadingAnalytics ? "Analyzing..." : "Analyze My Channel"}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowUpgradeModal(true)}
                      className="w-full btn-modern"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Upgrade For Channel Analytics
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
                              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
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
                              <CircleAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        loading={upgradingSubscription}
      />

    </div>
  );
};

export default Dashboard;
