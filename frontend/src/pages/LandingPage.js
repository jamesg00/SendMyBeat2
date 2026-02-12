import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Music, Upload, Users, Zap, Globe, Shield, ArrowRight, Play, Star, Youtube, Trophy } from "lucide-react";

const LandingPage = ({ setIsAuthenticated }) => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login or register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const response = await axios.post(`${API}${endpoint}`, {
        username,
        password
      });

      localStorage.setItem("token", response.data.access_token);
      setIsAuthenticated(true);
      toast.success(`Welcome ${authMode === "login" ? "back" : ""}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-green-500/30">

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <Music className="h-6 w-6 text-black fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight">SendMyBeat</span>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => { setAuthMode("login"); setIsLoginOpen(true); }}
              className="hidden md:flex hover:bg-white/5"
            >
              Log In
            </Button>
            <Button
              onClick={() => { setAuthMode("register"); setIsLoginOpen(true); }}
              className="bg-white text-black hover:bg-gray-200 font-semibold rounded-full px-6 transition-all hover:scale-105"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-48 md:pb-32 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-green-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-fade-in-up">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-medium text-gray-300">New: Producer Spotlight & AI Tools</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8 leading-tight">
            The Future of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400">
              Beat Distribution
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Upload to YouTube in seconds. Generate viral tags with AI. <br className="hidden md:block" />
            Join a global community of 100k+ producers.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => { setAuthMode("register"); setIsLoginOpen(true); }}
              className="h-14 px-8 rounded-full bg-green-500 hover:bg-green-400 text-black font-bold text-lg w-full sm:w-auto shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all hover:shadow-[0_0_50px_rgba(34,197,94,0.6)]"
            >
              Start Uploading Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 rounded-full border-white/20 hover:bg-white/10 text-lg w-full sm:w-auto backdrop-blur-sm"
            >
              <Play className="mr-2 h-5 w-5 fill-current" />
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-20 md:py-32 relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything You Need to Blow Up</h2>
            <p className="text-gray-400 text-lg">Powerful tools designed for the modern producer workflow.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">

            {/* Feature 1: YouTube Uploads (Large Card) */}
            <div className="md:col-span-2 row-span-2 rounded-3xl bg-zinc-900/50 border border-white/10 p-8 md:p-12 relative overflow-hidden group hover:border-green-500/30 transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] group-hover:bg-green-500/20 transition-all" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6 text-red-500">
                    <Youtube className="h-6 w-6 fill-current" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4">Instant YouTube Uploads</h3>
                  <p className="text-gray-400 text-lg leading-relaxed max-w-md">
                    Drag, drop, done. We render your audio and artwork into a 1080p video and upload it directly to your channel. No video editing software required.
                  </p>
                </div>
                <div className="mt-8 bg-black/40 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full w-[75%] bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" />
                    </div>
                    <span className="text-sm font-mono text-green-400">75%</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 font-mono">
                    <span>Rendering Video...</span>
                    <span>~12s remaining</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2: AI Tags */}
            <div className="rounded-3xl bg-zinc-900/50 border border-white/10 p-8 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-[60px]" />
              <div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
                <Zap className="h-5 w-5 fill-current" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI Tag Generator</h3>
              <p className="text-gray-400 text-sm">
                Get high-ranking tags instantly. Our AI analyzes your beat's genre and mood to find viral keywords.
              </p>
            </div>

            {/* Feature 3: Spotlight */}
            <div className="rounded-3xl bg-zinc-900/50 border border-white/10 p-8 relative overflow-hidden group hover:border-yellow-500/30 transition-colors">
              <div className="absolute top-10 right-10 w-20 h-20 bg-yellow-500/10 rounded-full blur-[40px]" />
              <div className="h-10 w-10 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-4 text-yellow-400">
                <Trophy className="h-5 w-5 fill-current" />
              </div>
              <h3 className="text-xl font-bold mb-2">Producer Spotlight</h3>
              <p className="text-gray-400 text-sm">
                Get discovered. We feature top producers on our homepage, driving traffic to your beat store.
              </p>
            </div>

            {/* Feature 4: Theme Maker */}
            <div className="md:col-span-3 rounded-3xl bg-zinc-900/50 border border-white/10 p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 group hover:border-blue-500/30 transition-colors">
              <div className="flex-1">
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
                  <Users className="h-5 w-5 fill-current" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Your Studio, Your Vibe</h3>
                <p className="text-gray-400">
                  Customize your dashboard with our new Theme Maker. Choose from Matrix, Glassmorphism, Neubrutalism, or Minimal styles.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="h-20 w-32 rounded-lg bg-[#00ff41]/20 border border-[#00ff41] p-2">
                  <div className="text-[#00ff41] text-xs font-mono">Matrix</div>
                </div>
                <div className="h-20 w-32 rounded-lg bg-white/10 border border-white/20 backdrop-blur-md p-2">
                  <div className="text-white text-xs font-sans">Glass</div>
                </div>
                <div className="h-20 w-32 rounded-none bg-[#fff1f2] border-2 border-black p-2 shadow-[4px_4px_0px_0px_black]">
                  <div className="text-black text-xs font-mono font-bold">Neo</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-green-500" />
            <span className="font-bold">SendMyBeat © 2026</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="/terms" className="hover:text-white transition-colors">Terms</a>
            <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy</a>
            <a href="/about" className="hover:text-white transition-colors">About</a>
          </div>
        </div>
      </footer>

      {/* Auth Dialog */}
      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              {authMode === "login" ? "Welcome Back" : "Join the Movement"}
            </DialogTitle>
            <DialogDescription className="text-center text-gray-400">
              {authMode === "login" ? "Enter your details to access your studio." : "Start your journey to 100k streams today."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAuth} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-black/50 border-white/10 focus:border-green-500/50 focus:ring-green-500/20"
                placeholder="ProducerName"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/50 border-white/10 focus:border-green-500/50 focus:ring-green-500/20"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-white text-black hover:bg-gray-200 font-bold h-11"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : (authMode === "login" ? "Log In" : "Create Account")}
            </Button>
          </form>

          <div className="text-center text-sm text-gray-500">
            {authMode === "login" ? (
              <>Don't have an account? <button onClick={() => setAuthMode("register")} className="text-green-400 hover:underline">Sign up</button></>
            ) : (
              <>Already have an account? <button onClick={() => setAuthMode("login")} className="text-green-400 hover:underline">Log in</button></>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

// Helper components for icons
function Trophy(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
  )
}

export default LandingPage;
