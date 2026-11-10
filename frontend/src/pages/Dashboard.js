import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Sparkles, Youtube, AlertCircle, Link, CircleAlert, CheckCircle2, Music, BarChart3 } from "lucide-react";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import AppShell, { planLabelFor } from "@/components/AppShell";
import ThemePicker from "@/components/ThemePicker";
import { useNavigate } from "react-router-dom";
import UpgradeModal from "@/components/UpgradeModal";
import AdBanner from "@/components/AdBanner";
import ProgressBar from "@/components/ProgressBar";
import PublishWorkflow from "@/components/workflow/PublishWorkflow";
import ChannelReport from "@/components/analytics/ChannelReport";
import StylePlanCard from "@/components/pros/StylePlanCard";
import { useStylePlan } from "@/components/pros/prosData";
import { AccountLinksCard, CreditsCard, FeedbackCard, StylePlanSection, SupportCard, VerificationCard } from "@/components/profile/ProfileExtras";
import { clearAuthToken } from "@/lib/auth";

const TAG_LIMIT = 120;
const TAG_HISTORY_LIMIT = 100;
const DEFAULT_TAG_PROVIDER = "grok";
const DASHBOARD_TABS = [
  { value: "workflow", label: "Create" },
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
      id: video?.id,
      title: typeof video?.title === "string" ? video.title : "Untitled",
      views: toSafeNumber(video?.views, 0),
      likes: toSafeNumber(video?.likes, 0),
      comments: toSafeNumber(video?.comments, 0),
      published_at: typeof video?.published_at === "string" ? video.published_at : "",
    })),
    insights: {
      channel_health_score: normalizeAnalyticsText(typeof insights.channel_health_score === "string" ? insights.channel_health_score : "N/A"),
      growth_roadmap: normalizeAnalyticsText(typeof insights.growth_roadmap === "string" ? insights.growth_roadmap : ""),
      // Per-upload reviews (index 1 = newest) and the title patterns that win and lose.
      video_reviews: toSafeArray(insights.video_reviews).filter((r) => r && typeof r === "object"),
      title_patterns: insights.title_patterns && typeof insights.title_patterns === "object" ? insights.title_patterns : null,
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
  const navigate = useNavigate();
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
  const [activeTab, setActiveTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    return ["workflow", "analytics", "settings"].includes(requested) ? requested : "workflow";
  });
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
  // ?plans=pro (from the Pros pages) opens the plans straight away.
  const { plan: stylePlan, setPlan: setStylePlan } = useStylePlan();
  const [showUpgradeModal, setShowUpgradeModal] = useState(() => new URLSearchParams(window.location.search).has("plans"));
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

  const analyticsPlan = subscriptionStatus?.plan || "free";
  const hasPaidAnalyticsAccess = ["plus", "max"].includes(analyticsPlan);
  const isAdmin = Boolean(user?.is_admin);
  const canViewTagDebug = isAdmin;
  const visibleTabs = DASHBOARD_TABS;
  const isAnalyticsLocked = !hasPaidAnalyticsAccess;
  const adEligibleTabs = ["workflow", "analytics"].includes(activeTab);
  const canShowAds = Boolean(
    subscriptionStatus &&
    !subscriptionStatus.is_subscribed &&
    userLoaded &&
    adEligibleTabs
  );
  const visibleDescriptionTemplates = showAllDescriptionTemplates
    ? DESCRIPTION_TEMPLATES
    : DESCRIPTION_TEMPLATES.slice(0, 2);

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
          toast.success(data.trial ? "Your free trial is on" : `Your ${data.plan === "max" ? "Pro" : "Plus"} plan is active`);
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
    const isUtilityView = activeTab === "settings";
    if (!isUtilityView && !visibleTabs.some((tab) => tab.value === activeTab)) {
      setActiveTab(visibleTabs[0]?.value || "workflow");
    }
    if (activeTab === "analytics" && subscriptionStatus && isAnalyticsLocked) {
      setActiveTab("workflow");
    }
  }, [activeTab, visibleTabs, subscriptionStatus, isAnalyticsLocked]);


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

  const handleUpgrade = async (plan = "plus", trial = false) => {
    setUpgradingSubscription(true);
    try {
      const response = await axios.post(`${API}/subscription/create-checkout`, {
        success_url: `${window.location.origin}/dashboard?upgraded=true`,
        cancel_url: `${window.location.origin}/dashboard`,
        plan,
        trial,
      });

      // Already subscribed: the server switched the plan in place, no checkout page.
      if (response.data?.switched) {
        await syncSubscriptionStatus({ silent: true });
        toast.success(`You're on ${plan === "plus" ? "Plus" : "Pro"} now`);
        setShowUpgradeModal(false);
        setUpgradingSubscription(false);
        return;
      }
      // Redirect to Stripe checkout
      window.location.href = response.data.checkout_url;
    } catch (error) {
      const detail = error?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : detail?.message || "Failed to start checkout");
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


  const pageTitles = {
    workflow: { title: "Create", crumb: "Tags, description and upload for one beat" },
    analytics: { title: "Analytics", crumb: "How your channel is doing" },
    settings: { title: "Settings", crumb: "Plan, Google account and theme" },
  };
  const currentPage = pageTitles[activeTab] || pageTitles.workflow;

  const handleShellSelect = (id) => {
    if (id === "spotlight") {
      navigate("/spotlight");
      return;
    }
    if (id === "settings") {
      openSettingsView();
      return;
    }
    if (id === "analytics" && isAnalyticsLocked) {
      setShowUpgradeModal(true);
      return;
    }
    setActiveTab(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const creditsPanel = subscriptionStatus ? (
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
  ) : null;

  return (
    <div className="min-h-screen dashboard-parallax-bg" data-testid="dashboard">
      <AppShell
        active={activeTab}
        onSelect={handleShellSelect}
        title={currentPage.title}
        crumb={currentPage.crumb}
        username={user?.username}
        planLabel={planLabelFor(subscriptionStatus)}
        analyticsLocked={isAnalyticsLocked}
        isAdmin={isAdmin}
        onAdmin={(path) => navigate(path)}
        onLogout={handleLogout}
        credits={creditsPanel}
      >
        {/* Credits sit in the sidebar on desktop; phones see them here. */}
        {creditsPanel ? <div className="smb-ph-only">{creditsPanel}</div> : null}

        {!youtubeConnected && (
          <div className="smb-notice">
            <Youtube className="smb-ico" aria-hidden="true" />
            <p>Connect Google to upload to YouTube and verify your Spotlight profile.</p>
            <Button onClick={connectYouTube} className="smb-btn smb-btn--sec smb-btn--sm">
              Connect
            </Button>
          </div>
        )}

        <ProgressBar
          isActive={progressActive}
          message={progressMessage}
          duration={progressDuration}
          onCancel={
            loadingTags ? handleCancelTagGeneration :
            null
          }
        />

        <Tabs value={activeTab} onValueChange={handleDashboardTabChange} className="smb-tabs-root">
          {canShowAds && activeTab !== "workflow" && (
            <AdBanner
              isSubscribed={subscriptionStatus.is_subscribed}
              style={{ marginBottom: "12px" }}
            />
          )}

          <TabsContent value="workflow" className="space-y-4 sm:space-y-6 dashboard-section">
            {stylePlan ? <StylePlanCard plan={stylePlan} onChange={setStylePlan} /> : null}
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
          <TabsContent value="settings" className="dashboard-section">
            <div className="smb-grid2">
              <CreditsCard subscription={subscriptionStatus} onPlans={() => setShowUpgradeModal(true)} />
              <VerificationCard onOpenSpotlight={() => navigate("/spotlight")} />
              <StylePlanSection />
              <section className="smb-card">
                <div className="smb-card-head">
                  <h2 className="smb-card-title">Plan</h2>
                  <span className="smb-badge">{planLabelFor(subscriptionStatus) || "Free"}</span>
                </div>
                <p className="smb-t2">
                  {subscriptionStatus?.is_subscribed
                    ? subscriptionStatus?.trial
                      ? "Your free trial is on. You can manage or cancel it in billing."
                      : "Your paid plan is active."
                    : "You're on the free plan."}
                </p>
                {subscriptionStatus?.is_subscribed ? (
                  <Button onClick={handleManageSubscriptionPortal} className="smb-btn smb-btn--sec smb-btn--full">
                    Manage billing
                  </Button>
                ) : (
                  <div className="smb-row-2">
                    <Button onClick={() => setShowUpgradeModal(true)} className="smb-btn smb-btn--pri">
                      See plans
                    </Button>
                    <Button onClick={() => syncSubscriptionStatus()} className="smb-btn smb-btn--sec" disabled={syncingSubscription}>
                      {syncingSubscription ? "Refreshing..." : "Refresh billing"}
                    </Button>
                  </div>
                )}
              </section>

              <section className="smb-card">
                <div className="smb-card-head">
                  <h2 className="smb-card-title">Google account</h2>
                  {youtubeConnected ? (
                    <span className="smb-pill smb-pill--ok"><span className="smb-pill-dot" />Connected</span>
                  ) : (
                    <span className="smb-pill smb-pill--warn">Not connected</span>
                  )}
                </div>
                <p className="smb-t2">
                  {youtubeConnected
                    ? `${youtubeName || youtubeEmail || "Your Google account"} is used for YouTube uploads.`
                    : "Connect a Google account to upload to YouTube."}
                </p>
                {youtubeConnected ? (
                  <Button onClick={disconnectYouTube} className="smb-btn smb-btn--sec smb-btn--full">
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={connectYouTube} className="smb-btn smb-btn--pri smb-btn--full">
                    <Youtube className="h-4 w-4 mr-2" />
                    Connect Google
                  </Button>
                )}
              </section>

              <section className="smb-card smb-span-2">
                <div className="smb-card-head">
                  <h2 className="smb-card-title">Theme</h2>
                  <span className="smb-mono smb-t3">Same palettes as the app</span>
                </div>
                <ThemePicker />
              </section>

              <FeedbackCard />
              <SupportCard subscription={subscriptionStatus} onFounding={() => handleUpgrade("founding", false)} />
              <AccountLinksCard onNavigate={(path) => navigate(path)} onLogout={handleLogout} />
            </div>
          </TabsContent>

          {/* YouTube Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 dashboard-section">
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
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
                      Channel analytics is a paid feature. Upgrade to Plus or Pro to unlock channel analysis.
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

                  {analyticsData && <ChannelReport data={analyticsData} />}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AppShell>

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={handleUpgrade}
        loading={upgradingSubscription}
        subscription={subscriptionStatus}
      />
    </div>
  );
};

export default Dashboard;
