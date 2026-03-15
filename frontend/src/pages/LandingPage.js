import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2, LineChart, Music, Play, Upload, Youtube, Zap } from "lucide-react";
import { setAuthToken } from "@/lib/auth";
import "@/pages/LandingPage.css";

const workflowSteps = [
  {
    title: "1. Drop in your beat",
    description: "Start with a beat title and artwork. No editor timeline required.",
    icon: Music,
  },
  {
    title: "2. Generate metadata",
    description: "Get an SEO-ready title, description, and a focused tag set for YouTube.",
    icon: Zap,
  },
  {
    title: "3. Upload fast",
    description: "Render the video and push it straight to YouTube from one screen.",
    icon: Upload,
  },
];

const planCards = [
  {
    name: "Free",
    price: "$0",
    description: "Start testing the workflow without committing.",
    bullets: [
      "2 AI generations per day",
      "2 YouTube uploads per day",
      "Tag, title, and upload flow",
    ],
  },
  {
    name: "Plus",
    price: "$5/mo",
    description: "For producers publishing consistently every month.",
    bullets: [
      "220 AI generations per month",
      "90 YouTube uploads per month",
      "BeatHelper queue + templates",
    ],
  },
  {
    name: "Max",
    price: "$12/mo",
    description: "High-usage plan for serious producers.",
    bullets: [
      "High-usage AI workflow",
      "High-usage YouTube uploads",
      "Priority BeatHelper automation",
    ],
  },
];

const LandingPage = ({ setIsAuthenticated }) => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const openAuth = (mode) => {
    setAuthMode(mode);
    setIsLoginOpen(true);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const response = await axios.post(`${API}${endpoint}`, {
        username,
        password,
      });

      setAuthToken(response.data.access_token);
      setIsAuthenticated(true);
      setPassword("");
      toast.success(`Welcome ${authMode === "login" ? "back" : ""}!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-page selection:bg-green-500/30">
      <nav className="landing-nav fixed z-50 w-full">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-5 md:px-6">
          <div className="flex items-center gap-3">
            <div className="landing-brand-mark flex h-10 w-10 items-center justify-center rounded-xl">
              <Music className="h-6 w-6 fill-current text-black" />
            </div>
            <span className="whitespace-nowrap text-lg font-bold tracking-tight sm:text-xl">SendMyBeat</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              onClick={() => openAuth("login")}
              className="landing-ghost-btn hidden whitespace-nowrap px-3 md:flex"
            >
              Log In
            </Button>
            <Button
              onClick={() => openAuth("register")}
              className="landing-primary-btn whitespace-nowrap rounded-full px-4 sm:px-5 font-semibold transition-all hover:scale-105"
            >
              Start Free
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden pb-16 pt-28 md:pb-24 md:pt-40">
        <div className="landing-shell-glow-a absolute left-1/2 top-0 h-[520px] w-[980px] -translate-x-1/2 blur-[120px]" />
        <div className="landing-shell-glow-b absolute right-0 top-32 h-[420px] w-[540px] blur-[100px]" />

        <div className="container relative z-10 mx-auto px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="landing-chip mb-6 inline-flex items-center gap-2 rounded-full px-4 py-2">
                <span className="landing-chip-dot h-2 w-2 rounded-full" />
                <span className="text-sm font-medium">
                  Built for producers uploading type beats to YouTube
                </span>
              </div>

              <h1 className="mb-6 max-w-4xl text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl">
                Grow your beat channel with AI tags, titles, and instant{" "}
                <span className="gradient-text">
                  YouTube uploads.
                </span>
              </h1>

              <p className="landing-muted mb-8 max-w-2xl text-lg leading-relaxed md:text-xl">
                SendMyBeat helps producers turn one beat idea into upload-ready metadata and a published video
                without bouncing between tag tools, notes apps, and editors.
              </p>

              <div className="mb-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => openAuth("register")}
                  className="landing-cta-btn h-14 w-full rounded-full px-8 text-lg font-bold transition-all sm:w-auto"
                >
                  Start Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="landing-outline-btn h-14 w-full rounded-full text-lg sm:w-auto"
                >
                  <Play className="mr-2 h-5 w-5 fill-current" />
                  Watch Demo
                </Button>
              </div>

              <div className="landing-muted grid gap-3 text-sm sm:grid-cols-3">
                <div className="landing-info-card rounded-2xl px-4 py-4">
                  <div className="landing-info-card-title mb-1 font-semibold">What it is</div>
                  <div>AI metadata and upload workflow for beat producers.</div>
                </div>
                <div className="landing-info-card rounded-2xl px-4 py-4">
                  <div className="landing-info-card-title mb-1 font-semibold">Who it is for</div>
                  <div>Anyone publishing type beats and trying to grow on YouTube.</div>
                </div>
                <div className="landing-info-card rounded-2xl px-4 py-4">
                  <div className="landing-info-card-title mb-1 font-semibold">What to click</div>
                  <div>Create an account, generate metadata, then upload your beat.</div>
                </div>
              </div>
            </div>

            <div className="landing-panel rounded-[32px] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="landing-label text-xs uppercase tracking-[0.28em]">Live Example</p>
                  <h2 className="landing-panel-title mt-1 text-2xl font-bold">From idea to upload-ready</h2>
                </div>
                <div className="landing-pill rounded-full px-3 py-1 text-xs font-semibold">
                  1 workflow
                </div>
              </div>

              <div className="space-y-4">
                <div className="landing-input-shell rounded-2xl p-4">
                  <div className="landing-muted-2 mb-2 text-xs uppercase tracking-[0.2em]">Input</div>
                  <div className="landing-plan-shell rounded-xl px-4 py-3 text-base font-medium">
                    Future Type Beat
                  </div>
                </div>

                <div className="landing-output-shell rounded-2xl p-4">
                  <div className="landing-output-label mb-3 text-xs uppercase tracking-[0.2em]">Output</div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {[
                      "future type beat",
                      "ds2 type beat",
                      "dirty sprite 2 type beat",
                      "purple reign type beat",
                      "monster type beat",
                      "pluto trap type beat",
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="landing-tag rounded-full px-3 py-1 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="landing-tag-muted rounded-full px-3 py-1 text-xs">
                      +54 more tags
                    </span>
                  </div>
                  <div className="landing-muted space-y-2 text-sm">
                    <div>
                      <span className="landing-panel-title font-semibold">Title:</span> Future Type Beat 2026
                    </div>
                    <div>
                      <span className="landing-panel-title font-semibold">Description:</span> Generated and ready for YouTube.
                    </div>
                    <div className="landing-accent-text flex items-center gap-2 pt-1">
                      <Youtube className="h-4 w-4" />
                      Upload-ready in one screen
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="landing-stat rounded-2xl p-4">
                    <div className="landing-panel-title text-2xl font-bold">60-80</div>
                    <div className="landing-muted-2 mt-1 text-xs uppercase tracking-[0.18em]">Tags per run</div>
                  </div>
                  <div className="landing-stat rounded-2xl p-4">
                    <div className="landing-panel-title text-2xl font-bold">1</div>
                    <div className="landing-muted-2 mt-1 text-xs uppercase tracking-[0.18em]">Title + description set</div>
                  </div>
                  <div className="landing-stat rounded-2xl p-4">
                    <div className="landing-panel-title text-2xl font-bold">Fast</div>
                    <div className="landing-muted-2 mt-1 text-xs uppercase tracking-[0.18em]">Upload workflow</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-14">
        <div className="container mx-auto px-6">
          <div className="landing-plan-shell rounded-[28px] p-6 md:p-8">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="landing-kicker mb-2 text-sm font-semibold uppercase tracking-[0.24em]">
                  Start Here
                </p>
                <h2 className="text-3xl font-bold md:text-4xl">Know what you get before you sign up.</h2>
              </div>
              <p className="landing-muted-2 max-w-xl text-sm leading-relaxed md:text-base">
                Free gets you into the workflow immediately. Paid plans expand usage for producers posting
                consistently.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {planCards.map((plan) => (
                <div key={plan.name} className="landing-plan-card rounded-3xl p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xl font-bold">{plan.name}</div>
                      <div className="landing-muted-2 mt-1 text-sm">{plan.description}</div>
                    </div>
                    <div className="landing-plan-price text-2xl font-bold">{plan.price}</div>
                  </div>
                  <div className="space-y-2">
                    {plan.bullets.map((bullet) => (
                      <div key={bullet} className="landing-muted flex items-start gap-2 text-sm">
                        <CheckCircle2 className="landing-accent-text mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-5xl">Focus the homepage on the core workflow.</h2>
            <p className="landing-muted-2 mx-auto max-w-2xl text-lg">
              These are the product pillars worth leading with: metadata, uploads, and growth feedback.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {workflowSteps.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="landing-workflow-card rounded-3xl p-7"
              >
                <div className="landing-icon-box mb-5 flex h-12 w-12 items-center justify-center rounded-2xl">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-2xl font-bold">{title}</h3>
                <p className="landing-muted-2 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="landing-upload-shell rounded-3xl p-8">
              <div className="landing-icon-box-red mb-5 flex h-12 w-12 items-center justify-center rounded-2xl">
                <Youtube className="h-6 w-6 fill-current" />
              </div>
              <h3 className="mb-3 text-3xl font-bold">Upload without leaving the workflow</h3>
              <p className="landing-muted-2 max-w-2xl text-lg leading-relaxed">
                Build the video from your beat and artwork, keep your tags and description attached, and send it to
                YouTube from the same app instead of rebuilding everything manually.
              </p>
            </div>

            <div className="landing-growth-shell rounded-3xl p-8">
              <div className="landing-icon-box-gold mb-5 flex h-12 w-12 items-center justify-center rounded-2xl">
                <LineChart className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-2xl font-bold">Growth tools stay secondary</h3>
              <p className="landing-muted-2">
                Spotlight, community, and aesthetic customization can support the product, but they should not compete
                with the core promise on first load.
              </p>
            </div>
          </div>

        </div>
      </section>

      <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
        <DialogContent className="landing-auth-dialog sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="landing-auth-title text-center text-2xl font-bold">
              {authMode === "login" ? "Welcome Back" : "Create Your Account"}
            </DialogTitle>
            <DialogDescription className="landing-auth-copy text-center">
              {authMode === "login"
                ? "Log in to manage your beat uploads and metadata."
                : "Start with the free plan and test the workflow immediately."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAuth} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="landing-auth-label">Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="landing-auth-input"
                placeholder="ProducerName"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="landing-auth-label">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="landing-auth-input"
                placeholder="Password"
                required
              />
            </div>

            <Button
              type="submit"
              className="landing-auth-submit h-11 w-full font-bold"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : authMode === "login" ? "Log In" : "Create Account"}
            </Button>
          </form>

          <div className="landing-muted-2 text-center text-sm">
            {authMode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button onClick={() => setAuthMode("register")} className="landing-auth-link-btn">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => setAuthMode("login")} className="landing-auth-link-btn">
                  Log in
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
