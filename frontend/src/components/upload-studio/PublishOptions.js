import React, { useRef } from "react";
import { CalendarClock, ImagePlus, ListMusic, Languages, X } from "lucide-react";

// Publishing extras under Details: schedule, artist playlist, custom thumbnail and language.
// The server checks every value again; anything that fails after the video is up only warns.

export const LANGUAGES = [
  { value: "", label: "Not set" },
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "hi", label: "Hindi" },
];

// "2026-12-01T18:00" in the viewer's time, 15 minutes from now at the earliest.
const toLocalInput = (date) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const scheduleError = (value) => {
  if (!value) return "";
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return "Pick a date and time.";
  if (when.getTime() < Date.now() + 15 * 60 * 1000) return "Schedule it at least 15 minutes from now.";
  if (when.getTime() > Date.now() + 180 * 24 * 3600 * 1000) return "Schedule it within the next 180 days.";
  return "";
};

const PublishOptions = ({
  publishAt,
  setPublishAt,
  playlistMode,
  setPlaylistMode,
  defaultLanguage,
  setDefaultLanguage,
  thumbnailName,
  onPickThumbnail,
  onClearThumbnail,
  uploadingThumbnail = false,
  playlistsAllowed = false,
  customThumbnailsAllowed = null,
  onAllowPlaylists,
  hasTagRun = false,
}) => {
  const thumbInput = useRef(null);
  const scheduling = Boolean(publishAt);
  const error = scheduleError(publishAt);
  const minValue = toLocalInput(new Date(Date.now() + 16 * 60 * 1000));

  return (
    <div className="po" aria-label="Publishing">
      <div className="po-row">
        <span className="po-icon" aria-hidden="true"><CalendarClock className="h-4 w-4" /></span>
        <div className="po-body">
          <label className="po-switch">
            <input
              type="checkbox"
              checked={scheduling}
              onChange={(e) => setPublishAt(e.target.checked ? toLocalInput(new Date(Date.now() + 24 * 3600 * 1000)) : "")}
            />
            <span>Schedule it</span>
          </label>
          {scheduling ? (
            <>
              <input
                type="datetime-local"
                className="us-input po-date"
                value={publishAt}
                min={minValue}
                onChange={(e) => setPublishAt(e.target.value)}
                aria-label="Publish time"
              />
              <p className={`po-hint ${error ? "is-error" : ""}`}>
                {error || "It uploads now as private, and YouTube makes it public at this time."}
              </p>
            </>
          ) : (
            <p className="po-hint">Off: it goes out with the visibility above as soon as it's uploaded.</p>
          )}
        </div>
      </div>

      <div className="po-row">
        <span className="po-icon" aria-hidden="true"><ListMusic className="h-4 w-4" /></span>
        <div className="po-body">
          <label className="po-switch">
            <input
              type="checkbox"
              checked={playlistMode === "artist"}
              disabled={!playlistsAllowed}
              onChange={(e) => setPlaylistMode(e.target.checked ? "artist" : "none")}
            />
            <span>Add to the artist's playlist</span>
          </label>
          {playlistsAllowed ? (
            <p className="po-hint">
              {hasTagRun ? "Files it under “Artist Type Beats”, making that playlist the first time." : "Pick a tag run so we know which artist."}
            </p>
          ) : (
            <p className="po-hint">
              YouTube needs your OK to manage playlists.{" "}
              <button type="button" className="po-link" onClick={onAllowPlaylists}>Allow playlists</button>
            </p>
          )}
        </div>
      </div>

      {customThumbnailsAllowed !== false ? (
        <div className="po-row">
          <span className="po-icon" aria-hidden="true"><ImagePlus className="h-4 w-4" /></span>
          <div className="po-body">
            <span className="po-title">Custom thumbnail</span>
            {thumbnailName ? (
              <div className="po-file">
                <span className="po-file-name">{thumbnailName}</span>
                <button type="button" className="po-icon-btn" onClick={onClearThumbnail} aria-label="Remove custom thumbnail">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button type="button" className="us-pill-btn po-pick" onClick={() => thumbInput.current?.click()} disabled={uploadingThumbnail}>
                {uploadingThumbnail ? "Uploading…" : "Choose image"}
              </button>
            )}
            <p className="po-hint">Optional. Without one, YouTube picks a frame. 1280×720 works best.</p>
            <input
              ref={thumbInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onPickThumbnail(file);
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="po-row">
        <span className="po-icon" aria-hidden="true"><Languages className="h-4 w-4" /></span>
        <div className="po-body">
          <label className="po-title" htmlFor="po-language">Language</label>
          <select id="po-language" className="us-input po-select" value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.value || "none"} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default PublishOptions;
