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
            <CardTitle className="text-xl sm:text-2xl text-center font-bold matrix-glow rgb-hover brand-text">
              SendMyBeat
            </CardTitle>
            <CardDescription className="text-center text-sm sm:text-base matrix-glow">
              ENTER THE BEAT DIMENSION
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
    <div className="min-h-screen matrix-bg cyber-grid relative scanline-effect">
      <DarkModeToggle />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-32 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-block mb-6 sm:mb-8 pulse-glow">
              <img src="/logo.png" alt="SendMyBeat" className="h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 mx-auto object-contain" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight matrix-glow rgb-hover brand-text px-2">
              SendMyBeat
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed matrix-glow px-4">
              <span className="rgb-hover inline-block">LEVEL UP YOUR YOUTUBE GAME</span>
              <br className="hidden sm:block" />
              <span className="block sm:inline mt-2 sm:mt-0">500+ AI TAGS • FREE YOUTUBE UPLOAD • AI DESCRIPTIONS</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 px-4">
              <Button
                size="lg"
                className="matrix-btn w-full sm:w-auto text-sm sm:text-base md:text-lg px-6 sm:px-8 md:px-10 py-5 sm:py-6 md:py-7 glitch-effect"
                onClick={() => setShowAuth(true)}
                data-testid="get-started-btn"
              >
                <Rocket className="mr-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                TRY FOR FREE
              </Button>
              <p className="text-xs sm:text-sm matrix-glow text-center">
                ✅ 3 FREE DAILY USES • NO CREDIT CARD
              </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-w-2xl mx-auto mt-12 sm:mt-16 px-2">
              <div className="game-card p-2 sm:p-3 md:p-4 pulse-glow">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold matrix-glow">500+</div>
                <div className="text-xs sm:text-sm matrix-glow">TAGS</div>
              </div>
              <div className="game-card p-2 sm:p-3 md:p-4 pulse-glow">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold matrix-glow">FREE</div>
                <div className="text-xs sm:text-sm matrix-glow">YOUTUBE</div>
              </div>
              <div className="game-card p-2 sm:p-3 md:p-4 pulse-glow">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold matrix-glow">AI</div>
                <div className="text-xs sm:text-sm matrix-glow">DESCRIPTIONS</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-3 sm:mb-4 matrix-glow rgb-hover px-2">
            POWER-UPS FOR PRODUCERS
          </h2>
          <p className="text-center text-sm sm:text-base md:text-lg lg:text-xl mb-8 sm:mb-12 md:mb-20 matrix-glow px-4">
            NEXT-GEN TOOLS FOR BEAT MAKERS
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 px-2">
            <div className="game-card p-4 sm:p-5 md:p-6" data-testid="feature-ai-tags">
              <div className="mb-3 sm:mb-4 md:mb-6">
                <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 rounded-2xl neon-border flex items-center justify-center pulse-glow" style={{background: 'rgba(0, 255, 65, 0.1)'}}>
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 matrix-glow" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 matrix-glow rgb-hover">
                AI TAG GENERATOR
              </h3>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed matrix-glow">
                Generate 500 YouTube tags instantly with GPT-4o. Type beat variations, trending keywords, SEO-optimized phrases.
              </p>
            </div>

            <div className="game-card p-4 sm:p-5 md:p-6" data-testid="feature-descriptions">
              <div className="mb-3 sm:mb-4 md:mb-6">
                <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 rounded-2xl neon-border flex items-center justify-center pulse-glow" style={{background: 'rgba(0, 255, 65, 0.1)'}}>
                  <Save className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 matrix-glow" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 matrix-glow rgb-hover">
                SAVE TEMPLATES
              </h3>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed matrix-glow">
                Create unlimited description templates. One-click copy for consistent branding across your beat catalog.
              </p>
            </div>

            <div className="game-card p-4 sm:p-5 md:p-6" data-testid="feature-ai-refine">
              <div className="mb-3 sm:mb-4 md:mb-6">
                <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 rounded-2xl neon-border flex items-center justify-center pulse-glow" style={{background: 'rgba(0, 255, 65, 0.1)'}}>
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 matrix-glow" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 matrix-glow rgb-hover">
                YOUTUBE ANALYTICS
              </h3>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed matrix-glow">
                AI growth coach analyzes your channel. Learn what works and dominate the algorithm.
              </p>
            </div>

            <div className="game-card p-4 sm:p-5 md:p-6">
              <div className="mb-3 sm:mb-4 md:mb-6">
                <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 rounded-2xl neon-border flex items-center justify-center pulse-glow" style={{background: 'rgba(0, 255, 65, 0.1)'}}>
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 matrix-glow" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 matrix-glow rgb-hover">
                AI DESCRIPTIONS
              </h3>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed matrix-glow">
                Generate and save video descriptions. Create templates for faster uploads.
              </p>
            </div>

            <div className="game-card p-4 sm:p-5 md:p-6">
              <div className="mb-3 sm:mb-4 md:mb-6">
                <div className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 rounded-2xl neon-border flex items-center justify-center pulse-glow" style={{background: 'rgba(0, 255, 65, 0.1)'}}>
                  <Rocket className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 matrix-glow" />
                </div>
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 md:mb-4 matrix-glow rgb-hover">
                FREE YOUTUBE UPLOAD
              </h3>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed matrix-glow">
                Upload beats directly to YouTube for free. Audio + image = video. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-2">
          <div className="game-card text-center p-6 sm:p-8 md:p-12 lg:p-16 pulse-glow">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold matrix-glow mb-3 sm:mb-4 md:mb-6 rgb-hover px-2">
              READY TO LEVEL UP?
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 md:mb-10 max-w-2xl mx-auto matrix-glow px-4">
              Join 1000+ producers growing their channels with AI-powered YouTube optimization
            </p>
            <Button
              size="lg"
              className="matrix-btn w-full sm:w-auto text-sm sm:text-base md:text-lg px-6 sm:px-8 md:px-10 py-5 sm:py-6 md:py-7 glitch-effect"
              onClick={() => setShowAuth(true)}
              data-testid="cta-signup-btn"
            >
              <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              Start Free Now
            </Button>
          </div>
        </div>
      </div>

      {/* Google API Integration Explanation */}
      <div className="container mx-auto px-4 py-16 border-t" style={{borderColor: 'var(--border-color)'}}>
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-8">
            <h2 className="text-3xl font-bold gradient-text mb-6 text-center">
              About SendMyBeat & Google Integration
            </h2>
            
            <div className="space-y-6" style={{color: 'var(--text-secondary)'}}>
              <p className="text-lg leading-relaxed">
                <strong className="gradient-text">SendMyBeat</strong> helps artists, producers, and music creators upload, manage, and share their beats directly to YouTube with ease. Using Google's YouTube Data API, SendMyBeat allows users to securely connect their YouTube accounts and upload beats or videos directly from our platform — saving time and simplifying content management.
              </p>

              <div className="grid md:grid-cols-2 gap-6 my-8">
                <div className="producer-card p-6">
                  <h3 className="text-xl font-semibold mb-3 gradient-text">Key Features</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>Upload beats and videos directly to your YouTube channel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>Manage video titles, descriptions, and visibility settings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>AI-powered tag generation for maximum discoverability</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span>Stay in full control of your YouTube account and data</span>
                    </li>
                  </ul>
                </div>

                <div className="producer-card p-6">
                  <h3 className="text-xl font-semibold mb-3 gradient-text">Google API Usage</h3>
                  <p className="text-sm mb-3">
                    SendMyBeat uses the YouTube Data API to publish videos to your YouTube channel <strong>only with your explicit permission</strong>.
                  </p>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm">
                    <p className="font-semibold text-blue-400 mb-2">Privacy Guarantee:</p>
                    <p>We never store or share your Google data with third parties. Your credentials are encrypted and used solely for uploading content to YOUR channel.</p>
                  </div>
                </div>
              </div>

              <div className="text-center pt-4">
                <p className="text-sm italic" style={{color: 'var(--text-secondary)'}}>
                  By connecting your YouTube account, you authorize SendMyBeat to upload videos on your behalf using the YouTube Data API v3.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
