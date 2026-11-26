import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Handshake, Wrench, UserCircle, CreditCard, Music, Users, Ban, Sparkles,
  Network, Scale, ShieldCheck, LogOut, RefreshCw, Landmark, Mail, Puzzle, FileCheck,
} from "lucide-react";
import PolicySection from "@/components/PolicySection";
import "@/pages/PolicyPages.css";

const TermsAndConditions = () => {
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
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            Back
          </Button>
        </div>

        <div className="policy-card p-4 sm:p-6 md:p-8 lg:p-12">
          <h1 className="policy-title mb-4 text-center text-2xl font-bold sm:mb-6 sm:text-3xl md:text-4xl">
            Terms and Conditions
          </h1>
          <p className="policy-muted mb-6 text-center text-xs sm:mb-8 sm:text-sm">
            Last Updated: November 26, 2026
          </p>

          <div className="policy-copy space-y-6 text-sm sm:space-y-8 sm:text-base">
            <PolicySection icon={Handshake} title="1. Acceptance of Terms">
              <p>
                By using SendMyBeat.com or the SendMyBeat app ("the Service"), you agree to these Terms and Conditions.
                If you do not agree, please do not use the Service.
              </p>
            </PolicySection>

            <PolicySection icon={Wrench} title="2. Description of Service">
              <p>SendMyBeat gives music producers tools to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Generate and score YouTube tags, titles and descriptions with AI</li>
                <li>Render visualizer videos and upload them to YouTube</li>
                <li>Check channel analytics, beats and thumbnails</li>
                <li>Use free tools without an account: 3 free tag runs a day, plus the title, description and hashtag generators and the tag counter</li>
                <li>Share a public producer profile in the Producer Spotlight</li>
              </ul>
            </PolicySection>

            <PolicySection icon={UserCircle} title="3. User Accounts">
              <p>Most features need an account. You are responsible for:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Keeping your sign-in details private</li>
                <li>Everything that happens under your account</li>
                <li>Telling us right away about any unauthorized use</li>
                <li>Giving accurate information when you sign up</li>
              </ul>
            </PolicySection>

            <PolicySection icon={CreditCard} title="4. Plans and Payments">
              <ul className="list-disc ml-6 space-y-2">
                <li><strong>Free:</strong> new accounts get 3 AI generations and 3 YouTube uploads, one time. They don't renew. Visitors without an account can run the free tag generator once.</li>
                <li><strong>Plus:</strong> $5 a month for 50 AI generations and 50 YouTube uploads a month.</li>
                <li><strong>Pro:</strong> $10 a month for 100 of each a month, plus the Pro features.</li>
                <li><strong>Founding Pro:</strong> when offered, $40 a year for Pro, limited to the first 50 members.</li>
              </ul>
              <p className="mt-3">
                Payments and tips are processed by Stripe. Subscriptions renew automatically until you cancel, and you
                can cancel at any time from your account. If an AI generation or upload fails on our side, the credit
                is returned. Other refunds are at our discretion, in line with applicable consumer protection laws.
                Members who subscribed before these plans keep their earlier limits. Prices and limits may change, and we'll tell you before a change affects your plan.
              </p>
            </PolicySection>

            <PolicySection icon={Music} title="5. Your Content">
              <p>
                You keep all rights to the beats, images and text you upload. You give SendMyBeat a non-exclusive,
                worldwide license to store, process and display that content only as needed to run the Service, for
                example to render your video, upload it to your channel or show your public profile. You confirm that:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>You own or have the rights to everything you upload, including samples and artwork</li>
                <li>Your content doesn't infringe anyone else's rights</li>
                <li>Your content follows the law and YouTube's rules</li>
              </ul>
            </PolicySection>

            <PolicySection icon={Users} title="6. Public Profiles and Spotlight">
              <p>
                Your producer profile, including your username, avatar, bio, social links and top beat, is public in
                the Producer Spotlight. Don't post anything there you don't want others to see. We may remove profiles
                or content that break these Terms.
              </p>
            </PolicySection>

            <PolicySection icon={Ban} title="7. Acceptable Use">
              <p>You agree not to:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Upload content that is illegal, harmful, or infringes on others' rights</li>
                <li>Use the Service for fraud, spam or anything malicious</li>
                <li>Try to get around free-run limits, credits or rate limits</li>
                <li>Try to gain unauthorized access to our systems</li>
                <li>Scrape or access the Service with bots without our permission</li>
                <li>Break YouTube's Terms of Service when you use our upload feature</li>
              </ul>
            </PolicySection>

            <PolicySection icon={Sparkles} title="8. AI Results">
              <p>
                Tags, titles, descriptions, scores and analysis are generated with AI and search data. They are
                suggestions, not guarantees: we can't promise any ranking, views or sales. Check what you publish.
              </p>
            </PolicySection>

            <PolicySection icon={Network} title="9. Third-Party Services">
              <p>
                The Service works with YouTube and Google, AI providers (xAI, OpenAI and DeepSeek), Stripe and others
                listed in our <Link to="/privacy-policy" className="policy-link">Privacy Policy</Link>. Your use of
                those services is also covered by their own terms, and we're not responsible for their actions.
              </p>
            </PolicySection>

            <PolicySection icon={Scale} title="10. Limitation of Liability">
              <p>
                SendMyBeat is provided "as is" without warranties of any kind. We aren't liable for indirect,
                incidental, special, consequential or punitive damages from using or not being able to use the Service.
                Our total liability is limited to what you paid us in the past 12 months.
              </p>
            </PolicySection>

            <PolicySection icon={ShieldCheck} title="11. Data and Privacy">
              <p>
                Your use of the Service is also governed by our{" "}
                <Link to="/privacy-policy" className="policy-link">Privacy Policy</Link>, which explains what we
                collect and how we use it.
              </p>
            </PolicySection>

            <PolicySection icon={LogOut} title="12. Termination">
              <p>
                We may suspend or close accounts that break these Terms. You can stop using the Service and cancel your
                subscription at any time. When an account is closed, your right to use the Service ends.
              </p>
            </PolicySection>

            <PolicySection icon={RefreshCw} title="13. Changes to Terms">
              <p>
                We may change these Terms. We'll post the new version here and update the date above, and tell you
                about major changes in the Service. Using the Service after a change means you accept the new Terms.
              </p>
            </PolicySection>

            <PolicySection icon={Landmark} title="14. Governing Law">
              <p>
                These Terms are governed by the laws of the jurisdiction in which SendMyBeat.com operates, without
                regard to its conflict of law rules.
              </p>
            </PolicySection>

            <PolicySection icon={Mail} title="15. Contact">
              <p>
                Questions about these Terms? Send us a message through the feedback form on your SendMyBeat profile
                page, or "Report a bug or idea" in the app.
              </p>
            </PolicySection>

            <PolicySection icon={Puzzle} title="16. Severability">
              <p>
                If any part of these Terms can't be enforced, it will be limited as little as needed, and the rest of
                the Terms stay in effect.
              </p>
            </PolicySection>

            <PolicySection icon={FileCheck} title="17. Entire Agreement">
              <p>
                These Terms and our Privacy Policy are the whole agreement between you and SendMyBeat about the Service,
                and replace any earlier agreements about it.
              </p>
            </PolicySection>
          </div>

          <div className="policy-accent-divider mt-12 pt-8">
            <p className="policy-muted text-center text-sm">
              By using SendMyBeat, you confirm that you have read, understood and agree to these Terms and Conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
