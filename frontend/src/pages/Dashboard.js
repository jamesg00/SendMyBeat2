import { useState, useEffect } from "react";
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
import { Music, Sparkles, Save, LogOut, Copy, Trash2, Edit, Plus, Upload, Youtube, Link, CheckCircle2, AlertCircle } from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import UpgradeModal from "@/components/UpgradeModal";
import AdBanner from "@/components/AdBanner";

const Dashboard = ({ setIsAuthenticated }) => {
  const [user, setUser] = useState(null);
  const [tagQuery, setTagQuery] = useState("");
  const [generatedTags, setGeneratedTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagHistory, setTagHistory] = useState([]);
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
  
  // YouTube upload states
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeEmail, setYoutubeEmail] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedDescriptionId, setSelectedDescriptionId] = useState("");
  const [selectedTagsId, setSelectedTagsId] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("public");
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [audioFileId, setAudioFileId] = useState("");
  const [imageFileId, setImageFileId] = useState("");
  const [uploadingToYouTube, setUploadingToYouTube] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());
  
  // Subscription states
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradingSubscription, setUpgradingSubscription] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchDescriptions();
    fetchTagHistory();
    checkYouTubeConnection();
    fetchSubscriptionStatus();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      toast.error("Failed to fetch user data");
    }
  };

  const fetchDescriptions = async () => {
    try {
      const response = await axios.get(`${API}/descriptions`);
      setDescriptions(response.data);
    } catch (error) {
      toast.error("Failed to fetch descriptions");
    }
  };

  const fetchTagHistory = async () => {
    try {
      const response = await axios.get(`${API}/tags/history`);
      setTagHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch tag history", error);
    }
  };

  const checkYouTubeConnection = async () => {
    try {
      const response = await axios.get(`${API}/youtube/status`);
      setYoutubeConnected(response.data.connected);
      setYoutubeEmail(response.data.email || "");
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

  const handleGenerateTags = async (e) => {
    e.preventDefault();
    if (!tagQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }
    
    setLoadingTags(true);
    
    const progressToast = toast.loading(
      <div className="flex items-center gap-3">
        <div className="spinner"></div>
        <span>Generating 500 tags with AI... This may take 20-30 seconds</span>
      </div>,
      { duration: 60000 }
    );
    
    try {
      const response = await axios.post(`${API}/tags/generate`, { query: tagQuery });
      toast.dismiss(progressToast);
      setGeneratedTags(response.data.tags);
      toast.success(`Generated ${response.data.tags.length} tags!`);
      fetchTagHistory();
      
      // Refresh credits after a short delay to ensure backend has updated
      setTimeout(() => {
        fetchSubscriptionStatus();
      }, 500);
    } catch (error) {
      toast.dismiss(progressToast);
      
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
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        toast.success("Tags copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy tags");
      }
      document.body.removeChild(textarea);
    };
    
    // Try modern API first, fallback if blocked
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => toast.success("Tags copied to clipboard!"))
        .catch(() => fallbackCopy());
    } else {
      fallbackCopy();
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
      fetchSubscriptionStatus(); // Update credits
    } catch (error) {
      // Handle credit limit
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily limit reached! Upgrade to continue.");
      } else {
        toast.error("Failed to refine description");
      }
      
      fetchSubscriptionStatus(); // Update credits even on error
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
      fetchSubscriptionStatus(); // Update credits
    } catch (error) {
      // Handle credit limit
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily limit reached! Upgrade to continue.");
      } else {
        toast.error("Failed to generate description");
      }
      fetchSubscriptionStatus(); // Update credits even on error
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

  const handleAudioUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API}/upload/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAudioFile(file);
      setAudioFileId(response.data.file_id);
      toast.success("Audio uploaded!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload audio");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
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
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleYouTubeUpload = async () => {
    if (!uploadTitle || !selectedDescriptionId || !audioFileId || !imageFileId) {
      toast.error("Please fill all required fields and upload files");
      return;
    }

    setUploadingToYouTube(true);
    
    // Show progress toast
    const uploadToast = toast.loading("Creating video from audio and image... This may take 1-2 minutes", {
      duration: 120000 // 2 minutes
    });
    
    try {
      const formData = new FormData();
      formData.append('title', uploadTitle);
      formData.append('description_id', selectedDescriptionId);
      formData.append('tags_id', selectedTagsId || '');
      formData.append('privacy_status', privacyStatus);
      formData.append('audio_file_id', audioFileId);
      formData.append('image_file_id', imageFileId);

      const response = await axios.post(`${API}/youtube/upload`, formData, {
        timeout: 180000 // 3 minute timeout
      });
      
      toast.dismiss(uploadToast);
      
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
      
      fetchSubscriptionStatus(); // Update credits after upload
    } catch (error) {
      toast.dismiss(uploadToast);
      
      // Handle credit limit
      if (error.response?.status === 402) {
        setShowUpgradeModal(true);
        toast.error("Daily upload limit reached! Upgrade to continue.");
      } else if (error.code === 'ECONNABORTED') {
        toast.error("Upload timed out. Your audio file might be too long. Try a shorter file.");
      } else {
        toast.error(error.response?.data?.detail?.message || error.response?.data?.detail || "Failed to upload to YouTube");
      }
      
      fetchSubscriptionStatus(); // Update credits even on error
    } finally {
      setUploadingToYouTube(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient" data-testid="dashboard">
      <DarkModeToggle />
      
      {/* Header */}
      <div className="glass-card mx-4 mt-4 rounded-2xl border-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="SendMyBeat" className="h-12 w-12 object-contain" />
              <div>
                <h1 className="text-2xl font-bold gradient-text">SendMyBeat</h1>
                {user && <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Welcome back, {user.username}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Show Upgrade button for free users */}
              {subscriptionStatus && !subscriptionStatus.is_subscribed && (
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className="btn-modern"
                  data-testid="header-upgrade-btn"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </Button>
              )}
              
              {/* Show Pro badge for subscribed users */}
              {subscriptionStatus && subscriptionStatus.is_subscribed && (
                <div className="px-4 py-2 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white font-semibold text-sm">
                  ✨ Pro Member
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={handleLogout}
                className="gap-2 border-[var(--border-color)]"
                data-testid="logout-btn"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Subscription Banner */}
        {subscriptionStatus && (
          <SubscriptionBanner
            creditsRemaining={subscriptionStatus.credits_remaining}
            uploadCreditsRemaining={subscriptionStatus.upload_credits_remaining}
            isSubscribed={subscriptionStatus.is_subscribed}
            onUpgrade={() => setShowUpgradeModal(true)}
          />
        )}

        {/* Advertisement Banner - Only for free users */}
        {subscriptionStatus && !subscriptionStatus.is_subscribed && (
          <AdBanner 
            isSubscribed={subscriptionStatus.is_subscribed}
            style={{ marginBottom: '24px' }}
          />
        )}

        <Tabs defaultValue="tags" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
            <TabsTrigger value="tags" data-testid="tags-tab">Tag Generator</TabsTrigger>
            <TabsTrigger value="descriptions" data-testid="descriptions-tab">Descriptions</TabsTrigger>
            <TabsTrigger value="upload" data-testid="upload-tab">Upload to YouTube</TabsTrigger>
          </TabsList>

          {/* Tag Generator Tab */}
          <TabsContent value="tags" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Generate YouTube Tags
                </CardTitle>
                <CardDescription>Enter a style or artist name to generate 500 optimized tags</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerateTags} className="space-y-4" data-testid="tag-generator-form">
                  <div className="space-y-2">
                    <Label htmlFor="tag-query">Search Query</Label>
                    <Input
                      id="tag-query"
                      placeholder="e.g., lil uzi, travis scott, dark trap beat"
                      value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                      data-testid="tag-query-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={loadingTags}
                    data-testid="generate-tags-btn"
                  >
                    {loadingTags ? "Generating Tags..." : "Generate Tags"}
                  </Button>
                </form>

                {generatedTags.length > 0 && (
                  <div className="mt-6 space-y-4" data-testid="generated-tags-section">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">Generated Tags ({generatedTags.length})</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyTags}
                        className="gap-2"
                        data-testid="copy-tags-btn"
                      >
                        <Copy className="h-4 w-4" />
                        Copy All
                      </Button>
                    </div>
                    <div className="tag-cloud" data-testid="tags-list">
                      {generatedTags.map((tag, index) => (
                        <span key={index} className="tag-item" data-testid={`tag-${index}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tag History */}
            {tagHistory.length > 0 && (
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle>Recent Generations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tagHistory.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => {
                          setGeneratedTags(item.tags);
                          setTagQuery(item.query);
                        }}
                        data-testid="tag-history-item"
                      >
                        <p className="font-medium text-slate-800">{item.query}</p>
                        <p className="text-sm text-slate-500">{item.tags.length} tags generated</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Descriptions Tab */}
          <TabsContent value="descriptions" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Create/Save Description */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Save className="h-5 w-5 text-blue-600" />
                    Create & Save Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="desc-title">Title</Label>
                    <Input
                      id="desc-title"
                      placeholder="e.g., Trap Beat Template"
                      value={newDescription.title}
                      onChange={(e) => setNewDescription({ ...newDescription, title: e.target.value })}
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
                      data-testid="desc-content-input"
                    />
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
                <Card className="shadow-lg border-0">
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
                <Card className="shadow-lg border-0">
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
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle>Saved Descriptions ({descriptions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {descriptions.length === 0 ? (
                  <p className="text-center text-slate-500 py-8" data-testid="no-descriptions-msg">No saved descriptions yet. Create one above!</p>
                ) : (
                  <div className="space-y-3" data-testid="descriptions-list">
                    {descriptions.map((desc) => {
                      const isExpanded = expandedDescriptions.has(desc.id);
                      const preview = desc.content.substring(0, 150);
                      const showPreview = !isExpanded && desc.content.length > 150;
                      
                      return (
                        <div key={desc.id} className="p-4 bg-slate-50 rounded-lg" data-testid={`desc-item-${desc.id}`}>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-slate-800">{desc.title}</h3>
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
          <TabsContent value="upload" className="space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Youtube className="h-5 w-5 text-red-600" />
                  Upload Beat to YouTube
                </CardTitle>
                <CardDescription>Connect your YouTube account and upload beats automatically</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* YouTube Connection Status */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  {youtubeConnected ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-slate-800">YouTube Connected</p>
                          <p className="text-sm text-slate-500">{youtubeEmail}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={disconnectYouTube}
                        data-testid="disconnect-youtube-btn"
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                        <p className="font-medium text-slate-800">YouTube Not Connected</p>
                      </div>
                      <Alert>
                        <AlertDescription>
                          To use YouTube upload, you need to configure Google OAuth credentials in backend/.env:
                          <br />• GOOGLE_CLIENT_ID
                          <br />• GOOGLE_CLIENT_SECRET
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={connectYouTube}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        data-testid="connect-youtube-btn"
                      >
                        <Link className="h-4 w-4 mr-2" />
                        Connect YouTube Account
                      </Button>
                    </div>
                  )}
                </div>

                {youtubeConnected && (
                  <div className="space-y-6">
                    {/* File Uploads */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="audio-upload">Audio File (MP3, WAV, etc.)</Label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
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
                              <p className="text-sm text-slate-600">Uploading...</p>
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
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center">
                          <Input
                            id="image-upload"
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp"
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
                        <Label htmlFor="select-tags">Select Tags (Optional)</Label>
                        <Select value={selectedTagsId} onValueChange={setSelectedTagsId}>
                          <SelectTrigger id="select-tags" data-testid="select-tags">
                            <SelectValue placeholder="Choose tags" />
                          </SelectTrigger>
                          <SelectContent>
                            {tagHistory.map((tag) => (
                              <SelectItem key={tag.id} value={tag.id}>
                                {tag.query} ({tag.tags.length} tags)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

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
    </div>
  );
};

export default Dashboard;