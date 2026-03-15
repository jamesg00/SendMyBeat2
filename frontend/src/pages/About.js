import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music, Zap, Youtube, Target, TrendingUp, Shield } from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";
import "@/pages/PolicyPages.css";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="policy-shell">
      <div className="policy-wrap container mx-auto px-3 py-4 sm:px-4 sm:py-6 md:px-6 md:py-8">
        <div className="policy-header mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="policy-back-btn flex items-center gap-1 text-sm transition-transform hover:scale-105 sm:gap-2 sm:text-base"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            Back
          </Button>
          <DarkModeToggle inline />
        </div>

        <div className="policy-card p-4 sm:p-6 md:p-8 lg:p-12">
          <h1 className="policy-title text-center text-2xl font-bold mb-3 sm:mb-4 sm:text-3xl md:text-4xl lg:text-5xl">
            About SendMyBeat
          </h1>
          <p className="policy-muted mb-8 px-2 text-center text-sm sm:mb-12 sm:text-base md:text-lg lg:text-xl">
            Empowering Music Producers to Maximize Beat Discoverability
          </p>

          <div className="policy-copy space-y-6 sm:space-y-8">
            <section>
              <h2 className="policy-title mb-3 flex items-center gap-2 text-xl font-semibold sm:mb-4 sm:gap-3 sm:text-2xl md:text-3xl">
                <Target className="policy-muted w-5 h-5 flex-shrink-0 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                <span>Our Mission</span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed">
                SendMyBeat.com was created with a single purpose: to help music producers get their beats discovered. In today's competitive music landscape, having great beats isn't enough—they need to be found. We leverage cutting-edge AI technology to optimize your content for maximum visibility across platforms like YouTube, ensuring your music reaches the right audience.
              </p>
            </section>

            <section>
              <h2 className="policy-title mb-3 flex items-center gap-2 text-xl font-semibold sm:mb-4 sm:gap-3 sm:text-2xl md:text-3xl">
                <Zap className="policy-muted w-5 h-5 flex-shrink-0 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                <span>What We Do</span>
              </h2>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed mb-3 sm:mb-4">
                SendMyBeat.com is a comprehensive platform designed specifically for music producers who want to maximize their beat discoverability. We provide powerful tools that streamline your workflow and optimize your content for search algorithms:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
                <div className="policy-feature-card p-4 sm:p-5 md:p-6">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Music className="policy-muted mt-1 w-5 h-5 flex-shrink-0 sm:w-6 sm:h-6" />
                    <div>
                      <h3 className="policy-title mb-1.5 text-sm font-semibold sm:mb-2 sm:text-base md:text-lg">AI Tag Generation</h3>
                      <p className="text-xs sm:text-sm">
                        Generate up to 500 advanced, search-optimized tags based on your search queries. Our AI analyzes trends and suggests tags that increase discoverability, similar to tools like vidIQ.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="policy-feature-card p-4 sm:p-5 md:p-6">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <TrendingUp className="policy-muted mt-1 w-5 h-5 flex-shrink-0 sm:w-6 sm:h-6" />
                    <div>
                      <h3 className="policy-title mb-1.5 text-sm font-semibold sm:mb-2 sm:text-base md:text-lg">Smart Description Management</h3>
                      <p className="text-xs sm:text-sm">
                        Save and manage multiple custom or AI-refined descriptions as templates. Generate descriptions based on your email, socials, BPM, and pricing information with AI assistance.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="policy-feature-card p-4 sm:p-5 md:p-6">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Youtube className="policy-muted mt-1 w-5 h-5 flex-shrink-0 sm:w-6 sm:h-6" />
                    <div>
                      <h3 className="policy-title mb-1.5 text-sm font-semibold sm:mb-2 sm:text-base md:text-lg">YouTube Integration</h3>
                      <p className="text-xs sm:text-sm">
                        Upload your beats directly to YouTube with audio and image files from your local storage. Automatically apply generated tags and descriptions with options for public, unlisted, or private visibility.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="policy-feature-card p-4 sm:p-5 md:p-6">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <Shield className="policy-muted mt-1 w-5 h-5 flex-shrink-0 sm:w-6 sm:h-6" />
                    <div>
                      <h3 className="policy-title mb-1.5 text-sm font-semibold sm:mb-2 sm:text-base md:text-lg">Flexible Plans</h3>
                      <p className="text-xs sm:text-sm">
                        Start free with 2 daily AI generations and 2 YouTube uploads, or upgrade to Pro for unlimited access. No commitments, cancel anytime.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="policy-title mb-3 text-xl font-semibold sm:mb-4 sm:text-2xl md:text-3xl">
                Why We Built This
              </h2>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed mb-3 sm:mb-4">
                As fellow creators in the music industry, we understand the challenges producers face. Creating amazing beats is only half the battle—the other half is getting them in front of potential buyers and collaborators. Traditional methods of tagging and describing content are time-consuming and often ineffective.
              </p>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed">
                That's why we built SendMyBeat.com: to automate and optimize the tedious parts of content management so you can focus on what you do best—making music. Our AI-powered tools analyze trends, optimize for search algorithms, and help you stand out in a crowded marketplace.
              </p>
            </section>

            <section>
              <h2 className="policy-title mb-3 text-xl font-semibold sm:mb-4 sm:text-2xl md:text-3xl">
                Who We Are
              </h2>
              <p className="text-sm sm:text-base md:text-lg leading-relaxed">
                We're a team passionate about music technology and empowering independent creators. We believe that great music deserves to be heard, and we're committed to providing tools that level the playing field for producers of all sizes. Whether you're just starting out or you're an established producer, SendMyBeat.com is designed to help you grow your audience and increase your reach.
              </p>
            </section>

            <section className="policy-feature-card p-4 sm:p-6 md:p-8">
              <h2 className="policy-title mb-3 text-center text-xl font-semibold sm:mb-4 sm:text-2xl md:text-3xl">
                Our Commitment
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
                <div>
                  <div className="policy-title mb-2 text-3xl font-bold sm:text-4xl">Quality</div>
                  <p className="text-sm">
                    We use state-of-the-art AI technology to deliver the best results for your content optimization needs.
                  </p>
                </div>
                <div>
                  <div className="policy-title mb-2 text-3xl font-bold sm:text-4xl">Simplicity</div>
                  <p className="text-sm">
                    Our platform is designed to be intuitive and easy to use, saving you time and effort.
                  </p>
                </div>
                <div>
                  <div className="policy-title mb-1.5 text-2xl font-bold sm:mb-2 sm:text-3xl md:text-4xl">Growth</div>
                  <p className="text-xs sm:text-sm">
                    We're constantly improving our tools and adding new features based on user feedback.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="policy-title mb-3 text-xl font-semibold sm:mb-4 sm:text-2xl md:text-3xl">
                Get Started Today
              </h2>
              <p className="mb-4 text-sm leading-relaxed sm:mb-6 sm:text-base md:text-lg">
                Join thousands of music producers who are already maximizing their beat discoverability with SendMyBeat.com. Start with our free plan and experience the power of AI-optimized content management. Upgrade to Pro whenever you're ready for unlimited access.
              </p>
              <div className="flex justify-center px-2">
                <Button
                  onClick={() => navigate('/dashboard')}
                  size="lg"
                  className="matrix-btn w-full sm:w-auto text-sm sm:text-base md:text-lg px-6 sm:px-8 py-5 sm:py-6"
                >
                  Go to Dashboard
                </Button>
              </div>
            </section>
          </div>

          <div className="policy-divider mt-8 px-2 pt-6 sm:mt-12 sm:pt-8">
            <p className="policy-footer-text text-center text-xs sm:text-sm">
              Have questions or feedback? We'd love to hear from you. Connect with us on social media or reach out through our support channels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
