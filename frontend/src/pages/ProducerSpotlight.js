import React, { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Star, TrendingUp, Music, User, Globe, Youtube, Instagram, Twitter } from "lucide-react";
import { toast } from "sonner";

export default function ProducerSpotlight() {
  const [spotlightData, setSpotlightData] = useState(null);
  const [myProfile, setMyProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({
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
    } catch (error) {
      console.error("Failed to fetch spotlight", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const response = await axios.get(`${API}/producers/me`);
      setMyProfile(response.data);
      setEditForm({
        bio: response.data.bio || "",
        top_beat_url: response.data.top_beat_url || "",
        tags: response.data.tags ? response.data.tags.join(", ") : "",
        youtube: response.data.social_links?.youtube || "",
        instagram: response.data.social_links?.instagram || "",
        twitter: response.data.social_links?.twitter || ""
      });
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const updateData = {
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
      toast.error("Failed to update profile");
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
             {/* Placeholder Avatar */}
             <User className="h-10 w-10 text-slate-400" />
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
            <h3 className="font-bold text-lg">{producer.username}</h3>
            <p className="text-xs text-muted-foreground">{producer.tags.slice(0, 3).join(" • ")}</p>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
            {producer.bio || "No bio yet."}
          </p>

          {producer.top_beat_url && (
            <Button variant="outline" className="w-full mt-2 gap-2 group hover:border-primary">
              <Music className="h-4 w-4 text-primary group-hover:animate-bounce" />
              Listen to Top Beat
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">

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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Your Producer Profile</DialogTitle>
              <DialogDescription>
                Customize how you appear in the spotlight.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
              <Button onClick={handleUpdateProfile} className="mt-4 w-full">
                Save Profile
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
