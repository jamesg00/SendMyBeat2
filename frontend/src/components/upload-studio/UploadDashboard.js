import React from "react";
import { Check, Image as ImageIcon, Music, Wand2, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".flac", ".ogg"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic", ".heif"];

// The start of Upload Studio: pick the beat and the artwork, then open the studio.
// The YouTube account itself is shown just above, in the Upload section's header.
const UploadDashboard = ({
  youtubeConnected,
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
  const running = currentUploadJob && ["queued", "processing"].includes(currentUploadJob.status);
  const progress = typeof uploadJobProgress === "number" ? uploadJobProgress : currentUploadJob?.progress || 0;
  const ready = audioFile && hasImageReady;
  const imageName = hasImageReady ? selectedImageLabel || imageFile?.name || "Artwork ready" : null;

  return (
    <section className="smb-card up-card">
      <div className="smb-card-head">
        <h3 className="smb-card-title">New upload</h3>
        <span className="smb-mono smb-t3 text-xs">beat + artwork → YouTube video</span>
      </div>

      {youtubeConnected ? (
        <>
          <div className="up-steps">
            <Picker
              id="audio-input"
              step="1"
              title="Beat"
              formats="MP3, WAV, M4A, FLAC, OGG"
              accept={AUDIO_EXTENSIONS.join(",")}
              Icon={Music}
              active={isAudioDragActive}
              setActive={setIsAudioDragActive}
              onFile={handleAudioUpload}
              status={uploadingAudio ? `Uploading… ${uploadProgress}%` : null}
              chosen={audioFile?.name}
            />
            <Picker
              id="image-input"
              step="2"
              title="Artwork"
              formats="JPG, PNG, WEBP, GIF"
              accept={IMAGE_EXTENSIONS.join(",")}
              Icon={ImageIcon}
              active={isImageDragActive}
              setActive={setIsImageDragActive}
              onFile={handleImageUpload}
              status={uploadingImage ? "Uploading…" : null}
              chosen={imageName}
            />
            <div className={`up-step up-step--go ${ready ? "is-done" : ""}`}>
              <span className="up-step-num">3</span>
              <span className="up-step-body">
                <b>Open the studio</b>
                <span className="smb-t3 text-xs">{ready ? "Preview it, set the title and upload." : "Pick a beat and artwork first."}</span>
              </span>
              <Button onClick={() => setStudioOpen(true)} disabled={!ready} className="smb-btn smb-btn--pri smb-btn--sm">
                Enter Studio <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="smb-t3 text-xs">Drop files on a box or click it to choose. GIF artwork loops in the rendered video.</p>
        </>
      ) : (
        <div className="up-connect">
          <Youtube className="h-6 w-6 smb-t2" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <b>Connect YouTube first</b>
            <p className="smb-t2 text-sm">Connect the channel you want this beat published to, then pick your beat and artwork.</p>
          </div>
          <Button onClick={onConnectYouTube} className="smb-btn smb-btn--pri smb-btn--sm">
            Connect YouTube Account
          </Button>
        </div>
      )}

      {running ? (
        <div className="up-job">
          <div className="smb-meter-row">
            <b>YouTube upload {currentUploadJob.status === "queued" ? "queued" : "running"}</b>
            <span className="smb-meter-value">{progress}%</span>
          </div>
          <span className="smb-bar">
            <span className="smb-bar-fill smb-bar-fill--acc" style={{ width: `${progress}%` }} />
          </span>
          <div className="smb-meter-row">
            <span className="smb-mono smb-t3 text-xs">{uploadJobStage || currentUploadJob.message || "Rendering and uploading in the background."}</span>
            {uploadJobElapsed ? <span className="smb-mono smb-t3 text-xs">{uploadJobElapsed}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
};

const Picker = ({ id, step, title, formats, accept, Icon, active, setActive, onFile, status, chosen }) => (
  <label
    htmlFor={id}
    className={`up-step ${active ? "is-active" : ""} ${chosen ? "is-done" : ""}`}
    onDragOver={(e) => {
      e.preventDefault();
      setActive(true);
    }}
    onDragLeave={() => setActive(false)}
    onDrop={(e) => {
      e.preventDefault();
      setActive(false);
      onFile(e.dataTransfer.files[0]);
    }}
  >
    <input type="file" id={id} accept={accept} className="hidden" onChange={(e) => onFile(e.target.files[0])} />
    <span className="up-step-num">{chosen ? <Check className="h-3.5 w-3.5" /> : step}</span>
    <span className="up-step-body">
      <b>
        <Icon className="inline h-4 w-4 mr-1.5 -mt-0.5" aria-hidden="true" />
        {title}
      </b>
      <span className={`text-xs truncate ${chosen ? "" : "smb-t3"}`}>{status || chosen || formats}</span>
    </span>
    <span className="up-step-action">{chosen ? "Change" : "Choose"}</span>
  </label>
);

export default UploadDashboard;
