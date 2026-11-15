import React, { useEffect, useState } from "react";
import {
  Crosshair,
  Expand,
  FlipHorizontal2,
  FlipVertical2,
  ImageUp,
  Link2,
  Lock,
  Maximize2,
  Move,
  Redo2,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Undo2,
  Unlink2,
  Unlock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { POS_LIMIT, SCALE_MAX, SCALE_MIN } from "@/components/upload-studio/FreeTransform";
import StudioSection from "@/components/upload-studio/StudioSection";

// Image Settings: turns on free transform on the preview and gives exact controls beside it.

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic", ".heif"];

const ToolBtn = ({ icon: Icon, label, onClick, active = false, disabled = false }) => (
  <button type="button" className={`ft-tool ${active ? "is-active" : ""}`} onClick={onClick} disabled={disabled} title={label} aria-label={label} aria-pressed={active || undefined}>
    <Icon className="h-4 w-4" aria-hidden="true" />
  </button>
);

/** A number box that edits on Enter/blur and shows the live value otherwise. */
const NumBox = ({ label, value, suffix, min, max, step = 1, onCommit, disabled }) => {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  const commit = () => {
    const v = parseFloat(text);
    if (!Number.isNaN(v)) onCommit(Math.min(max, Math.max(min, v)));
    else setText(String(value));
  };
  return (
    <label className="ft-num">
      <span className="ft-num-label">{label}</span>
      <span className="ft-num-box">
        <Input
          inputMode="decimal"
          value={text}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              const v = (parseFloat(text) || 0) + (e.key === "ArrowUp" ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
              onCommit(Math.min(max, Math.max(min, v)));
            }
          }}
        />
        <span className="ft-num-suffix">{suffix}</span>
      </span>
    </label>
  );
};

const ImageEditorControls = ({
  imageSettingsOpen,
  setImageSettingsOpen,
  applyImageSettings,
  handleImageUpload,
  studioImageInputRef,
  transform,
  setTransform,
  pushHistory,
  undo,
  redo,
  canUndo,
  canRedo,
  lockImageScale,
  setLockImageScale,
  centerLockEnabled,
  setCenterLockEnabled,
  imageRatio,
  frameRatio,
}) => {
  const t = transform;
  const change = (patch) => {
    pushHistory();
    setTransform({ ...t, ...patch });
  };
  const pct = (v) => Math.round(v * 100);

  // Width/height in % of the fitted size. With proportions kept, one drives the other.
  const setW = (v) => {
    const sx = v / 100;
    change(lockImageScale ? { sx, sy: t.sy * (sx / t.sx) } : { sx });
  };
  const setH = (v) => {
    const sy = v / 100;
    change(lockImageScale ? { sy, sx: t.sx * (sy / t.sy) } : { sy });
  };
  // Fill: cover the whole frame (no bars), keeping the picture's proportions.
  const fill = () => {
    const r = imageRatio > 0 ? imageRatio : frameRatio;
    const s = r >= frameRatio ? r / frameRatio : frameRatio / r;
    change({ sx: s, sy: s, posX: 0, posY: 0, rot: 0 });
  };
  const rotateBy = (deg) => change({ rot: ((((t.rot + deg + 180) % 360) + 360) % 360) - 180 });

  return (
    <StudioSection
      icon={Move}
      tone="pink"
      title="Image"
      className="ft-panel"
      summary={imageSettingsOpen ? "Drag on the preview to move, stretch and rotate" : `W ${pct(t.sx)}% · H ${pct(t.sy)}% · ${Math.round(t.rot)}°${t.flipH || t.flipV ? " · flipped" : ""}`}
      action={
        imageSettingsOpen ? (
          <button type="button" className="smb-btn smb-btn--pri smb-btn--sm" onClick={applyImageSettings}>
            Done
          </button>
        ) : (
          <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={() => setImageSettingsOpen(true)}>
            <Expand className="h-4 w-4" aria-hidden="true" /> Transform
          </button>
        )
      }
    >
      <Input ref={studioImageInputRef} type="file" accept={IMAGE_EXTENSIONS.join(",")} className="hidden" onChange={(e) => handleImageUpload(e.target.files?.[0])} />

      {!imageSettingsOpen ? (
        <div className="ft-summary">
          <button type="button" className="us-pill-btn" onClick={() => studioImageInputRef.current?.click()}>
            <ImageUp className="h-3.5 w-3.5" aria-hidden="true" /> Change photo
          </button>
          <button type="button" className="us-pill-btn" onClick={() => setImageSettingsOpen(true)}>
            <Expand className="h-3.5 w-3.5" aria-hidden="true" /> Stretch, rotate or flip
          </button>
        </div>
      ) : (
        <>
          <div className="ft-toolbar" role="toolbar" aria-label="Image tools">
            <div className="ft-tool-group">
              <ToolBtn icon={Undo2} label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo} />
              <ToolBtn icon={Redo2} label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo} />
            </div>
            <div className="ft-tool-group">
              <ToolBtn icon={RotateCcw} label="Rotate left 90°" onClick={() => rotateBy(-90)} />
              <ToolBtn icon={RotateCw} label="Rotate right 90°" onClick={() => rotateBy(90)} />
              <ToolBtn icon={FlipHorizontal2} label="Flip horizontally" active={t.flipH} onClick={() => change({ flipH: !t.flipH })} />
              <ToolBtn icon={FlipVertical2} label="Flip vertically" active={t.flipV} onClick={() => change({ flipV: !t.flipV })} />
            </div>
            <div className="ft-tool-group">
              <ToolBtn icon={Maximize2} label="Fit inside the frame" onClick={() => change({ sx: 1, sy: 1, posX: 0, posY: 0, rot: 0 })} />
              <ToolBtn icon={Expand} label="Fill the frame" onClick={fill} />
              <ToolBtn icon={Crosshair} label="Center" onClick={() => change({ posX: 0, posY: 0 })} />
              <ToolBtn icon={RefreshCcw} label="Reset everything" onClick={() => change({ sx: 1, sy: 1, posX: 0, posY: 0, rot: 0, flipH: false, flipV: false })} />
            </div>
          </div>

          <div className="ft-fields">
            <div className="ft-pair">
              <NumBox label="W" suffix="%" value={pct(t.sx)} min={SCALE_MIN * 100} max={SCALE_MAX * 100} onCommit={setW} />
              <button
                type="button"
                className={`ft-chain ${lockImageScale ? "is-active" : ""}`}
                onClick={() => setLockImageScale(!lockImageScale)}
                title={lockImageScale ? "Proportions kept: corners scale evenly (Shift frees them)" : "Free: stretch and squash each side (Shift keeps proportions)"}
                aria-label="Keep proportions"
                aria-pressed={lockImageScale}
              >
                {lockImageScale ? <Link2 className="h-4 w-4" /> : <Unlink2 className="h-4 w-4" />}
              </button>
              <NumBox label="H" suffix="%" value={pct(t.sy)} min={SCALE_MIN * 100} max={SCALE_MAX * 100} onCommit={setH} />
            </div>
            <div className="ft-pair">
              <NumBox label="X" suffix="%" value={Math.round(t.posX * 50)} min={-POS_LIMIT * 50} max={POS_LIMIT * 50} disabled={centerLockEnabled} onCommit={(v) => change({ posX: v / 50 })} />
              <span className="ft-chain-gap" />
              <NumBox label="Y" suffix="%" value={Math.round(t.posY * 50)} min={-POS_LIMIT * 50} max={POS_LIMIT * 50} disabled={centerLockEnabled} onCommit={(v) => change({ posY: v / 50 })} />
            </div>
          </div>

          <div className="ft-rotate">
            <span className="ft-num-label">Rotate</span>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={Math.round(t.rot)}
              onPointerDown={pushHistory}
              onKeyDown={pushHistory}
              onChange={(e) => setTransform({ ...t, rot: parseFloat(e.target.value) })}
              className="studio-slider ft-range"
              aria-label="Rotation in degrees"
            />
            <NumBox label="" suffix="°" value={Math.round(t.rot)} min={-180} max={180} onCommit={(v) => change({ rot: v })} />
          </div>

          <div className="ft-actions">
            <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={() => studioImageInputRef.current?.click()}>
              <ImageUp className="h-4 w-4" aria-hidden="true" /> Change photo
            </button>
            <button
              type="button"
              className={`smb-btn smb-btn--sm ${centerLockEnabled ? "smb-btn--pri" : "smb-btn--sec"}`}
              onClick={() => {
                const next = !centerLockEnabled;
                if (next) change({ posX: 0, posY: 0 });
                setCenterLockEnabled(next);
              }}
              aria-pressed={centerLockEnabled}
            >
              {centerLockEnabled ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Unlock className="h-4 w-4" aria-hidden="true" />}
              {centerLockEnabled ? "Position locked" : "Lock position"}
            </button>
          </div>

          <ul className="ft-tips">
            <li><b>Drag</b> the picture to move it. It snaps to the centre and edges (hold Ctrl to stop).</li>
            <li><b>Side handles</b> stretch or squash one side (Shift scales evenly). <b>Corners</b> scale, keeping proportions while the link is on; Shift flips that, Alt scales from the centre.</li>
            <li><b>The round knob</b> rotates (Shift snaps to 15°). On a phone, pinch to scale and twist to rotate.</li>
          </ul>
        </>
      )}
    </StudioSection>
  );
};

export default ImageEditorControls;
