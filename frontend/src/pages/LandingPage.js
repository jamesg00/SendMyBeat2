import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Music, Sparkles, Save, Zap, TrendingUp, Target, Rocket } from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";

const LandingPage = ({ setIsAuthenticated }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, formData);
      localStorage.setItem("token", response.data.access_token);
      toast.success("Account created successfully!");
      setIsAuthenticated(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      localStorage.setItem("token", response.data.access_token);
      toast.success("Welcome back!");
      setIsAuthenticated(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (showAuth) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center p-4 relative">
        <DarkModeToggle />
        <Card className="w-full max-w-md glass-card animate-slide-in border-0">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-6 animate-float">
              <img src="/logo.png" alt="SendMyBeat" className="h-20 w-20 object-contain" />
            </div>
            <CardTitle className="text-2xl text-center font-bold gradient-text">Welcome to SendMyBeat</CardTitle>
            <CardDescription className="text-center text-base" style={{color: 'var(--text-secondary)'}}>
              Start creating pro YouTube tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-[var(--bg-secondary)] p-1">
                <TabsTrigger value="login" data-testid="login-tab" className="data-[state=active]:bg-[var(--card-bg)]">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab" className="data-[state=active]:bg-[var(--card-bg)]">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                  <div className="space-y-2">
                    <Label htmlFor="login-username" style={{color: 'var(--text-primary)'}}>Username</Label>
                    <Input
                      id="login-username"
                      name="username"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      data-testid="login-username-input"
                      className="bg-[var(--bg-secondary)] border-[var(--border-color)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" style={{color: 'var(--text-primary)'}}>Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      data-testid="login-password-input"
                      className="bg-[var(--bg-secondary)] border-[var(--border-color)]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full btn-modern"
                    disabled={loading}
                    data-testid="login-submit-btn"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                  <div className="space-y-2">
                    <Label htmlFor="register-username" style={{color: 'var(--text-primary)'}}>Username</Label>
                    <Input
                      id="register-username"
                      name="username"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      data-testid="register-username-input"
                      className="bg-[var(--bg-secondary)] border-[var(--border-color)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password" style={{color: 'var(--text-primary)'}}>Password</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      data-testid="register-password-input"
                      className="bg-[var(--bg-secondary)] border-[var(--border-color)]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full btn-modern"
                    disabled={loading}
                    data-testid="register-submit-btn"
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setShowAuth(false)}
              data-testid="back-btn"
              style={{color: 'var(--text-secondary)'}}
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient relative">
      <DarkModeToggle />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 pt-24 pb-32 relative z-10">
          <div className="max-w-5xl mx-auto text-center animate-slide-in">
            <div className="inline-block mb-8 animate-float">
              <img src="/logo.png" alt="SendMyBeat" className="h-32 w-32 mx-auto object-contain neon-glow" />
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 gradient-text leading-tight">
              SendMyBeat
            </h1>
            <p className="text-xl sm:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed" style={{color: 'var(--text-secondary)'}}>
              The ultimate AI-powered YouTube tag generator for producers. <br/>
              <span className="gradient-text font-semibold">500 strategic tags</span> that actually get your beats discovered.
            </p>
            <Button
              size="lg"
              className="btn-modern text-lg px-10 py-7"
              onClick={() => setShowAuth(true)}
              data-testid="get-started-btn"
            >
              <Rocket className="mr-2 h-6 w-6" />
              Start Creating Free
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-24 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-bold text-center mb-4 gradient-text">
            Built For Producers
          </h2>
          <p className="text-center text-xl mb-20" style={{color: 'var(--text-secondary)'}}>
            Everything you need to dominate YouTube search
          </p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="producer-card card-hover" data-testid="feature-ai-tags">
              <div className="mb-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center neon-glow">
                  <Target className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>
                Strategic AI Tags
              </h3>
              <p className="text-lg leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                Generate 500 vidIQ-style tags with long-tail keywords, competition analysis, and trending terms. Dominate search results.
              </p>
            </div>

            <div className="producer-card card-hover" style={{animationDelay: '0.1s'}} data-testid="feature-descriptions">
              <div className="mb-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center neon-glow">
                  <Save className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>
                Save Templates
              </h3>
              <p className="text-lg leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                Create unlimited description templates. One-click copy for consistent branding across your beat catalog.
              </p>
            </div>

            <div className="producer-card card-hover" style={{animationDelay: '0.2s'}} data-testid="feature-ai-refine">
              <div className="mb-6">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center neon-glow">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>
                YouTube Upload
              </h3>
              <p className="text-lg leading-relaxed" style={{color: 'var(--text-secondary)'}}>
                Upload beats directly to YouTube with AI-optimized tags and descriptions. Automate your entire workflow.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="producer-card text-center p-16 card-hover neon-glow">
            <h2 className="text-4xl sm:text-5xl font-bold gradient-text mb-6">
              Ready to Level Up?
            </h2>
            <p className="text-xl mb-10 max-w-2xl mx-auto" style={{color: 'var(--text-secondary)'}}>
              Join producers getting 10x more views with AI-powered YouTube optimization.
            </p>
            <Button
              size="lg"
              className="btn-modern text-lg px-10 py-7"
              onClick={() => setShowAuth(true)}
              data-testid="cta-signup-btn"
            >
              <Sparkles className="mr-2 h-6 w-6" />
              Start Free Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

const LandingPage = ({ setIsAuthenticated }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, formData);
      localStorage.setItem("token", response.data.access_token);
      toast.success("Account created successfully!");
      setIsAuthenticated(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/login`, formData);
      localStorage.setItem("token", response.data.access_token);
      toast.success("Welcome back!");
      setIsAuthenticated(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 animate-fade-in">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Music className="h-7 w-7 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center font-bold">Welcome to SendMyBeat</CardTitle>
            <CardDescription className="text-center">Create your account or sign in</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      name="username"
                      placeholder="Enter your username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      data-testid="login-username-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      data-testid="login-password-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={loading}
                    data-testid="login-submit-btn"
                  >
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4" data-testid="register-form">
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      name="username"
                      placeholder="Choose a username"
                      value={formData.username}
                      onChange={handleInputChange}
                      required
                      data-testid="register-username-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      data-testid="register-password-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    disabled={loading}
                    data-testid="register-submit-btn"
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => setShowAuth(false)}
              data-testid="back-btn"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-indigo-100/20"></div>
        <div className="container mx-auto px-4 pt-20 pb-32 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="inline-block mb-6">
              <div className="h-20 w-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
                <Music className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-tight">
              SendMyBeat.com
            </h1>
            <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              The ultimate YouTube tag generator for beat producers. Generate 500 AI-powered tags, save custom descriptions, and maximize your beat's discoverability.
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => setShowAuth(true)}
              data-testid="get-started-btn"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16 text-slate-800">
            Everything You Need to Promote Your Beats
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up" data-testid="feature-ai-tags">
              <CardHeader>
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">AI-Powered Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Generate 500 optimized YouTube tags instantly based on your beat style. Perfect for "type beat" searches and maximizing discoverability.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up" style={{animationDelay: '0.1s'}} data-testid="feature-descriptions">
              <CardHeader>
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
                  <Save className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">Save Descriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Create and save unlimited description templates. Perfect for maintaining consistency across your beat catalog or creating variations.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slide-up" style={{animationDelay: '0.2s'}} data-testid="feature-ai-refine">
              <CardHeader>
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
                  <Zap className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">AI Refinement</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Refine existing descriptions or generate new ones from your beat info (BPM, key, price, socials). AI-powered optimization for better engagement.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-12 shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Level Up Your Beat Game?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Join producers who are maximizing their YouTube reach with AI-powered tags and descriptions.
          </p>
          <Button
            size="lg"
            className="bg-white text-blue-600 hover:bg-gray-50 px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => setShowAuth(true)}
            data-testid="cta-signup-btn"
          >
            Start Creating Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;