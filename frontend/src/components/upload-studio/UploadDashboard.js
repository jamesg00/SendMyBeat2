import React from "react";
import { Youtube, Music, Image as ImageIcon, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".flac", ".ogg"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic", ".heif"];

const UploadDashboard = ({
  youtubeConnected,
  youtubeName,
  youtubeEmail,
  onDisconnectYouTube,
  onConnectYouTube,
  handleAudioUpload,
  handleImageUpload,
  uploadingAudio,
  uploadProgress,
  audioFile,
  uploadingImage,
  imageFile,
  selectedImageLabel,
  hasImageReady,
  isAudioDragActive,
  setIsAudioDragActive,
  isImageDragActive,
  setIsImageDragActive,
  setStudioOpen,
  currentUploadJob,
  uploadJobProgress,
  uploadJobElapsed,
  uploadJobStage,
}) => {
  return (
    <Card className="dashboard-card min-h-[400px] relative overflow-hidden terminal-panel-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-[var(--accent-primary)]" />
          New Upload
        </CardTitle>
        <CardDescription>Connect YouTube, then upload audio and artwork. GIF artwork loops in the rendered video.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {youtubeConnected && (
          <div className="terminal-inline-status">
            <div className="flex items-center gap-3">
              <span className="terminal-status-dot" />
              <div>
                <p className="font-medium text-sm">{youtubeName ? `Connected as ${youtubeName}` : "YouTube connected"}</p>
                {youtubeEmail && <p className="text-xs opacity-70">{youtubeEmail}</p>}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={onDisconnectYouTube}>
              Disconnect
            </Button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div
            className={`terminal-upload-zone p-8 text-center transition-all ${isAudioDragActive ? "terminal-upload-zone--active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsAudioDragActive(true);
            }}
            onDragLeave={() => setIsAudioDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsAudioDragActive(false);
              handleAudioUpload(e.dataTransfer.files[0]);
            }}
          >
            <Input type="file" accept={AUDIO_EXTENSIONS.join(",")} className="hidden" id="audio-input" onChange={(e) => handleAudioUpload(e.target.files[0])} />
            <label htmlFor="audio-input" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="h-12 w-12 flex items-center justify-center text-[var(--accent-primary)]">
                <Music className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Upload Audio</p>
                <p className="text-xs text-slate-500">MP3, WAV, M4A, FLAC, OGG</p>
              </div>
              {uploadingAudio && <div className="text-xs text-[var(--accent-primary)]">Uploading... {uploadProgress}%</div>}
              {audioFile && <div className="text-xs text-[var(--accent-primary)] font-medium break-all">{audioFile.name}</div>}
            </label>
          </div>

          <div
            className={`terminal-upload-zone p-8 text-center transition-all ${isImageDragActive ? "terminal-upload-zone--active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsImageDragActive(true);
            }}
            onDragLeave={() => setIsImageDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsImageDragActive(false);
              handleImageUpload(e.dataTransfer.files[0]);
            }}
          >
            <Input type="file" accept={IMAGE_EXTENSIONS.join(",")} className="hidden" id="image-input" onChange={(e) => handleImageUpload(e.target.files[0])} />
            <label htmlFor="image-input" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="h-12 w-12 flex items-center justify-center text-[var(--accent-primary)]">
                <ImageIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Upload Artwork</p>
                <p className="text-xs text-slate-500">JPG, PNG, WEBP, GIF</p>
              </div>
              {uploadingImage && <div className="text-xs text-[var(--accent-primary)]">Uploading...</div>}
              {hasImageReady && (
                <div className="text-xs text-[var(--accent-primary)] font-medium break-all">
                  {selectedImageLabel || imageFile?.name || "Selected image ready"}
                </div>
              )}
            </label>
          </div>
        </div>

        {currentUploadJob && ["queued", "processing"].includes(currentUploadJob.status) && (
          <div className="terminal-job-status px-4 py-4 text-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-[var(--accent-primary)]">
                  YouTube upload {currentUploadJob.status === "queued" ? "queued" : "processing"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {uploadJobStage || currentUploadJob.message || "Rendering and uploading in the background."}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--accent-primary)]">
                  {typeof uploadJobProgress === "number" ? `${uploadJobProgress}%` : `${currentUploadJob.progress || 0}%`}
                </p>
                {uploadJobElapsed && (
                  <p className="text-xs text-muted-foreground">Running {uploadJobElapsed}</p>
                )}
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden bg-[var(--bg-tertiary)]">
              <div
                className="h-full bg-[var(--accent-primary)] transition-all duration-300"
                style={{ width: `${typeof uploadJobProgress === "number" ? uploadJobProgress : (currentUploadJob.progress || 0)}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span>Queued</span>
              <span>&gt;</span>
              <span>Token Refresh</span>
              <span>&gt;</span>
              <span>Render</span>
              <span>&gt;</span>
              <span>Upload</span>
            </div>
          </div>
        )}

        {audioFile && hasImageReady && (
          <Button onClick={() => setStudioOpen(true)} variant="outline" className="w-full py-6 text-lg terminal-publish-button">
            Enter Studio <Wand2 className="ml-2 h-5 w-5" />
          </Button>
        )}
      </CardContent>

      {!youtubeConnected && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/88 px-4">
          <div className="w-full max-w-md border border-[var(--border-color)] bg-[var(--card-bg)] p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-[var(--accent-primary)]">
              <Youtube className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Connect YouTube First
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Before uploading audio or artwork, connect the YouTube account you want this beat published to.
            </p>
            <Button className="mt-5 w-full" onClick={onConnectYouTube}>
              Connect YouTube Account
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default UploadDashboard;
