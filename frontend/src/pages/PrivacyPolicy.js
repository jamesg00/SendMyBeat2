import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Hand, Wrench, Database, Settings2, Lock, Network, Megaphone, Share2,
  Users, UserCheck, Clock, Cookie, Baby, RefreshCw, Mail, Youtube,
} from "lucide-react";
import PolicySection from "@/components/PolicySection";
import "@/pages/PolicyPages.css";

const ext = { target: "_blank", rel: "noopener noreferrer", className: "policy-link" };

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="policy-shell">
      <div className="policy-wrap policy-copy container mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
        <div className="policy-header mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="policy-back-btn flex items-center gap-1 text-sm transition-transform hover:scale-105 sm:gap-2 sm:text-base"
          >
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            Back
          </Button>
        </div>

        <div className="policy-card p-4 sm:p-6 md:p-8 lg:p-12">
          <h1 className="policy-title mb-4 text-center text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl">
            Privacy Policy
          </h1>
          <p className="policy-muted mb-6 text-center text-xs sm:mb-8 sm:text-sm">
            Last Updated: November 26, 2026
          </p>

          <div className="policy-copy space-y-6 text-sm sm:space-y-8 sm:text-base">
            <PolicySection icon={Hand} title="1. Introduction">
              <p>
                Welcome to SendMyBeat.com ("we," "our," or "us"). This policy explains what we collect when you use
                the SendMyBeat website and mobile app, how we use it, and the choices you have.
              </p>
            </PolicySection>

            <PolicySection icon={Wrench} title="2. What We Do">
              <p>SendMyBeat helps music producers get their beats found on YouTube. We provide:</p>
              <ul className="ml-6 mt-2 list-disc space-y-2">
                <li>AI-generated and scored YouTube tags, titles and descriptions</li>
                <li>Visualizer videos and direct uploads to your YouTube channel</li>
                <li>Channel analytics, beat analysis and thumbnail checks</li>
                <li>Free tools you can use without an account: 3 free tag runs a day, plus the title, description and hashtag generators and the tag counter</li>
                <li>A public Producer Spotlight where producers share their profile and top beat</li>
              </ul>
            </PolicySection>

            <PolicySection icon={Database} title="3. Information We Collect">
              <h3 className="policy-title mb-2 text-base font-semibold sm:text-lg">Account information</h3>
              <ul className="mb-4 ml-6 list-disc space-y-1">
                <li>Username and password (stored only as a bcrypt hash)</li>
                <li>If you sign in with Google: your Google email, name, account ID and profile picture</li>
                <li>Your plan, and the Stripe customer and subscription IDs for paid plans</li>
              </ul>
              <h3 className="policy-title mb-2 text-base font-semibold sm:text-lg">Content you create or upload</h3>
              <ul className="mb-4 ml-6 list-disc space-y-1">
                <li>Audio files and images you upload, and the videos we render from them</li>
                <li>Searches you run, and the tags, titles and descriptions you generate or save</li>
                <li>Your public producer profile: avatar, banner, bio, social links and top beat</li>
                <li>Feedback you send us, with your username, platform, device and app version</li>
              </ul>
              <h3 className="policy-title mb-2 text-base font-semibold sm:text-lg">YouTube data</h3>
              <ul className="mb-4 ml-6 list-disc space-y-1">
                <li>When you connect YouTube: your channel's email, name and picture, and access tokens (encrypted)</li>
                <li>Public statistics for your channel and videos, used for analytics</li>
                <li>View counts of videos you upload through us, read about 7 and 28 days after upload, to learn which tags work</li>
              </ul>
              <h3 className="policy-title mb-2 text-base font-semibold sm:text-lg">Technical information</h3>
              <ul className="ml-6 list-disc space-y-1">
                <li>IP addresses, used for rate limits and to stop abuse. For the free tag runs we keep a one-way hash of your IP and a random ID saved in your browser.</li>
                <li>Push notification tokens if you allow notifications in the mobile app</li>
                <li>Usage records such as how many AI generations you used</li>
              </ul>
            </PolicySection>

            <PolicySection icon={Settings2} title="4. How We Use Your Information">
              <ul className="ml-6 list-disc space-y-2">
                <li><strong>Running your account:</strong> signing you in, tracking your plan and credits</li>
                <li><strong>YouTube uploads:</strong> uploading videos to YOUR channel when you ask us to</li>
                <li><strong>AI features:</strong> sending your search terms, tags, titles, channel statistics or thumbnail image to an AI provider to generate or check them</li>
                <li><strong>Payments:</strong> handling subscriptions and tips through Stripe</li>
                <li><strong>Improving results:</strong> learning which tags lead to views, and improving the product</li>
                <li><strong>Safety:</strong> rate limits and abuse prevention</li>
              </ul>
            </PolicySection>

            <PolicySection icon={Lock} title="5. Data Storage and Security">
              <ul className="ml-6 list-disc space-y-2">
                <li><strong>Database:</strong> account data, history and settings are kept in a MongoDB database on our server</li>
                <li><strong>Files:</strong> uploaded audio and images are stored on our server. Rendered videos are deleted after the upload to YouTube finishes.</li>
                <li><strong>Passwords:</strong> stored only as bcrypt hashes</li>
                <li><strong>YouTube tokens:</strong> encrypted before they are stored</li>
                <li><strong>Sign-in:</strong> the website keeps your sign-in token in your browser's session storage, and the app keeps it in your phone's secure storage</li>
              </ul>
            </PolicySection>

            <PolicySection icon={Network} title="6. Third-Party Services">
              <p className="mb-3">We rely on these services, each under its own privacy policy:</p>
              <ul className="ml-6 list-disc space-y-2">
                <li><strong>Google and YouTube:</strong> sign-in, YouTube uploads and channel data (<a href="https://policies.google.com/privacy" {...ext}>Google Privacy Policy</a>)</li>
                <li><strong>AI providers:</strong> xAI (Grok), OpenAI and DeepSeek process the text and images you send for AI features</li>
                <li><strong>Stripe:</strong> processes payments. We never see or store your full card number (<a href="https://stripe.com/privacy" {...ext}>Stripe Privacy Policy</a>)</li>
                <li><strong>Spotify, SoundCloud and Google search suggestions:</strong> queried with artist names and search phrases to find tags. None of your personal data is sent.</li>
                <li><strong>SendGrid:</strong> delivers producer verification applications to us by email</li>
                <li><strong>Expo:</strong> delivers push notifications to the mobile app</li>
                <li><strong>PostHog:</strong> product analytics on the website</li>
                <li><strong>Google AdSense:</strong> shows ads on the website to visitors without a paid plan</li>
              </ul>
            </PolicySection>

            <PolicySection icon={Megaphone} title="7. Advertising">
              <p>
                Google AdSense may use cookies to show ads based on your visits to this and other websites. You can
                turn off personalized ads in <a href="https://adssettings.google.com" {...ext}>Google's Ad Settings</a>,
                and read how Google uses this data at{" "}
                <a href="https://policies.google.com/technologies/ads" {...ext}>Google's advertising policy page</a>.
                Paid subscribers don't see our ad slot.
              </p>
            </PolicySection>

            <PolicySection icon={Share2} title="8. Data Sharing">
              <p className="mb-3">We do NOT sell your personal data. We share it only:</p>
              <ul className="ml-6 list-disc space-y-2">
                <li>With the services in section 6, to run the features you use</li>
                <li>When you ask us to, such as uploading a video to YOUR YouTube channel</li>
                <li>To comply with the law, or to protect our rights, property or safety</li>
              </ul>
            </PolicySection>

            <PolicySection icon={Users} title="9. Your Public Producer Profile">
              <p>
                Every account gets a producer profile in the public Producer Spotlight. Anyone can see its username,
                avatar, banner, bio, social links, top beat (which can be played), likes, followers and streaks. If you
                sign in with Google, your Google profile picture becomes your starting avatar. Change or remove these
                details from your profile at any time, and only add what you're happy to share publicly.
              </p>
            </PolicySection>

            <PolicySection icon={UserCheck} title="10. Your Rights">
              <ul className="ml-6 list-disc space-y-2">
                <li><strong>Access or delete:</strong> ask us for a copy of your data, or to delete your account and its data, through the feedback form on your profile page or "Report a bug or idea" in the app</li>
                <li><strong>Revoke YouTube access:</strong> disconnect YouTube in SendMyBeat, and remove our access at <a href="https://myaccount.google.com/permissions" {...ext}>Google's permissions page</a></li>
                <li><strong>Cancel:</strong> cancel a paid plan at any time from your account</li>
                <li><strong>Notifications:</strong> turn off push notifications in your phone's settings</li>
              </ul>
            </PolicySection>

            <PolicySection icon={Clock} title="11. Data Retention">
              <ul className="ml-6 list-disc space-y-2">
                <li><strong>Account data, history and uploaded files:</strong> kept while your account is open, or until you ask us to delete them</li>
                <li><strong>Rendered videos:</strong> deleted after the upload to YouTube finishes</li>
                <li><strong>Rate-limit and free-run records:</strong> kept to stop abuse</li>
              </ul>
            </PolicySection>

            <PolicySection icon={Cookie} title="12. Cookies and Browser Storage">
              <p>
                We don't set our own tracking cookies. The website saves your sign-in token, a random ID for the free
                tag run, your last free results and your display settings in your browser's storage. Google AdSense and
                PostHog may set their own cookies, as described above.
              </p>
            </PolicySection>

            <PolicySection icon={Baby} title="13. Children's Privacy">
              <p>
                Our service is not intended for users under 13. We do not knowingly collect personal information from
                children under 13. If you believe a child under 13 has given us data, contact us and we'll delete it.
              </p>
            </PolicySection>

            <PolicySection icon={RefreshCw} title="14. Changes to This Policy">
              <p>
                We may update this policy from time to time. We'll post the new version on this page and update the
                "Last Updated" date. Continued use of the service after a change means you accept the updated policy.
              </p>
            </PolicySection>

            <PolicySection icon={Mail} title="15. Contact Us">
              <p>
                Questions or data requests? Send us a message through the feedback form on your SendMyBeat profile page, or "Report a bug or idea" in the app.
              </p>
            </PolicySection>

            <PolicySection icon={Youtube} title="16. YouTube API Disclosure" className="policy-divider mt-8 pt-6">
              <p className="mb-3">
                SendMyBeat uses the YouTube API Services. By using our YouTube features, you also agree to the{" "}
                <a href="https://www.youtube.com/t/terms" {...ext}>YouTube Terms of Service</a> and the{" "}
                <a href="https://policies.google.com/privacy" {...ext}>Google Privacy Policy</a>.
              </p>
              <p>
                You can revoke SendMyBeat&apos;s access to your YouTube data at any time on{" "}
                <a href="https://myaccount.google.com/permissions" {...ext}>Google&apos;s security settings page</a>.
              </p>
            </PolicySection>
          </div>

          <div className="policy-accent-divider mt-12 pt-6">
            <p className="policy-muted text-center text-sm">
              &copy; 2026 SendMyBeat.com. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
