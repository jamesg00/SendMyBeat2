import React, { useState, useEffect } from "react";
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

const AVATAR_CHOICES = [
  { id: "1", label: "VHS Kid", url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=vhs-kid-2010" },
  { id: "2", label: "Neon Coder", url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=neon-coder-arcade" },
  { id: "3", label: "Skater", url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=retro-skater-808" },
  { id: "4", label: "Glitch", url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=glitchboy-oldweb" },
  { id: "5", label: "Cyber DJ", url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=cyber-dj-mixtape" },
  { id: "6", label: "Arcade Pro", url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=arcade-producer-2012" },
  { id: "7", label: "Lowpoly", url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=lowpoly-hero-green" },
  { id: "8", label: "CRT Wave", url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=crt-wave-vibes" },
  { id: "9", label: "Bit Boss", url: "https://api.dicebear.com/9.x/pixel-art/svg?seed=bit-boss-producer" }
];

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
  const [selectedProducer, setSelectedProducer] = useState(null);
  const [producerStats, setProducerStats] = useState(null);
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
    avatar_url: AVATAR_CHOICES[0].url,
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
      setProfileApiMissing(false);
      setEditForm({
        avatar_url: response.data.avatar_url || AVATAR_CHOICES[0].url,
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
      toast.success("Profile updated! You are now discoverable.");
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
    if (roleTag === "Creator") return "bg-amber-500/20 text-amber-300 border-amber-400";
    if (roleTag === "Verified") return "bg-sky-500/20 text-sky-300 border-sky-400";
    if (roleTag === "Pro") return "bg-violet-500/20 text-violet-300 border-violet-400";
    return "bg-zinc-500/20 text-zinc-300 border-zinc-500";
  };

  const getRoleTagIcon = (roleTag) => {
    if (roleTag === "Creator") return <Crown className="h-3 w-3" />;
    if (roleTag === "Verified") return <BadgeCheck className="h-3 w-3" />;
    if (roleTag === "Pro") return <Shield className="h-3 w-3" />;
    return <User className="h-3 w-3" />;
  };

  const openProducerStats = async (producer) => {
    if (!producer?.user_id) return;
    setSelectedProducer(producer);
    setProducerStatsOpen(true);
    setLoadingProducerStats(true);
    setProducerStats(null);
    try {
      const response = await axios.get(`${API}/producers/${producer.user_id}/stats`);
      setProducerStats(response.data);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to load producer stats.");
    } finally {
      setLoadingProducerStats(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const ProducerCard = ({ producer, badge }) => (
    <Card
      className={`producer-card overflow-hidden cursor-pointer transition-transform hover:-translate-y-1 ${producer.featured ? 'border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : ''}`}
      onClick={() => openProducerStats(producer)}
    >
      <div
        className="h-24 bg-gradient-to-r from-purple-500 to-blue-600 relative"
        style={producer.banner_url ? {
          backgroundImage: `linear-gradient(120deg, rgba(0,0,0,0.35), rgba(0,0,0,0.15)), url(${producer.banner_url})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        } : undefined}
      >
        {badge && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
            {badge === 'featured' && <Star className="h-3 w-3 fill-black" />}
            {badge === 'trending' && <TrendingUp className="h-3 w-3" />}
            {badge === 'new' && <Sparkles className="h-3 w-3" />}
            {badge.toUpperCase()}
          </div>
        )}
      </div>
      <CardContent className="pt-0 relative">
        <div className="flex justify-between items-end -mt-10 mb-4 px-2">
          <div className="h-20 w-20 rounded-full border-4 border-background bg-slate-200 flex items-center justify-center overflow-hidden">
             {producer.avatar_url ? (
               <img src={producer.avatar_url} alt={`${producer.username} avatar`} className="h-full w-full object-cover" />
             ) : (
               <User className="h-10 w-10 text-slate-400" />
             )}
          </div>
          <div className="flex gap-2 mb-1">
            {producer.social_links?.youtube && (
              <a href={producer.social_links.youtube} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 rounded-full bg-red-600 text-white hover:scale-110 transition-transform">
                <Youtube className="h-4 w-4" />
              </a>
            )}
            {producer.social_links?.instagram && (
              <a href={producer.social_links.instagram} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 rounded-full bg-pink-600 text-white hover:scale-110 transition-transform">
                <Instagram className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{producer.username}</h3>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getRoleTagClass(producer.role_tag)} ${
                  producer.role_tag === "Creator" ? "creator-badge-epic" : ""
                }`}
              >
                {getRoleTagIcon(producer.role_tag)}
                {producer.role_tag || "Newbie"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{producer.tags.slice(0, 3).join(" • ")}</p>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {producer.bio || "No bio yet."}
          </p>

          {producer.top_beat_url && (
            <Button
              variant="outline"
              className="w-full mt-2 gap-2 group hover:border-primary"
              onClick={(e) => {
                e.stopPropagation();
                const raw = (producer.top_beat_url || "").trim();
                if (!raw) return;
                const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <Music className="h-4 w-4 text-primary group-hover:animate-bounce" />
              Listen to Top Beat
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const MiniProducerCard = ({ producer }) => (
    <button
      type="button"
      className="text-left rounded-lg border p-3 bg-[var(--bg-secondary)] hover:border-emerald-500 transition-colors"
      onClick={() => {
        setShowAllOpen(false);
        openProducerStats(producer);
      }}
    >
      <div className="flex items-center gap-2">
        <div className="h-10 w-10 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
          {producer.avatar_url ? (
            <img src={producer.avatar_url} alt={producer.username} className="h-full w-full object-cover" />
          ) : (
            <User className="h-5 w-5 text-slate-400" />
          )}
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

  const allProducers = spotlightData?.all_producers || [];
  const streakLeaders = [...allProducers]
    .sort((a, b) => (b.total_days_completed || 0) - (a.total_days_completed || 0) || (b.current_streak || 0) - (a.current_streak || 0))
    .slice(0, 18);
  const visibleNetwork = allProducers.slice(0, 12);

  return (
    <div className="spotlight-parallax-bg relative min-h-screen overflow-hidden">
      <div
        className="spotlight-grid-layer"
        aria-hidden="true"
      />
      <div className="spotlight-fire-ambient" aria-hidden="true">
        <div className="spotlight-fire-veil veil-top" />
        <div className="spotlight-fire-veil veil-bottom" />
        <div className="spotlight-ember ember-a" />
        <div className="spotlight-ember ember-b" />
        <div className="spotlight-ember ember-c" />
        <div className="spotlight-ember ember-d" />
        <div className="spotlight-ember ember-e" />
      </div>
      <div className="spotlight-heat-haze" aria-hidden="true" />
      <div className="relative z-10 container mx-auto px-4 py-8 space-y-12 text-[var(--text-primary)]">
        <DarkModeToggle />
        <div className="flex items-center justify-start">
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold gradient-text">Producer Spotlight</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover the next wave of talent. Connect, collaborate, and get inspired by the SendMyBeat community.
        </p>

        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button size="lg" className="btn-modern mt-4">
              {myProfile?.bio ? "Edit My Profile" : "Join the Spotlight"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-[var(--card-bg)] border border-[var(--border-color)]">
            <DialogHeader>
              <DialogTitle>Your Producer Profile</DialogTitle>
              <DialogDescription>
                Customize how you appear in the spotlight.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {AVATAR_CHOICES.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, avatar_url: avatar.url })}
                      className={`rounded-xl border p-2 transition-all ${
                        editForm.avatar_url === avatar.url
                          ? "border-emerald-500 ring-2 ring-emerald-500/30"
                          : "border-[var(--border-color)] hover:border-emerald-400"
                      }`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.label}
                        className="h-12 w-12 rounded-full object-cover mx-auto"
                      />
                      <p className="text-xs mt-1">{avatar.label}</p>
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
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getRoleTagClass(myProfile?.role_tag || "Newbie")} ${
                      (myProfile?.role_tag || "Newbie") === "Creator" ? "creator-badge-epic" : ""
                    }`}
                  >
                    {getRoleTagIcon(myProfile?.role_tag)}
                    {myProfile?.role_tag || "Newbie"}
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
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant={activeView === "trending" ? "default" : "outline"} onClick={() => setActiveView("trending")}>
            Trending
          </Button>
          <Button variant={activeView === "new" ? "default" : "outline"} onClick={() => setActiveView("new")}>
            New Users
          </Button>
          <Button variant={activeView === "streaks" ? "default" : "outline"} onClick={() => setActiveView("streaks")}>
            Streak Leaders
          </Button>
          <Button variant={activeView === "network" ? "default" : "outline"} onClick={() => setActiveView("network")}>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleNetwork.map((p) => (
              <ProducerCard key={`all-${p.user_id}`} producer={p} />
            ))}
          </div>
        </section>
      )}
      </div>

      <Dialog open={showAllOpen} onOpenChange={setShowAllOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-[var(--card-bg)] border border-[var(--border-color)]">
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
        <DialogContent className="max-w-2xl bg-[var(--card-bg)] border border-[var(--border-color)]">
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
