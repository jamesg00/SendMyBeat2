import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Music, Zap, Youtube, Target, TrendingUp, Shield } from "lucide-react";
import DarkModeToggle from "@/components/DarkModeToggle";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen cyber-grid scanline-effect" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 max-w-5xl">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 sm:gap-2 matrix-glow hover:scale-105 transition-transform text-sm sm:text-base"
          >
            <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
            Back
          </Button>
          <DarkModeToggle />
        </div>

        <div className="game-card p-4 sm:p-6 md:p-8 lg:p-12">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 text-center brand-text matrix-glow rgb-hover">
            About SendMyBeat
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-center matrix-glow mb-8 sm:mb-12 px-2">
            Empowering Music Producers to Maximize Beat Discoverability
          </p>

          <div className="space-y-6 sm:space-y-8 matrix-glow">
            <section>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4 matrix-glow flex items-center gap-3">
                <Target className="w-6 h-6 sm:w-8 sm:h-8 matrix-glow" />
                Our Mission
              </h2>
              <p className="text-base sm:text-lg leading-relaxed">
                SendMyBeat.com was created with a single purpose: to help music producers get their beats discovered. In today's competitive music landscape, having great beats isn't enough—they need to be found. We leverage cutting-edge AI technology to optimize your content for maximum visibility across platforms like YouTube, ensuring your music reaches the right audience.
              </p>
            </section>

            <section>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4 matrix-glow flex items-center gap-3">
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 matrix-glow" />
                What We Do
              </h2>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                SendMyBeat.com is a comprehensive platform designed specifically for music producers who want to maximize their beat discoverability. We provide powerful tools that streamline your workflow and optimize your content for search algorithms:
              </p>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="game-card p-6">
                  <div className="flex items-start gap-3">
                    <Music className="w-6 h-6 matrix-glow mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg mb-2 matrix-glow">AI Tag Generation</h3>
                      <p className="text-sm matrix-glow">
                        Generate up to 500 advanced, search-optimized tags based on your search queries. Our AI analyzes trends and suggests tags that increase discoverability, similar to tools like vidIQ.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="game-card p-6">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-6 h-6 matrix-glow mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg mb-2 matrix-glow">Smart Description Management</h3>
                      <p className="text-sm matrix-glow">
                        Save and manage multiple custom or AI-refined descriptions as templates. Generate descriptions based on your email, socials, BPM, and pricing information with AI assistance.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="game-card p-6">
                  <div className="flex items-start gap-3">
                    <Youtube className="w-6 h-6 matrix-glow mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg mb-2 matrix-glow">YouTube Integration</h3>
                      <p className="text-sm matrix-glow">
                        Upload your beats directly to YouTube with audio and image files from your local storage. Automatically apply generated tags and descriptions with options for public, unlisted, or private visibility.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="game-card p-6">
                  <div className="flex items-start gap-3">
                    <Shield className="w-6 h-6 matrix-glow mt-1 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-base sm:text-lg mb-2 matrix-glow">Flexible Plans</h3>
                      <p className="text-sm matrix-glow">
                        Start free with 2 daily AI generations and 2 YouTube uploads, or upgrade to Pro for unlimited access. No commitments, cancel anytime.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4 matrix-glow">
                Why We Built This
              </h2>
              <p className="text-base sm:text-lg leading-relaxed mb-4">
                As fellow creators in the music industry, we understand the challenges producers face. Creating amazing beats is only half the battle—the other half is getting them in front of potential buyers and collaborators. Traditional methods of tagging and describing content are time-consuming and often ineffective.
              </p>
              <p className="text-base sm:text-lg leading-relaxed">
                That's why we built SendMyBeat.com: to automate and optimize the tedious parts of content management so you can focus on what you do best—making music. Our AI-powered tools analyze trends, optimize for search algorithms, and help you stand out in a crowded marketplace.
              </p>
            </section>

            <section>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4 matrix-glow">
                Who We Are
              </h2>
              <p className="text-base sm:text-lg leading-relaxed">
                We're a team passionate about music technology and empowering independent creators. We believe that great music deserves to be heard, and we're committed to providing tools that level the playing field for producers of all sizes. Whether you're just starting out or you're an established producer, SendMyBeat.com is designed to help you grow your audience and increase your reach.
              </p>
            </section>

            <section className="game-card p-8">
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4 matrix-glow text-center">
                Our Commitment
              </h2>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-3xl sm:text-4xl font-bold matrix-glow mb-2">Quality</div>
                  <p className="text-sm matrix-glow">
                    We use state-of-the-art AI technology to deliver the best results for your content optimization needs.
                  </p>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-bold matrix-glow mb-2">Simplicity</div>
                  <p className="text-sm matrix-glow">
                    Our platform is designed to be intuitive and easy to use, saving you time and effort.
                  </p>
                </div>
                <div>
                  <div className="text-3xl sm:text-4xl font-bold matrix-glow mb-2">Growth</div>
                  <p className="text-sm matrix-glow">
                    We're constantly improving our tools and adding new features based on user feedback.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl sm:text-3xl font-semibold mb-4 matrix-glow">
                Get Started Today
              </h2>
              <p className="text-base sm:text-lg leading-relaxed mb-6 matrix-glow">
                Join thousands of music producers who are already maximizing their beat discoverability with SendMyBeat.com. Start with our free plan and experience the power of AI-optimized content management. Upgrade to Pro whenever you're ready for unlimited access.
              </p>
              <div className="flex justify-center">
                <Button
                  onClick={() => navigate('/dashboard')}
                  size="lg"
                  className="matrix-btn text-base sm:text-lg px-8 py-6"
                >
                  Go to Dashboard
                </Button>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-gray-600 dark:text-gray-400">
              Have questions or feedback? We'd love to hear from you. Connect with us on social media or reach out through our support channels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
