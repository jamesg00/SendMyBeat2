import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Music, Sparkles, Save, LogOut, Copy, Trash2, Edit, Plus } from "lucide-react";

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

  useEffect(() => {
    fetchUser();
    fetchDescriptions();
    fetchTagHistory();
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
    try {
      const response = await axios.post(`${API}/tags/generate`, { query: tagQuery });
      setGeneratedTags(response.data.tags);
      toast.success(`Generated ${response.data.tags.length} tags!`);
      fetchTagHistory();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate tags");
    } finally {
      setLoadingTags(false);
    }
  };

  const copyTags = () => {
    navigator.clipboard.writeText(generatedTags.join(", "));
    toast.success("Tags copied to clipboard!");
  };

  const copyDescription = (content) => {
    navigator.clipboard.writeText(content);
    toast.success("Description copied to clipboard!");
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
      toast.success("Description refined!");
    } catch (error) {
      toast.error("Failed to refine description");
    } finally {
      setLoadingRefine(false);
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
    } catch (error) {
      toast.error("Failed to generate description");
    } finally {
      setLoadingGenerate(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50" data-testid="dashboard">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Music className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">SendMyBeat</h1>
                {user && <p className="text-sm text-slate-500">Welcome, {user.username}</p>}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2"
              data-testid="logout-btn"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="tags" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="tags" data-testid="tags-tab">Tag Generator</TabsTrigger>
            <TabsTrigger value="descriptions" data-testid="descriptions-tab">Descriptions</TabsTrigger>
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
                      rows={5}
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
                    {descriptions.map((desc) => (
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
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{desc.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;