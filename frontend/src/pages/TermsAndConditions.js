import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen cyber-grid scanline-effect" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 matrix-glow hover:scale-105 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <DarkModeToggle />
        </div>

        <div className="game-card p-8 md:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center brand-text matrix-glow rgb-hover">
            Terms and Conditions
          </h1>
          <p className="text-sm mb-8 text-center matrix-glow">
            Last Updated: January 2025
          </p>

          <div className="space-y-6 matrix-glow">
            <section>
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 matrix-glow">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using SendMyBeat.com ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms and Conditions, please do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                2. Description of Service
              </h2>
              <p>
                SendMyBeat.com provides music producers with tools to:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Generate AI-powered tags for music discovery optimization</li>
                <li>Create and manage beat descriptions</li>
                <li>Upload content to YouTube with automated metadata</li>
                <li>Access premium features through subscription plans</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                3. User Accounts and Registration
              </h2>
              <p>
                To use the Service, you must create an account. You are responsible for:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>Providing accurate and complete information during registration</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                4. Subscription Plans and Payments
              </h2>
              <p className="mb-2">
                <strong>Free Plan:</strong> Users receive 2 free AI tag generations and 2 free YouTube uploads per day.
              </p>
              <p className="mb-2">
                <strong>Pro Plan:</strong> Subscribers receive unlimited AI tag generations and YouTube uploads.
              </p>
              <p>
                All subscription fees are processed securely through Stripe. Subscriptions automatically renew unless cancelled. Refunds may be issued at our discretion in accordance with applicable consumer protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                5. User Content and Intellectual Property
              </h2>
              <p>
                You retain all rights to the content you upload to our Service. By uploading content, you grant SendMyBeat.com a non-exclusive, worldwide license to process and deliver your content as necessary to provide the Service. You represent and warrant that:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>You own or have the necessary rights to all content you upload</li>
                <li>Your content does not infringe on any third-party rights</li>
                <li>Your content complies with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                6. Acceptable Use Policy
              </h2>
              <p>
                You agree not to:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Upload content that is illegal, harmful, or infringes on others' rights</li>
                <li>Use the Service for any fraudulent or malicious purposes</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the proper functioning of the Service</li>
                <li>Use automated systems to access the Service without permission</li>
                <li>Violate YouTube's Terms of Service when using our upload feature</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                7. Third-Party Services
              </h2>
              <p>
                Our Service integrates with third-party platforms including YouTube, OpenAI, and Stripe. Your use of these integrations is subject to the respective third-party terms of service. We are not responsible for the actions or policies of these third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                8. Limitation of Liability
              </h2>
              <p>
                SendMyBeat.com is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service. Our total liability shall not exceed the amount you paid for the Service in the past 12 months.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                9. Data and Privacy
              </h2>
              <p>
                Your use of the Service is also governed by our Privacy Policy. We collect and process data in accordance with applicable privacy laws. Please review our Privacy Policy to understand our data practices.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                10. Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our discretion. You may cancel your subscription at any time through your account settings. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                11. Changes to Terms
              </h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of material changes via email or through the Service. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                12. Governing Law
              </h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which SendMyBeat.com operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                13. Contact Information
              </h2>
              <p>
                If you have any questions about these Terms and Conditions, please contact us through the information provided on our About page or through our support channels.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                14. Severability
              </h2>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
                15. Entire Agreement
              </h2>
              <p>
                These Terms constitute the entire agreement between you and SendMyBeat.com regarding the use of the Service, superseding any prior agreements between you and SendMyBeat.com relating to your use of the Service.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              By using SendMyBeat.com, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsAndConditions;
