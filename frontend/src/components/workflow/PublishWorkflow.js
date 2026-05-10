import { Button } from "@/components/ui/button";
import { AlertCircle, Sparkles, Youtube } from "lucide-react";
import TagsSection from "@/components/workflow/TagsSection";
import DescriptionsSection from "@/components/workflow/DescriptionsSection";
import UploadStudio from "@/components/UploadStudio";

const PublishWorkflow = ({
  subscriptionStatus,
  youtubeConnected,
  youtubeProfilePicture,
  youtubeName,
  youtubeEmail,
  onConnectYouTube,
  onDisconnectYouTube,
  onOpenAnalytics,
  onOpenUpgrade,
  hasPaidAnalyticsAccess,
  tagsSectionProps,
  descriptionsSectionProps,
  uploadStudioProps,
}) => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="workflow-toolbar-strip">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={onOpenAnalytics}
            className={`gap-2 ${hasPaidAnalyticsAccess ? "" : "opacity-65 border-dashed"}`}
            title={hasPaidAnalyticsAccess ? "Open analytics" : "Upgrade to unlock analytics"}
          >
            <Sparkles className="h-4 w-4" />
            Analytics
          </Button>
          {!subscriptionStatus?.is_subscribed && (
            <Button onClick={onOpenUpgrade} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Upgrade
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
        <div className="workflow-metadata-heading">
          <div className="workflow-step-strip">
            <span className="workflow-step-pill workflow-step-pill--done">1. Build Metadata</span>
            <span className="workflow-step-pill">2. Review Outputs</span>
            <span className="workflow-step-pill">3. Connect + Upload</span>
          </div>
          <p className="workflow-section-copy">
            Start with tags and descriptions first, then connect YouTube and move into the upload studio.
          </p>
        </div>

        <div className="terminal-workflow-grid">
          <div className="terminal-workflow-column">
            <TagsSection {...tagsSectionProps} mode="editor" showInlineOutput={false} />
          </div>
          <div className="terminal-workflow-column">
            <DescriptionsSection {...descriptionsSectionProps} mode="editor" showInlineOutput={false} />
          </div>
        </div>

        <div className="workflow-results-shell">
          <div className="workflow-results-shell__header">
            <p className="workflow-section-kicker">Review Outputs</p>
            <p className="workflow-section-copy">
              Expand generated tags or saved descriptions only when you need them, without changing the editor layout above.
            </p>
          </div>
          <div className="workflow-results-shell__grid">
            <div className="workflow-results-shell__column">
              <TagsSection {...tagsSectionProps} mode="results" />
            </div>
            <div className="workflow-results-shell__column">
              <DescriptionsSection {...descriptionsSectionProps} mode="results" />
            </div>
          </div>
        </div>

        <div className="workflow-metadata-heading">
          <p className="workflow-section-kicker">Upload</p>
          <p className="workflow-section-copy">
            Once your metadata is ready, connect YouTube, upload your beat and artwork, preview it, and publish.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-stretch gap-2">
            {youtubeConnected ? (
              <Button variant="outline" onClick={onDisconnectYouTube} className="whitespace-nowrap">
                Switch Account
              </Button>
            ) : (
              <Button onClick={onConnectYouTube} className="gap-2 whitespace-nowrap">
                <Youtube className="h-4 w-4" />
                Connect YouTube
              </Button>
            )}
          </div>

          <div className={`workflow-status-card ${youtubeConnected ? "workflow-status-card--connected" : "workflow-status-card--warning"}`}>
            <div className="flex items-center gap-3">
              {youtubeConnected && youtubeProfilePicture ? (
                <img
                  src={youtubeProfilePicture}
                  alt={youtubeName || youtubeEmail || "Connected YouTube account"}
                  className="h-10 w-10 border border-[var(--border-color)] object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center text-[var(--accent-primary)]">
                  {youtubeConnected ? <Youtube className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {youtubeConnected ? (youtubeName || "YouTube account connected") : "YouTube account required"}
                </p>
                <p className="text-xs sm:text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                  {youtubeConnected
                    ? (youtubeEmail || "Ready to publish from this channel.")
                    : "Connect YouTube to allow uploads, previews, and publishing on the right channel."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="workflow-upload-shell">
          <UploadStudio {...uploadStudioProps} />
        </div>
      </div>
    </div>
  );
};

export default PublishWorkflow;
