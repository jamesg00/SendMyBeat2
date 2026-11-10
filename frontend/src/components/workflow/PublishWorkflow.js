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
    <div className="space-y-5">
      <div className="workflow-toolbar-strip">
        <div className="workflow-step-strip">
          <span className="workflow-step-pill workflow-step-pill--done">1. Build Metadata</span>
          <span className="workflow-step-pill">2. Review Outputs</span>
          <span className="workflow-step-pill">3. Connect + Upload</span>
        </div>
        <div className="workflow-toolbar-actions">
          <Button
            variant="outline"
            onClick={onOpenAnalytics}
            className="smb-btn smb-btn--sec smb-btn--sm"
            title={hasPaidAnalyticsAccess ? "Open analytics" : "Upgrade to unlock analytics"}
          >
            <Sparkles className="h-4 w-4" />
            Analytics
            {hasPaidAnalyticsAccess ? null : <span className="smb-nav-tag">Pro</span>}
          </Button>
          {!subscriptionStatus?.is_subscribed && (
            <Button onClick={onOpenUpgrade} className="smb-btn smb-btn--pri smb-btn--sm">
              <Sparkles className="h-4 w-4" />
              Upgrade
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
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

        <div className="up-head">
          <div className="min-w-0">
            <p className="workflow-section-kicker">Upload</p>
            <p className="smb-t2 text-sm">Pick your beat and artwork, preview the video, then publish it to your channel.</p>
          </div>
          <div className={`up-account ${youtubeConnected ? "is-connected" : ""}`}>
            {youtubeConnected && youtubeProfilePicture ? (
              <img src={youtubeProfilePicture} alt="" className="up-account-pic" />
            ) : (
              <span className="up-account-pic">{youtubeConnected ? <Youtube className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}</span>
            )}
            <span className="min-w-0">
              <b className="block truncate text-sm">{youtubeConnected ? youtubeName || "YouTube connected" : "YouTube not connected"}</b>
              <span className="block truncate smb-t3 text-xs">{youtubeConnected ? youtubeEmail || "Ready to publish to this channel" : "Needed to upload"}</span>
            </span>
            {youtubeConnected ? (
              <Button variant="outline" onClick={onDisconnectYouTube} className="smb-btn smb-btn--sec smb-btn--sm whitespace-nowrap">
                Switch Account
              </Button>
            ) : (
              <Button onClick={onConnectYouTube} className="smb-btn smb-btn--pri smb-btn--sm whitespace-nowrap">
                <Youtube className="h-4 w-4" />
                Connect YouTube
              </Button>
            )}
          </div>
        </div>

        <UploadStudio {...uploadStudioProps} />
      </div>
    </div>
  );
};

export default PublishWorkflow;
