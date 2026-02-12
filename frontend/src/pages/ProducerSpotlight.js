import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Star, TrendingUp, Music, User, Globe, Youtube, Instagram, Twitter, ArrowLeft, Crown, BadgeCheck, Shield } from "lucide-react";
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
  const [verificationForm, setVerificationForm] = useState({
    stage_name: "",
    main_platform_url: "",
    notable_work: "",
    reason: ""
  });
  const [editForm, setEditForm] = useState({
    avatar_url: AVATAR_CHOICES[0].url,
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const ProducerCard = ({ producer, badge }) => (
    <Card className={`producer-card overflow-hidden ${producer.featured ? 'border-2 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : ''}`}>
      <div className="h-24 bg-gradient-to-r from-purple-500 to-blue-600 relative">
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
              <a href={producer.social_links.youtube} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-red-600 text-white hover:scale-110 transition-transform">
                <Youtube className="h-4 w-4" />
              </a>
            )}
            {producer.social_links?.instagram && (
              <a href={producer.social_links.instagram} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-pink-600 text-white hover:scale-110 transition-transform">
                <Instagram className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">{producer.username}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getRoleTagClass(producer.role_tag)}`}>
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
              onClick={() => {
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

  return (
    <div className="spotlight-parallax-bg relative min-h-screen overflow-hidden">
      <div
        className="spotlight-grid-layer"
        aria-hidden="true"
      />
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
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${getRoleTagClass(myProfile?.role_tag || "Newbie")}`}>
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

      {/* Trending */}
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

      {/* New Arrivals */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-6 w-6 text-purple-500" />
          <h2 className="text-2xl font-bold">Fresh Talent</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spotlightData?.new_producers.map(p => (
            <ProducerCard key={p.user_id} producer={p} badge="new" />
          ))}
        </div>
      </section>
      </div>
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
