import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { API } from "@/App";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Trophy, Star, TrendingUp, Music, User, Globe, Youtube, Crown, BadgeCheck, Shield, Flame, Eye, BarChart3 } from "lucide-react";
import { getAuthToken } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import ProsGallery from "@/components/pros/ProsGallery";
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
  Bronze: "spotlight-tier-tag spotlight-tier-tag--bronze",
  Silver: "spotlight-tier-tag spotlight-tier-tag--silver",
  Gold: "spotlight-tier-tag spotlight-tier-tag--gold",
  Platinum: "spotlight-tier-tag spotlight-tier-tag--platinum",
  Diamond: "spotlight-tier-tag spotlight-tier-tag--diamond",
};

export default function ProducerSpotlight() {
  const navigate = useNavigate();
  const isAuthenticated = Boolean(getAuthToken());
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
  const [activeView, setActiveView] = useState(() => (new URLSearchParams(window.location.search).get("view") === "pros" ? "pros" : "trending"));
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
    youtube: ""
  });

  useEffect(() => {
    fetchSpotlight();
    if (isAuthenticated) {
      fetchMyProfile();
      checkYouTubeConnection();
    }
  }, [isAuthenticated]);

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
        youtube: response.data.social_links?.youtube || ""
      });
    } catch (error) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setMyProfile(null);
        setYouTubeConnected(false);
        return;
      }
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
      if (error?.response?.status !== 401 && error?.response?.status !== 403) {
        console.error("Failed to check YouTube connection", error);
      }
      setYouTubeConnected(false);
    }
  };

  const connectYouTube = async () => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
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
    if (!isAuthenticated) {
      toast.error("Sign in to edit your producer profile.");
      navigate("/");
      return;
    }
    setSavingProfile(true);
    try {
      const updateData = {
        avatar_url: editForm.avatar_url,
        banner_url: editForm.banner_url,
        bio: editForm.bio,
        top_beat_url: editForm.top_beat_url,
        tags: editForm.tags.split(",").map(t => t.trim()).filter(Boolean),
        social_links: {
          youtube: editForm.youtube
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
    if (!isAuthenticated) {
      toast.error("Sign in to edit your producer profile.");
      navigate("/");
      return;
    }
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
    if (!isAuthenticated) {
      toast.error("Sign in to edit your producer profile.");
      navigate("/");
      return;
    }
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
    if (!isAuthenticated) {
      toast.error("Sign in to apply for verification.");
      navigate("/");
      return;
    }
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
    if (roleTag === "Creator") return "spotlight-role-tag spotlight-role-tag--creator";
    if (roleTag === "Verified") return "spotlight-role-tag spotlight-role-tag--verified";
    if (roleTag === "Pro") return "spotlight-role-tag spotlight-role-tag--pro";
    return "spotlight-role-tag spotlight-role-tag--newbie";
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

  // One producer: who they are, what they make, and the numbers that rank them.
  const ProducerCard = ({ producer, badge }) => (
    <article
      className={`sp-card ${producer.featured ? "sp-card--featured" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => openProducerStats(producer)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProducerStats(producer);
        }
      }}
    >
      <div className="sp-card-top">
        <img src={producer.avatar_url || DEFAULT_AVATAR_URL} alt="" className="sp-card-avatar" loading="lazy" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="sp-card-name truncate">{producer.username}</h3>
            {producer.verification_status === "approved" ? <BadgeCheck className="h-4 w-4 flex-shrink-0" aria-label="Verified" /> : null}
            {producer.social_links?.youtube && (
              <a
                href={producer.social_links.youtube}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="spotlight-yt-link inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full"
                aria-label={`${producer.username} on YouTube`}
              >
                <Youtube className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <p className="sp-card-meta">
            {badge === "featured" ? "Featured · " : badge === "trending" ? "Trending · " : badge === "new" ? "New · " : ""}
            {producer.spotlight_tier || "Bronze"} tier · {getRoleTagLabel(producer.role_tag)}
          </p>
        </div>
        <span className="sp-card-score" title="Spotlight score">{producer.spotlight_score || 0}</span>
      </div>

      <p className="sp-card-bio">{producer.bio || "No bio yet."}</p>

      {producer.tags?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {producer.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="smb-pill">{tag}</span>
          ))}
        </div>
      ) : null}

      <div className="sp-card-foot">
        <span><b>{producer.current_streak || 0}</b> day streak</span>
        <span><b>{producer.total_days_completed || 0}</b> days</span>
        <span><b>{producer.likes || 0}</b> likes</span>
        {producer.top_beat_url ? (
          <button
            type="button"
            className="sp-card-beat"
            onClick={(e) => {
              e.stopPropagation();
              const raw = (producer.top_beat_url || "").trim();
              if (!raw) return;
              const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
              window.open(url, "_blank", "noopener,noreferrer");
            }}
          >
            <Music className="h-3.5 w-3.5" /> Top beat
          </button>
        ) : null}
      </div>
    </article>
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
        <div className="h-10 w-10 rounded-full overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center">
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

  const handleShellSelect = (id) => {
    if (id === "spotlight") return;
    navigate(`/dashboard?tab=${id}`);
  };

  const pageBody = (
      <div className="space-y-8 text-[var(--text-primary)]">
      {/* Hero Section */}
      <div className="dashboard-card spotlight-hero sp-hero">
        <span className="spotlight-hero-glow" aria-hidden="true" />
        <div className="sp-hero-copy">
          <p className="smb-eyebrow">SendMyBeat network</p>
          <h1 className="spotlight-hero-title">Producer Spotlight</h1>
          <p className="smb-t2">
            {!isAuthenticated
              ? "Find producers, follow their streaks and open their stats. Sign in to add your own profile."
              : youtubeConnected
                ? "Find producers, follow their streaks and open their stats."
                : "Find producers, follow their streaks and open their stats. Connect Google to show fuller stats on your card."}
          </p>
        </div>
        <div className="sp-hero-stats">
          {[
            ["Producers", allProducers.length],
            ["Trending", spotlightData?.trending_producers?.length || 0],
            ["New this week", spotlightData?.new_producers?.length || 0],
            ["Featured", spotlightData?.featured_producers?.length || 0],
          ].map(([label, value]) => (
            <div key={label}>
              <b>{value}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button className="smb-btn smb-btn--pri sp-hero-cta">
              {!isAuthenticated
                ? "Sign In to Join"
                : youtubeConnected
                  ? (myProfile?.bio ? "Edit My Profile" : "Join the Spotlight")
                  : "Connect Google to Join"}
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
              {!isAuthenticated && (
                <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                  <p className="font-semibold">Sign in first</p>
                  <p className="mt-1">
                    Public visitors can browse Producer Spotlight, but only signed-in users can create or edit a profile.
                  </p>
                  <Button type="button" className="mt-3 btn-modern" onClick={() => navigate("/")}>
                    Go to Sign In
                  </Button>
                </div>
              )}
              {isAuthenticated && !youtubeConnected && (
                <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                  <p className="font-semibold">Connect Google / YouTube first</p>
                  <p className="mt-1">
                    Your profile can exist without Google, but connecting YouTube improves identity and stats coverage.
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
                          ? "border-[var(--c-acc)] ring-2 ring-[var(--c-accsoft)]"
                          : "border-[var(--border-color)] hover:border-[var(--c-t3)]"
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
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    <Input
                      placeholder="YouTube URL"
                      value={editForm.youtube}
                      onChange={e => setEditForm({...editForm, youtube: e.target.value})}
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
          <p className="text-sm smb-danger max-w-3xl mx-auto">
            Spotlight API returned 404. Backend is running an older version. Deploy/restart backend with latest `server.py` routes.
          </p>
        )}
        {isAuthenticated && !youtubeConnected && (
          <div className="smb-notice mx-auto max-w-3xl text-left">
            <Youtube className="smb-ico" aria-hidden="true" />
            <p>Connect Google to verify your channel and show fuller stats on your Spotlight card.</p>
            <Button onClick={connectYouTube} disabled={connectingYouTube} className="smb-btn smb-btn--sec smb-btn--sm">
              {connectingYouTube ? "Connecting..." : "Connect"}
            </Button>
          </div>
        )}
      </div>

      <section className="space-y-4">
        <div className="pro-seg" role="tablist" aria-label="Spotlight views">
          {[
            ["trending", "Trending"],
            ["new", "New"],
            ["streaks", "Streaks"],
            ["network", "Network"],
            ["pros", "Pros"],
          ].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={activeView === id} className={activeView === id ? "is-active" : ""} onClick={() => setActiveView(id)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Featured Producers */}
      {spotlightData?.featured_producers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="h-5 w-5" />
            <h2 className="text-2xl font-bold">Featured Producers</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {spotlightData.featured_producers.map(p => (
              <ProducerCard key={p.user_id} producer={p} badge="featured" />
            ))}
          </div>
        </section>
      )}

      {activeView === "pros" && (
        isAuthenticated ? (
          <ProsGallery />
        ) : (
          <section className="smb-card">
            <h2 className="smb-card-title">Sign in to see the Pros</h2>
            <p className="smb-t2">See why the biggest type-beat producers blew up, read their numbers and copy their moves.</p>
            <Button onClick={() => navigate("/")} className="smb-btn smb-btn--pri">Log in</Button>
          </section>
        )
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
              <Globe className="h-5 w-5" />
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
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[calc(100dvh-1rem)] overflow-hidden bg-[var(--card-bg)] border border-[var(--border-color)] p-0">
          <div className="flex max-h-[calc(100dvh-1rem)] flex-col">
            <DialogHeader className="sticky top-0 z-10 border-b border-[var(--border-color)] bg-[var(--card-bg)] px-4 py-4 pr-16 sm:px-6">
              <DialogTitle>{selectedProducer?.username || "Producer"} Stats</DialogTitle>
              <DialogDescription>
                Spotlight profile, activity metrics, streak, and top beat.
              </DialogDescription>
            </DialogHeader>

            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-4 top-4 z-20"
              >
                Close
              </Button>
            </DialogClose>

            <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
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
                    className="text-sm underline underline-offset-2 break-all"
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
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
  );

  if (isAuthenticated) {
    return (
      <div className="min-h-screen dashboard-parallax-bg">
        <AppShell
          active="spotlight"
          onSelect={handleShellSelect}
          title="Spotlight"
          crumb="Producers on SendMyBeat"
          username={myProfile?.username}
          onAdmin={(path) => navigate(path)}
        >
          {pageBody}
        </AppShell>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-parallax-bg">
      <header className="spotlight-public-nav">
        <a href="/" className="smb-wordmark">SENDMYBEAT</a>
        <Button onClick={() => navigate("/")} className="smb-btn smb-btn--pri smb-btn--sm">
          Log in
        </Button>
      </header>
      <main className="spotlight-public-main">{pageBody}</main>
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



