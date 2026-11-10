import React from "react";

import { Button, Meter } from "@/app/ui";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".m4a", ".flac", ".ogg"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic", ".heif"];

// The start of Upload Studio: pick the beat and the artwork, then open the studio.
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

  return (
    <section className="s-card" style={{ gap: 14 }}>
      <div className="s-row-between">
        <span className="s-card-title">Upload Studio</span>
        <span className="s-mono">beat + artwork → YouTube video</span>
      </div>

      {youtubeConnected ? (
        <div className="s-pickers">
          <Picker
            id="audio-input"
            title="Beat"
            formats="mp3 · wav · m4a · flac · ogg"
            accept={AUDIO_EXTENSIONS.join(",")}
            active={isAudioDragActive}
            setActive={setIsAudioDragActive}
            onFile={handleAudioUpload}
            status={uploadingAudio ? `Uploading… ${uploadProgress}%` : null}
            chosen={audioFile?.name}
            icon={<path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />}
          />
          <Picker
            id="image-input"
            title="Artwork"
            formats="jpg · png · webp · gif"
            accept={IMAGE_EXTENSIONS.join(",")}
            active={isImageDragActive}
            setActive={setIsImageDragActive}
            onFile={handleImageUpload}
            status={uploadingImage ? "Uploading…" : null}
            chosen={hasImageReady ? selectedImageLabel || imageFile?.name || "Artwork ready" : null}
            icon={
              <>
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="9" cy="10" r="1.6" />
                <path d="M4 18l5-5 4 4 3-3 4 4" />
              </>
            }
          />
        </div>
      ) : (
        <div className="s-stack" style={{ gap: 10, alignItems: "flex-start" }}>
          <p className="s-body">Connect the YouTube channel you want this beat published to, then pick your beat and artwork.</p>
          <Button title="Connect YouTube" size="md" onClick={onConnectYouTube} />
        </div>
      )}

      {running ? (
        <div className="s-job" style={{ background: "var(--card2)" }}>
          <div className="s-job-head">
            <span>YouTube upload {currentUploadJob.status === "queued" ? "queued" : "running"}</span>
            <span>{progress}%</span>
          </div>
          <Meter value={progress / 100} />
          <div className="s-row-between">
            <span className="s-hint s-truncate">{uploadJobStage || currentUploadJob.message || "Rendering and uploading in the background."}</span>
            {uploadJobElapsed ? <span className="s-hint">{uploadJobElapsed}</span> : null}
          </div>
        </div>
      ) : null}

      {ready ? <Button title="Open Upload Studio" onClick={() => setStudioOpen(true)} /> : youtubeConnected ? <p className="s-muted">Drop files on the boxes or click to choose. GIF artwork loops in the rendered video.</p> : null}
    </section>
  );
};

function Picker({ id, title, formats, accept, active, setActive, onFile, status, chosen, icon }) {
  return (
    <label
      htmlFor={id}
      className={`s-picker${active ? " s-picker--active" : ""}${chosen ? " s-picker--done" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
        onFile(e.dataTransfer.files[0]);
      }}>
      <input type="file" id={id} accept={accept} hidden onChange={(e) => onFile(e.target.files[0])} />
      <span className="s-tile s-tile--line">
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={chosen ? "var(--acc)" : "var(--text)"} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {icon}
        </svg>
      </span>
      <span className="s-row-main">
        <span style={{ fontSize: 15, fontWeight: 500 }}>{title}</span>
        <span className="s-hint s-truncate" style={chosen ? { color: "var(--text)" } : undefined}>
          {status || chosen || formats}
        </span>
      </span>
      <span style={{ color: chosen ? "var(--acc)" : "var(--text)", fontSize: 14 }}>{chosen ? "✓" : "Choose"}</span>
    </label>
  );
}

export default UploadDashboard;
