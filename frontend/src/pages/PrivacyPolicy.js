import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import DarkModeToggle from '@/components/DarkModeToggle';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const [, setThemeUpdate] = useState(0);

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setThemeUpdate(prev => prev + 1);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <DarkModeToggle />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            Last Updated: October 16, 2025
          </p>

          <div className="space-y-8 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">1. Introduction</h2>
              <p>
                Welcome to SendMyBeat.com ("we," "our," or "us"). We respect your privacy and are committed 
                to protecting your personal data. This privacy policy explains how we collect, use, and 
                safeguard your information when you use our service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">2. What We Do</h2>
              <p>
                SendMyBeat is a platform that helps music producers and beat makers upload their content 
                to YouTube with AI-generated tags and descriptions. We provide tools to:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-2">
                <li>Generate optimized YouTube tags using AI</li>
                <li>Create and save description templates</li>
                <li>Refine and generate descriptions with AI assistance</li>
                <li>Upload beats directly to YouTube with your content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">3. Information We Collect</h2>
              <p className="mb-3">We collect the following types of information:</p>
              
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Account Information:</h3>
              <ul className="list-disc ml-6 mb-4 space-y-1">
                <li>Username and password (encrypted)</li>
                <li>Google account email address (when you connect YouTube)</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Content You Upload:</h3>
              <ul className="list-disc ml-6 mb-4 space-y-1">
                <li>Audio files (MP3, WAV, etc.)</li>
                <li>Thumbnail images (JPG, PNG, etc.)</li>
                <li>Video titles and descriptions you create</li>
                <li>Tags you generate or customize</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">YouTube Access:</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>YouTube channel access for uploading videos</li>
                <li>OAuth tokens for maintaining connection to your YouTube account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">4. How We Use Your Information</h2>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong>Authentication:</strong> To verify your identity and provide access to your account</li>
                <li><strong>YouTube Integration:</strong> To upload videos to YOUR YouTube channel on your behalf</li>
                <li><strong>AI Features:</strong> To generate tags and descriptions using OpenAI's GPT-4o</li>
                <li><strong>Storage:</strong> To save your description templates and tag generation history</li>
                <li><strong>Service Improvement:</strong> To improve our platform and user experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">5. Data Storage and Security</h2>
              <p className="mb-3">We take data security seriously:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong>File Storage:</strong> Audio and image files are stored temporarily during upload and deleted after successful YouTube upload</li>
                <li><strong>Database:</strong> User data, templates, and settings stored in secure MongoDB database</li>
                <li><strong>Passwords:</strong> All passwords are encrypted using industry-standard bcrypt hashing</li>
                <li><strong>OAuth Tokens:</strong> YouTube access tokens stored securely and encrypted</li>
                <li><strong>API Keys:</strong> All API keys and secrets stored in secure environment variables</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">6. Third-Party Services</h2>
              <p className="mb-3">We use the following third-party services:</p>
              
              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Google Services:</h3>
              <ul className="list-disc ml-6 mb-4 space-y-1">
                <li><strong>Google OAuth 2.0:</strong> For secure authentication with your Google account</li>
                <li><strong>YouTube Data API v3:</strong> For uploading videos to your YouTube channel</li>
                <li>Privacy Policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://policies.google.com/privacy</a></li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">OpenAI:</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li><strong>GPT-4o:</strong> For AI-powered tag generation and description creation</li>
                <li>Privacy Policy: <a href="https://openai.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://openai.com/privacy</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">7. Data Sharing</h2>
              <p className="mb-3">We do NOT sell or share your personal data with third parties, except:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li>With your explicit consent (e.g., uploading videos to YOUR YouTube channel)</li>
                <li>To comply with legal obligations or court orders</li>
                <li>To protect our rights, property, or safety</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">8. Your Rights</h2>
              <p className="mb-3">You have the following rights:</p>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of your data</li>
                <li><strong>Delete:</strong> Delete your account and associated data at any time</li>
                <li><strong>Revoke Access:</strong> Disconnect YouTube access at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://myaccount.google.com/permissions</a></li>
                <li><strong>Export:</strong> Download your saved descriptions and templates</li>
                <li><strong>Opt-Out:</strong> Stop using our service at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">9. Data Retention</h2>
              <ul className="list-disc ml-6 space-y-2">
                <li><strong>Account Data:</strong> Retained as long as your account is active</li>
                <li><strong>Uploaded Files:</strong> Deleted immediately after successful YouTube upload</li>
                <li><strong>Templates:</strong> Stored until you delete them or close your account</li>
                <li><strong>Deleted Accounts:</strong> Data permanently deleted within 30 days</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">10. Cookies and Tracking</h2>
              <p>
                We use session cookies for authentication purposes only. We do not use tracking cookies 
                or third-party analytics. Your session data is cleared when you log out.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">11. Children's Privacy</h2>
              <p>
                Our service is not intended for users under 13 years of age. We do not knowingly collect 
                personal information from children under 13. If you believe we have collected data from 
                a child under 13, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">12. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any changes 
                by posting the new policy on this page and updating the "Last Updated" date. Continued 
                use of our service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">13. Contact Us</h2>
              <p className="mb-3">
                If you have any questions about this privacy policy or our data practices, please contact us:
              </p>
              <ul className="space-y-2">
                <li><strong>Website:</strong> <a href="https://tag-genius-4.preview.emergentagent.com" className="text-blue-600 dark:text-blue-400 hover:underline">SendMyBeat.com</a></li>
                <li><strong>For Data Requests:</strong> Use the contact form on our website</li>
              </ul>
            </section>

            <section className="border-t pt-6 mt-8">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">14. YouTube API Disclosure</h2>
              <p className="mb-3">
                SendMyBeat uses the YouTube API Services. By using our service, you are also agreeing to be bound by:
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    YouTube Terms of Service
                  </a>
                </li>
                <li>
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                    Google Privacy Policy
                  </a>
                </li>
              </ul>
              <p className="mt-3">
                You can revoke SendMyBeat's access to your YouTube data via the{' '}
                <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Google security settings page
                </a>.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              © 2025 SendMyBeat.com. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;