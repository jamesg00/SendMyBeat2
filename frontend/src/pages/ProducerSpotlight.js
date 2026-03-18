import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API } from "@/App";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Star, TrendingUp, Music, User, Globe, Youtube, Instagram, Twitter, ArrowLeft, Crown, BadgeCheck, Shield, Flame, Eye, BarChart3 } from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";
import { toast } from "sonner";

const createGlossyAvatarDataUrl = ({ rim, shell, glow, inner, highlight }) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
      <defs>
        <radialGradient id="bgGlow" cx="50%" cy="46%" r="54%">
          <stop offset="0%" stop-color="${glow}" stop-opacity="0.95" />
          <stop offset="72%" stop-color="${glow}" stop-opacity="0.12" />
          <stop offset="100%" stop-color="${glow}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="headFill" x1="50%" y1="14%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="${highlight}" />
          <stop offset="58%" stop-color="${shell}" />
          <stop offset="100%" stop-color="${inner}" />
        </linearGradient>
        <linearGradient id="bodyFill" x1="50%" y1="10%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="${highlight}" />
          <stop offset="48%" stop-color="${shell}" />
          <stop offset="100%" stop-color="${inner}" />
        </linearGradient>
        <linearGradient id="gloss" x1="18%" y1="16%" x2="78%" y2="78%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.88" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="240" height="240" fill="url(#bgGlow)" />
      <g filter="drop-shadow(0 0 16px ${glow})">
        <circle cx="120" cy="60" r="34" fill="url(#headFill)" stroke="${rim}" stroke-width="4" />
        <path d="M61 190c0-42 26-72 59-72s59 30 59 72c0 8-6 14-14 16-17 5-33 8-45 8s-28-3-45-8c-8-2-14-8-14-16Z" fill="url(#bodyFill)" stroke="${rim}" stroke-width="4" stroke-linejoin="round" />
        <ellipse cx="120" cy="118" rx="42" ry="12" fill="${rim}" opacity="0.16" />
        <ellipse cx="120" cy="42" rx="20" ry="10" fill="url(#gloss)" opacity="0.7" />
        <ellipse cx="88" cy="150" rx="18" ry="56" fill="url(#gloss)" opacity="0.3" transform="rotate(8 88 150)" />
        <ellipse cx="152" cy="150" rx="18" ry="56" fill="url(#gloss)" opacity="0.3" transform="rotate(-8 152 150)" />
      </g>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const AVATAR_CHOICES = [
  { id: "1", label: "Blue", url: createGlossyAvatarDataUrl({ rim: "#0b42d9", shell: "#4fa7ff", glow: "#2d7dff", inner: "#7cecff", highlight: "#c5ebff" }) },
  { id: "2", label: "Red", url: createGlossyAvatarDataUrl({ rim: "#8f0011", shell: "#ff2641", glow: "#ff3048", inner: "#ff8b93", highlight: "#ffe0e4" }) },
  { id: "3", label: "Green", url: createGlossyAvatarDataUrl({ rim: "#0d6c08", shell: "#65dd2f", glow: "#63f53d", inner: "#b5ff98", highlight: "#ebffd9" }) },
  { id: "4", label: "Orange", url: createGlossyAvatarDataUrl({ rim: "#a64f00", shell: "#ffab1f", glow: "#ff8d18", inner: "#ffd36c", highlight: "#fff0bf" }) },
  { id: "5", label: "Gold", url: createGlossyAvatarDataUrl({ rim: "#b57b00", shell: "#ffd432", glow: "#ffbd20", inner: "#ffe98b", highlight: "#fff8d2" }) },
  { id: "6", label: "Purple", url: createGlossyAvatarDataUrl({ rim: "#6e1fcf", shell: "#b659ff", glow: "#a246ff", inner: "#deb0ff", highlight: "#f4e4ff" }) },
];
const DEFAULT_AVATAR_URL = AVATAR_CHOICES[0].url;

const TIER_CLASS_MAP = {
  Bronze: "spotlight-tier-tag spotlight-tier-tag--bronze bg-amber-500/15 text-amber-200 border-amber-300/40",
  Silver: "spotlight-tier-tag spotlight-tier-tag--silver bg-slate-300/15 text-slate-100 border-slate-200/45",
  Gold: "spotlight-tier-tag spotlight-tier-tag--gold bg-yellow-400/15 text-yellow-100 border-yellow-300/45",
  Platinum: "spotlight-tier-tag spotlight-tier-tag--platinum bg-cyan-400/15 text-cyan-100 border-cyan-300/45",
  Diamond: "spotlight-tier-tag spotlight-tier-tag--diamond bg-fuchsia-400/15 text-fuchsia-100 border-fuchsia-300/45",
};

export default function ProducerSpotlight() {
  const navigate = useNavigate();
  const [spotlightData, setSpotlightData] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [spotlightApiMissing, setSpotlightApiMissing] = useState(false);
  const [profileApiMissing, setProfileApiMissing] = useState(false);
  const [applyingVerification, setApplyingVerification] = useState(false);
  const [youtubeConnected, setYouTubeConnected] = useState(false);
  const [connectingYouTube, setConnectingYouTube] = useState(false);
  const [selectedProducer, setSelectedProducer] = useState(null);
  const [producerStats, setProducerStats] = useState(null);
  const [producerStatsCache, setProducerStatsCache] = useState({});
  const [loadingProducerStats, setLoadingProducerStats] = useState(false);
  const [producerStatsOpen, setProducerStatsOpen] = useState(false);
  const [activeView, setActiveView] = useState("trending");
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [verificationForm, setVerificationForm] = useState({
    stage_name: "",
    main_platform_url: "",
    notable_work: "",
    reason: ""
  });
  const [editForm, setEditForm] = useState({
    avatar_url: DEFAULT_AVATAR_URL,
    banner_url: "",
    bio: "",
    top_beat_url: "",
    tags: "",
    youtube: "",
    instagram: "",
    twitter: ""
  });

  useEffect(() => {
    fetchSpotlight();
    fetchMyProfile();
    checkYouTubeConnection();
  }, []);

  const fetchSpotlight = async () => {
    try {
      const response = await axios.get(`${API}/producers/spotlight`);
      setSpotlightData(response.data);
      setSpotlightApiMissing(false);
    } catch (error) {
      console.error("Failed to fetch spotlight", error);
      if (error?.response?.status === 404) {
        setSpotlightApiMissing(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const response = await axios.get(`${API}/producers/me`);
      setMyProfile(response.data);
      setYouTubeConnected(Boolean(response.data?.google_connected));
      setProfileApiMissing(false);
      setEditForm({
        avatar_url: response.data.avatar_url || DEFAULT_AVATAR_URL,
        banner_url: response.data.banner_url || "",
        bio: response.data.bio || "",
        top_beat_url: response.data.top_beat_url || "",
        tags: response.data.tags ? response.data.tags.join(", ") : "",
        youtube: response.data.social_links?.youtube || "",
        instagram: response.data.social_links?.instagram || "",
        twitter: response.data.social_links?.twitter || ""
      });
    } catch (error) {
      console.error("Failed to fetch profile", error);
      if (error?.response?.status === 404) {
        setProfileApiMissing(true);
      }
    }
  };

  const checkYouTubeConnection = async () => {
    try {
      const response = await axios.get(`${API}/youtube/status`);
      setYouTubeConnected(Boolean(response.data?.connected));
    } catch (error) {
      console.error("Failed to check YouTube connection", error);
      setYouTubeConnected(false);
    }
  };

  const connectYouTube = async () => {
    setConnectingYouTube(true);
    try {
      const response = await axios.get(`${API}/youtube/auth-url`);
      if (response.data?.auth_url) {
        window.location.href = response.data.auth_url;
        return;
      }
      toast.error("Failed to connect Google account");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to connect Google account");
    } finally {
      setConnectingYouTube(false);
    }
  };

  const handleUpdateProfile = async () => {
    setSavingProfile(true);
    try {
      const updateData = {
        avatar_url: editForm.avatar_url,
        banner_url: editForm.banner_url,
        bio: editForm.bio,
        top_beat_url: editForm.top_beat_url,
        tags: editForm.tags.split(",").map(t => t.trim()).filter(Boolean),
        social_links: {
          youtube: editForm.youtube,
          instagram: editForm.instagram,
          twitter: editForm.twitter
        }
      };

      await axios.put(`${API}/producers/me`, updateData);
      toast.success(youtubeConnected ? "Profile updated! You are now discoverable." : "Profile updated. Connect Google next to unlock the full spotlight setup.");
      setIsEditing(false);
      fetchMyProfile();
      fetchSpotlight(); // Refresh list to see if we appear (if algorithm picks us)
    } catch (error) {
      if (error?.response?.status === 404) {
        toast.error("Spotlight backend routes are not deployed yet (404).");
      } else {
        toast.error("Failed to update profile");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Use JPG, PNG, or WEBP for banner.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Banner must be under 4MB.");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(`${API}/producers/banner`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setEditForm((prev) => ({ ...prev, banner_url: response.data.banner_url }));
      toast.success("Banner uploaded.");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to upload banner.");
    } finally {
      e.target.value = "";
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Use JPG, PNG, or WEBP for avatar.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar must be under 2MB.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(`${API}/producers/avatar`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setEditForm((prev) => ({ ...prev, avatar_url: response.data.avatar_url }));
      toast.success("Avatar uploaded.");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleVerificationApply = async () => {
    const reason = (verificationForm.reason || "").trim();
    if (reason.length < 20) {
      toast.error("Please add a stronger reason (at least 20 characters).");
      return;
    }

    setApplyingVerification(true);
    try {
      await axios.post(`${API}/producers/verification/apply`, {
        stage_name: verificationForm.stage_name,
        main_platform_url: verificationForm.main_platform_url,
        notable_work: verificationForm.notable_work,
        reason
      });
      toast.success("Verification application submitted.");
      await fetchMyProfile();
      await fetchSpotlight();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to submit verification.");
    } finally {
      setApplyingVerification(false);
    }
  };

  const getRoleTagClass = (roleTag) => {
    if (roleTag === "Creator") return "spotlight-role-tag spotlight-role-tag--creator bg-yellow-400/20 text-yellow-100 border-yellow-300";
    if (roleTag === "Verified") return "spotlight-role-tag spotlight-role-tag--verified bg-sky-500/20 text-sky-200 border-sky-400";
    if (roleTag === "Pro") return "spotlight-role-tag spotlight-role-tag--pro bg-violet-500/20 text-violet-300 border-violet-400";
    return "spotlight-role-tag spotlight-role-tag--newbie bg-zinc-500/20 text-zinc-300 border-zinc-500";
  };

  const getRoleTagIcon = (roleTag) => {
    if (roleTag === "Creator") return <Crown className="h-3 w-3" />;
    if (roleTag === "Verified") return <BadgeCheck className="h-3 w-3" />;
    if (roleTag === "Pro") return <Shield className="h-3 w-3" />;
    return <User className="h-3 w-3" />;
  };

  const getRoleTagLabel = (roleTag) => {
    if (roleTag === "Verified") return "Blue Magic";
    return roleTag || "Newbie";
  };

  const getTierClass = (tier) => TIER_CLASS_MAP[tier] || TIER_CLASS_MAP.Bronze;

  const openProducerStats = async (producer) => {
    if (!producer?.user_id) return;
    setSelectedProducer(producer);
    setProducerStatsOpen(true);
    const cachedStats = producerStatsCache[producer.user_id];
    if (cachedStats) {
      setProducerStats(cachedStats);
      setLoadingProducerStats(false);
      return;
    }
    setLoadingProducerStats(true);
    setProducerStats(null);
    try {
      const response = await axios.get(`${API}/producers/${producer.user_id}/stats`);
      setProducerStats(response.data);
      setProducerStatsCache((prev) => ({ ...prev, [producer.user_id]: response.data }));
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to load producer stats.");
    } finally {
      setLoadingProducerStats(false);
    }
  };

  const allProducers = useMemo(() => spotlightData?.all_producers || [], [spotlightData]);
  const streakLeaders = useMemo(
    () => [...allProducers]
      .sort((a, b) => (b.total_days_completed || 0) - (a.total_days_completed || 0) || (b.current_streak || 0) - (a.current_streak || 0))
      .slice(0, 18),
    [allProducers]
  );
  const visibleNetwork = useMemo(() => allProducers.slice(0, 16), [allProducers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const ProducerCard = ({ producer, badge }) => (
    <Card
      className={`producer-card h-full cursor-pointer transition-all duration-200 hover:-translate-y-1 ${producer.featured ? "border-yellow-400/60 shadow-[0_0_24px_rgba(250,204,21,0.18)]" : ""}`}
      onClick={() => openProducerStats(producer)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="h-16 w-16 rounded-2xl border flex items-center justify-center overflow-hidden shadow-lg" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)" }}>
              <img
                src={producer.avatar_url || DEFAULT_AVATAR_URL}
                alt={`${producer.username} avatar`}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            {badge && (
              <div className="absolute -bottom-2 left-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] shadow-lg" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
                {badge === "featured" && <Star className="h-3 w-3 fill-current" />}
                {badge === "trending" && <TrendingUp className="h-3 w-3" />}
                {badge === "new" && <Sparkles className="h-3 w-3" />}
                {badge}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-bold">{producer.username}</h3>
                  {producer.social_links?.youtube && (
                    <a href={producer.social_links.youtube} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-600/90 text-white transition-transform hover:scale-105">
                      <Youtube className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {producer.social_links?.instagram && (
                    <a href={producer.social_links.instagram} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-pink-600/90 text-white transition-transform hover:scale-105">
                      <Instagram className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {producer.social_links?.twitter && (
                    <a href={producer.social_links.twitter} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/90 text-white transition-transform hover:scale-105">
                      <Twitter className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getRoleTagClass(producer.role_tag)}`}
                  >
                    {getRoleTagIcon(producer.role_tag)}
                    {getRoleTagLabel(producer.role_tag)}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getTierClass(producer.spotlight_tier)}`}>
                    {producer.spotlight_tier || "Bronze"} Tier
                  </span>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    {producer.tags.slice(0, 2).join(" / ") || "Open for collabs"}
                  </p>
                </div>
              </div>

              <span className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
                View card
              </span>
            </div>

            <p className="line-clamp-2 text-sm text-muted-foreground">
              {producer.bio || "No bio yet."}
            </p>

            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="rounded-full border px-2 py-1" style={{ borderColor: "var(--border-color)" }}>
                {producer.total_days_completed || 0} days
              </span>
              <span className="rounded-full border px-2 py-1" style={{ borderColor: "var(--border-color)" }}>
                {producer.current_streak || 0} streak
              </span>
              <span className="rounded-full border px-2 py-1" style={{ borderColor: "var(--border-color)" }}>
                {producer.views || 0} views
              </span>
              <span className="rounded-full border px-2 py-1" style={{ borderColor: "var(--border-color)" }}>
                {producer.likes || 0} likes
              </span>
              <span className="rounded-full border px-2 py-1" style={{ borderColor: "var(--border-color)" }}>
                {producer.spotlight_score || 0} score
              </span>
            </div>

            {producer.top_beat_url && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 hover:border-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  const raw = (producer.top_beat_url || "").trim();
                  if (!raw) return;
                  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              >
                <Music className="h-4 w-4 text-primary" />
                Top beat
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const MiniProducerCard = ({ producer }) => (
    <button
      type="button"
      className="text-left rounded-lg border p-3 bg-[var(--bg-secondary)] transition-colors hover:border-[var(--accent-primary)]"
      onClick={() => {
        setShowAllOpen(false);
        openProducerStats(producer);
      }}
    >
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
          <img src={producer.avatar_url || DEFAULT_AVATAR_URL} alt={producer.username} className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold truncate">{producer.username}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {producer.total_days_completed || 0} days • {producer.current_streak || 0} streak
          </p>
        </div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen dashboard-parallax-bg">
      <div className="dashboard-grid-layer" aria-hidden="true" />
      <div className="relative z-10 container mx-auto px-4 py-8 space-y-8 dashboard-shell text-[var(--text-primary)]">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <DarkModeToggle inline />
        </div>

      {/* Hero Section */}
      <div className="dashboard-card rounded-3xl px-6 py-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em]" style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)", backgroundColor: "var(--bg-secondary)" }}>
          SendMyBeat Network
        </div>
        <h1 className="text-4xl md:text-5xl font-bold gradient-text">Producer Spotlight</h1>
        <p className="text-base md:text-lg max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Discover producers, track momentum, and open profile stats without leaving the main dashboard visual system.
        </p>
        {!youtubeConnected && (
          <div className="mx-auto max-w-2xl rounded-2xl border px-4 py-3 text-sm font-medium" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
            Producer Spotlight now requires a connected Google / YouTube account. Existing profiles stay hidden until the account is connected.
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {["artist network", "open sessions", "daily streaks", "top beat lanes"].map((label) => (
            <span
              key={label}
              className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em]"
              style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-secondary)" }}
            >
              {label}
            </span>
          ))}
        </div>

        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button size="lg" className="btn-modern mt-4">
              {youtubeConnected ? (myProfile?.bio ? "Edit My Profile" : "Join the Spotlight") : "Connect Google to Join"}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[85vh] overflow-y-auto bg-[var(--card-bg)] border border-[var(--border-color)] p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Your Producer Profile</DialogTitle>
              <DialogDescription>
                Customize how you appear in the spotlight.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {!youtubeConnected && (
                <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                  <p className="font-semibold">Connect Google / YouTube first</p>
                  <p className="mt-1">
                    Producer Spotlight only works for connected accounts. This also applies to people who already joined before this requirement.
                  </p>
                  <Button type="button" className="mt-3 btn-modern" onClick={connectYouTube} disabled={connectingYouTube}>
                    {connectingYouTube ? "Connecting..." : "Connect Google Account"}
                  </Button>
                </div>
              )}
              <div className="grid gap-2">
                <label>Profile Picture</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    className="max-w-sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    {uploadingAvatar ? "Uploading..." : "Upload your own (max 2MB)"}
                  </span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {AVATAR_CHOICES.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      title={avatar.label}
                      onClick={() => setEditForm({ ...editForm, avatar_url: avatar.url })}
                      className={`rounded-xl border p-2 transition-all ${
                        editForm.avatar_url === avatar.url
                          ? "border-emerald-500 ring-2 ring-emerald-500/30"
                          : "border-[var(--border-color)] hover:border-emerald-400"
                      } min-w-0 min-h-[96px] text-center flex flex-col items-center justify-center gap-1`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <p className="text-[11px] leading-tight whitespace-nowrap">{avatar.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <label>Profile Banner</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleBannerUpload}
                    className="max-w-sm"
                  />
                  <span className="text-xs text-muted-foreground">Upload banner (max 4MB)</span>
                </div>
                {editForm.banner_url && (
                  <img
                    src={editForm.banner_url}
                    alt="Banner preview"
                    className="w-full h-24 rounded-lg object-cover border border-[var(--border-color)]"
                  />
                )}
              </div>
              <div className="grid gap-2">
                <label>Bio (Short & Sweet)</label>
                <Textarea
                  placeholder="Tell the world who you are..."
                  value={editForm.bio}
                  onChange={e => setEditForm({...editForm, bio: e.target.value})}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label>Top Beat URL</label>
                  <Input
                    placeholder="https://youtube.com/..."
                    value={editForm.top_beat_url}
                    onChange={e => setEditForm({...editForm, top_beat_url: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label>Tags (comma separated)</label>
                  <Input
                    placeholder="trap, dark, drake"
                    value={editForm.tags}
                    onChange={e => setEditForm({...editForm, tags: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="font-semibold">Social Links</label>
                <div className="grid md:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    <Input
                      placeholder="YouTube URL"
                      value={editForm.youtube}
                      onChange={e => setEditForm({...editForm, youtube: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <Input
                      placeholder="Instagram URL"
                      value={editForm.instagram}
                      onChange={e => setEditForm({...editForm, instagram: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Twitter className="h-4 w-4 text-blue-400" />
                    <Input
                      placeholder="Twitter URL"
                      value={editForm.twitter}
                      onChange={e => setEditForm({...editForm, twitter: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-2 border rounded-xl p-3 border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <div className="flex items-center justify-between">
                  <label className="font-semibold">Verification</label>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getRoleTagClass(myProfile?.role_tag || "Newbie")}`}
                  >
                    {getRoleTagIcon(myProfile?.role_tag)}
                    {getRoleTagLabel(myProfile?.role_tag)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Verification is manual and reserved for notable producers. Pro status does not auto-grant verification.
                </p>
                <p className="text-xs">
                  Status: <span className="font-semibold">{(myProfile?.verification_status || "none").toUpperCase()}</span>
                </p>
                {myProfile?.verification_status !== "approved" && myProfile?.verification_status !== "pending" && (
                  <>
                    <div className="grid md:grid-cols-2 gap-2">
                      <Input
                        placeholder="Stage name"
                        value={verificationForm.stage_name}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, stage_name: e.target.value }))}
                      />
                      <Input
                        placeholder="Main platform URL"
                        value={verificationForm.main_platform_url}
                        onChange={(e) => setVerificationForm((prev) => ({ ...prev, main_platform_url: e.target.value }))}
                      />
                    </div>
                    <Input
                      placeholder="Notable work / placements (optional)"
                      value={verificationForm.notable_work}
                      onChange={(e) => setVerificationForm((prev) => ({ ...prev, notable_work: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Why should you be verified? (minimum 20 chars)"
                      value={verificationForm.reason}
                      onChange={(e) => setVerificationForm((prev) => ({ ...prev, reason: e.target.value }))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerificationApply}
                      disabled={applyingVerification}
                    >
                      {applyingVerification ? "Submitting..." : "Apply for Verification"}
                    </Button>
                  </>
                )}
              </div>
              <div className="sticky bottom-0 pt-3 pb-1 bg-[var(--card-bg)]">
                <Button onClick={handleUpdateProfile} className="w-full" disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {(spotlightApiMissing || profileApiMissing) && (
          <p className="text-sm text-red-500 max-w-3xl mx-auto">
            Spotlight API returned 404. Backend is running an older version. Deploy/restart backend with latest `server.py` routes.
          </p>
        )}
        {!youtubeConnected && (
          <div className="mx-auto max-w-5xl rounded-3xl border border-yellow-400/40 bg-gradient-to-r from-yellow-500/12 via-orange-500/12 to-transparent px-5 py-4 shadow-[0_0_35px_rgba(250,204,21,0.12)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-yellow-100">Connect your Google account to strengthen your Spotlight profile.</p>
                <p className="text-sm text-yellow-50/80">
                  You can still appear in Producer Spotlight now, but connecting Google helps verify your channel identity and unlock fuller spotlight data.
                </p>
              </div>
              <Button
                onClick={connectYouTube}
                disabled={connectingYouTube}
                className="animate-pulse bg-gradient-to-r from-yellow-500 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-400"
              >
                {connectingYouTube ? "Connecting..." : "Connect Google"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="dashboard-card">
            <CardHeader className="pb-2">
              <CardDescription>Network Size</CardDescription>
              <CardTitle className="text-2xl">{allProducers.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="dashboard-card">
            <CardHeader className="pb-2">
              <CardDescription>Trending Now</CardDescription>
              <CardTitle className="text-2xl">{spotlightData?.trending_producers?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="dashboard-card">
            <CardHeader className="pb-2">
              <CardDescription>New This Week</CardDescription>
              <CardTitle className="text-2xl">{spotlightData?.new_producers?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="dashboard-card">
            <CardHeader className="pb-2">
              <CardDescription>Featured</CardDescription>
              <CardTitle className="text-2xl">{spotlightData?.featured_producers?.length || 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="border-[var(--border-color)]" variant={activeView === "trending" ? "default" : "outline"} onClick={() => setActiveView("trending")}>
            Trending
          </Button>
          <Button className="border-[var(--border-color)]" variant={activeView === "new" ? "default" : "outline"} onClick={() => setActiveView("new")}>
            New Users
          </Button>
          <Button className="border-[var(--border-color)]" variant={activeView === "streaks" ? "default" : "outline"} onClick={() => setActiveView("streaks")}>
            Streak Leaders
          </Button>
          <Button className="border-[var(--border-color)]" variant={activeView === "network" ? "default" : "outline"} onClick={() => setActiveView("network")}>
            Network
          </Button>
        </div>
      </section>

      {/* Featured Producers */}
      {spotlightData?.featured_producers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="h-6 w-6 text-yellow-500" />
            <h2 className="text-2xl font-bold">Featured Producers</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {spotlightData.featured_producers.map(p => (
              <ProducerCard key={p.user_id} producer={p} badge="featured" />
            ))}
          </div>
        </section>
      )}

      {activeView === "trending" && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold">Trending Now</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {spotlightData?.trending_producers.length > 0 ? (
              spotlightData.trending_producers.map(p => (
                <ProducerCard key={p.user_id} producer={p} badge="trending" />
              ))
            ) : (
              <p className="col-span-3 text-center text-muted-foreground py-10">
                No trending producers yet. Be the first!
              </p>
            )}
          </div>
        </section>
      )}

      {activeView === "new" && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-6 w-6 text-purple-500" />
            <h2 className="text-2xl font-bold">New Users</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {(spotlightData?.new_producers || []).map(p => (
              <ProducerCard key={p.user_id} producer={p} badge="new" />
            ))}
          </div>
        </section>
      )}

      {activeView === "streaks" && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Flame className="h-6 w-6 text-orange-500" />
            <h2 className="text-2xl font-bold">Streak Leaders (Ranked by Days)</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {streakLeaders.map((p, idx) => (
              <ProducerCard key={`streak-${p.user_id}`} producer={{ ...p, featured: idx < 3 }} badge={idx < 3 ? "featured" : undefined} />
            ))}
          </div>
        </section>
      )}

      {activeView === "network" && (
        <section>
          <div className="flex items-center justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <Globe className="h-6 w-6 text-emerald-500" />
              <h2 className="text-2xl font-bold">Producer Network</h2>
            </div>
            <Button variant="outline" onClick={() => setShowAllOpen(true)}>Show All</Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {visibleNetwork.map((p) => (
              <ProducerCard key={`all-${p.user_id}`} producer={p} />
            ))}
          </div>
        </section>
      )}
      </div>

      <Dialog open={showAllOpen} onOpenChange={setShowAllOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl max-h-[85vh] overflow-y-auto bg-[var(--card-bg)] border border-[var(--border-color)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>All Producers</DialogTitle>
            <DialogDescription>Click any producer card to open full stats and top content.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allProducers.map((p) => (
              <MiniProducerCard key={`mini-${p.user_id}`} producer={p} />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={producerStatsOpen} onOpenChange={setProducerStatsOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl bg-[var(--card-bg)] border border-[var(--border-color)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{selectedProducer?.username || "Producer"} Stats</DialogTitle>
            <DialogDescription>
              Spotlight profile, activity metrics, streak, and top beat.
            </DialogDescription>
          </DialogHeader>

          {loadingProducerStats && (
            <div className="py-6 text-sm text-muted-foreground">Loading producer stats...</div>
          )}

          {!loadingProducerStats && producerStats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Flame className="h-3 w-3" /> Streak</p>
                  <p className="font-bold text-lg">{producerStats.stats?.current_streak || 0}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Trophy className="h-3 w-3" /> Best</p>
                  <p className="font-bold text-lg">{producerStats.stats?.longest_streak || 0}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3 w-3" /> Views</p>
                  <p className="font-bold text-lg">{producerStats.stats?.views || 0}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Likes</p>
                  <p className="font-bold text-lg">{producerStats.stats?.likes || 0}</p>
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-semibold">Spotlight Tier</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${getTierClass(selectedProducer?.spotlight_tier)}`}>
                    {selectedProducer?.spotlight_tier || "Bronze"} Tier
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Score: {selectedProducer?.spotlight_score || 0}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Tier rises with consistency, spotlight activity, channel traction, and verified/featured status.
                </p>
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-semibold">Top Beat / Top Song</p>
                {(producerStats.top_beats || []).length > 0 ? (
                  <div className="space-y-2">
                    {producerStats.top_beats.slice(0, 5).map((song, idx) => (
                      <div key={`song-${idx}`} className="text-sm">
                        {song?.url ? (
                          <a
                            href={/^https?:\/\//i.test(song.url) ? song.url : `https://${song.url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:underline break-all"
                          >
                            {song.title || `Top Beat ${idx + 1}`}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">{song?.title || `Top Beat ${idx + 1}`}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : producerStats.top_song ? (
                  <a
                    href={/^https?:\/\//i.test(producerStats.top_song) ? producerStats.top_song : `https://${producerStats.top_song}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-500 hover:underline break-all"
                  >
                    {producerStats.top_song}
                  </a>
                ) : (
                  <p className="text-sm text-muted-foreground">No top beats added yet.</p>
                )}
              </div>

              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-sm font-semibold">Channel / Activity</p>
                <p className="text-sm text-muted-foreground">
                  YouTube Connected: {producerStats.channel?.connected ? "Yes" : "No"}
                </p>
                {producerStats.channel?.performance && (
                  <p className="text-sm text-muted-foreground">
                    Subs: {producerStats.channel.performance.subscriber_count || 0} • Views: {producerStats.channel.performance.total_views || 0} • Videos: {producerStats.channel.performance.total_videos || 0}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Descriptions: {producerStats.stats?.descriptions_created || 0} | Tag Sets: {producerStats.stats?.tag_sets_created || 0}
                </p>
                <p className="text-sm text-muted-foreground">
                  Uploads: {producerStats.stats?.audio_uploads || 0} audio / {producerStats.stats?.image_uploads || 0} image
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Icon for the component
function Sparkles(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M9 5H5" />
      <path d="M2 7h4" />
    </svg>
  )
}



