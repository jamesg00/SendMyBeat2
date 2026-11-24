import React, { useState } from "react";
import { ChevronDown, ImageUp, Lock, Music } from "lucide-react";
import { Input } from "@/components/ui/input";
import StudioSection, { StudioSeg, StudioSwitch } from "@/components/upload-studio/StudioSection";
import { VISUALIZER_STYLES, canUsePremiumVisualizers } from "@/lib/constants";
import { STYLE_KIND } from "@/lib/visualizerStyles";
import { isPremiumMode, isV2Mode, v2HasCover } from "@/lib/viz2";

// Visualizer: pick a style, then tune its look and the effects around it.
// Laid out as plain rows so it reads the same in a wide panel, a narrow one, and the phone drawer.

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic", ".heif"];

// A small picture of each style for its tile.
const GLYPHS = {
  circle: (
    <>
      <circle cx="24" cy="15" r="5.5" fill="currentColor" opacity="0.35" />
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const len = 3 + (i % 3) * 2;
        return <line key={i} x1={24 + Math.cos(a) * 7.5} y1={15 + Math.sin(a) * 7.5} x2={24 + Math.cos(a) * (7.5 + len)} y2={15 + Math.sin(a) * (7.5 + len)} />;
      })}
    </>
  ),
  monstercat: [4, 9, 15, 11, 7, 12, 6, 9, 5, 7, 4, 6].map((h, i) => <rect key={i} x={3 + i * 3.6} y={27 - h} width="2.6" height={h} fill="currentColor" stroke="none" />),
  spectrum: [3, 6, 9, 12, 8, 12, 9, 6, 3].map((h, i) => (
    <g key={i}>
      <rect x={6 + i * 4.2} y={18 - h} width="2.6" height={h} rx="1.3" fill="currentColor" stroke="none" />
      <rect x={6 + i * 4.2} y={19.5} width="2.6" height={h * 0.45} fill="currentColor" stroke="none" opacity="0.3" />
    </g>
  )),
  proximity: [2, 4, 7, 10, 12, 10, 7, 4, 2].map((h, i) => <line key={i} x1={8 + i * 4} y1={15 - h} x2={8 + i * 4} y2={15 + h} />),
  blob: (
    <>
      <path d="M24 3c7 0 13 4 13 12s-5 13-13 12S10 23 11 15 17 3 24 3z" fill="currentColor" opacity="0.3" stroke="none" />
      <circle cx="24" cy="15" r="6" fill="currentColor" stroke="none" />
    </>
  ),
  wave: (
    <>
      <path d="M2 15c5-12 9 12 14 0s9 12 14 0 9 10 16 0" fill="none" />
      <path d="M2 15c5-7 9 7 14 0s9 7 14 0 9 6 16 0" fill="none" opacity="0.4" />
    </>
  ),
  mirror: [5, 8, 6, 9, 7, 9, 6, 8, 5].map((h, i) => (
    <g key={i}>
      <rect x={5 + i * 4.3} y={0} width="3" height={h} fill="currentColor" stroke="none" />
      <rect x={5 + i * 4.3} y={30 - h} width="3" height={h} fill="currentColor" stroke="none" />
    </g>
  )),
  dots: (
    <>
      <circle cx="24" cy="15" r="4.5" fill="currentColor" opacity="0.35" stroke="none" />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return [8, 11, 14].slice(0, 1 + (i % 3)).map((r) => <circle key={`${i}-${r}`} cx={24 + Math.cos(a) * r} cy={15 + Math.sin(a) * r} r="1" fill="currentColor" stroke="none" />);
      })}
    </>
  ),
};

// Styles with a drawn icon in public/visualizer-icons (the Pro styles and the four redrawn free ones).
const ICON_MODES = new Set(VISUALIZER_STYLES.filter((item) => item.premium || isV2Mode(item.mode)).map((item) => item.mode));

const StyleTile = ({ item, active, locked, onPick }) => (
  <button
    type="button"
    role="radio"
    aria-checked={active}
    className={`vz-style ${active ? "is-active" : ""} ${locked ? "is-locked" : ""}`}
    onClick={onPick}
    title={locked ? `${item.blurb}. Pro style: Plus or Max` : item.blurb}
  >
    {ICON_MODES.has(item.mode) ? (
      <img className="vz-style-icon" src={`/visualizer-icons/${item.mode}.png`} alt="" aria-hidden="true" loading="lazy" draggable="false" />
    ) : (
      <svg viewBox="0 0 48 30" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        {GLYPHS[item.mode]}
      </svg>
    )}
    <b>{item.name}</b>
    {locked ? (
      <span className="vz-style-lock" aria-label="Pro">
        <Lock className="h-3 w-3" aria-hidden="true" />
      </span>
    ) : null}
  </button>
);

const Group = ({ title, children }) => (
  <div className="vz-group">
    <p className="us-label">{title}</p>
    <div className="vz-rows">{children}</div>
  </div>
);

/** Label on the left, a small control on the right. */
const Row = ({ label, hint, children }) => (
  <div className="vz-row">
    <span className="vz-row-text">
      <b>{label}</b>
      {hint ? <span>{hint}</span> : null}
    </span>
    <span className="vz-row-control">{children}</span>
  </div>
);

const Slider = ({ label, value, min, max, step, onChange, format = (v) => v }) => (
  <label className="vz-slider">
    <span className="vz-slider-head">
      <b>{label}</b>
      <span>{format(value)}</span>
    </span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} className="studio-slider ft-range" />
  </label>
);

const Swatch = ({ value, onChange, label }) => (
  <label className="vz-swatch" title={label}>
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
    <span style={{ background: value }} aria-hidden="true" />
  </label>
);

const pct = (v) => `${Math.round(v * 100)}%`;

const VisualizerSettings = ({
  visualizerEnabled,
  setVisualizerEnabled,
  visualizerSettings,
  setVisualizerSettings,
  applyVisualizerPreset,
  handleCenterVisualizerImageUpload,
  centerVisualizerImageName,
  centerVisualizerImageInputRef,
  subscriptionStatus,
}) => {
  const s = visualizerSettings;
  const set = (patch) => setVisualizerSettings((prev) => ({ ...prev, ...patch }));
  const [advanced, setAdvanced] = useState(false);
  const style = VISUALIZER_STYLES.find((item) => item.mode === s.mode) || VISUALIZER_STYLES[0];
  // New styles (the Pro ones and the redrawn NCS, Monstercat, Spectrum, Proximity) draw from the
  // beat engine and only use colours, Reactivity and the logo; the old bar controls don't apply.
  const v2 = isV2Mode(s.mode);
  const premium = isPremiumMode(s.mode);
  const kind = v2 ? (s.mode === "circle" ? "ring" : "v2") : STYLE_KIND[s.mode] || "ring";
  const ring = kind === "ring";
  const monstercat = kind === "monstercat";
  const hasLogo = v2 ? v2HasCover(s.mode) : ring;
  const proAllowed = canUsePremiumVisualizers(subscriptionStatus);
  const freeStyles = VISUALIZER_STYLES.filter((item) => !item.premium);
  const proStyles = VISUALIZER_STYLES.filter((item) => item.premium);

  return (
    <StudioSection
      icon={Music}
      tone="purple"
      title="Visualizer"
      summary={visualizerEnabled ? `${style.name} · ${style.blurb.toLowerCase()}` : "Off. Add bars that move with the beat"}
      action={<StudioSwitch checked={visualizerEnabled} onChange={setVisualizerEnabled} label="Visualizer" />}
    >
      {visualizerEnabled ? (
        <>
          <Group title="Style">
            <div className="vz-styles" role="radiogroup" aria-label="Free visualizer styles">
              {freeStyles.map((item) => (
                <StyleTile key={item.mode} item={item} active={s.mode === item.mode} onPick={() => applyVisualizerPreset(item.preset)} />
              ))}
            </div>
            <p className="us-label vz-pro-label">Pro{proAllowed ? "" : " · Plus and Max"}</p>
            <div className="vz-styles" role="radiogroup" aria-label="Pro visualizer styles">
              {proStyles.map((item) => (
                <StyleTile key={item.mode} item={item} active={s.mode === item.mode} locked={!proAllowed} onPick={() => applyVisualizerPreset(item.preset)} />
              ))}
            </div>
            <p className="us-hint">
              {style.blurb}. Picking a style resets it to its recommended look.
              {premium && !proAllowed ? " You can try Pro styles here; uploading with one needs Plus or Max." : ""}
            </p>
          </Group>

          <Group title="Look">
            {v2 ? (
              <Row label={premium ? "Main colour" : "Colour"} hint={premium ? "The brightest parts" : "Lines and shapes"}>
                <Swatch label="Visualizer colour" value={s.spectrumColor} onChange={(v) => set({ spectrumColor: v })} />
              </Row>
            ) : (
              <Row label="Colour" hint={s.multiColorReactive ? "Rainbow: colour follows loudness" : "Bars and shapes"}>
                {!s.multiColorReactive ? <Swatch label="Visualizer colour" value={s.spectrumColor} onChange={(v) => set({ spectrumColor: v })} /> : null}
                <span className="vz-inline-label">Rainbow</span>
                <StudioSwitch label="Rainbow colours" checked={Boolean(s.multiColorReactive)} onChange={(v) => set({ multiColorReactive: v, spectrumRgb: v })} />
              </Row>
            )}
            {premium ? (
              <Row label="Second colour" hint="Depth and the quieter parts">
                <Swatch label="Second colour" value={s.particleColor} onChange={(v) => set({ particleColor: v })} />
              </Row>
            ) : !v2 ? (
              <Row label="Glow colour" hint="Glow, halo and stars">
                <Swatch label="Glow colour" value={s.particleColor} onChange={(v) => set({ particleColor: v })} />
              </Row>
            ) : null}
            <Slider label="Reactivity" value={s.intensity} min={0.5} max={2} step={0.05} onChange={(v) => set({ intensity: v })} format={(v) => `${v.toFixed(2)}×`} />
            {ring ? (
              <div className="vz-two">
                <Slider label="Logo size" value={s.radius} min={0.1} max={0.34} step={0.01} onChange={(v) => set({ radius: v })} format={pct} />
                <Slider label="Reach" value={s.maxBarLength} min={0.06} max={0.34} step={0.01} onChange={(v) => set({ maxBarLength: v })} format={pct} />
              </div>
            ) : null}
            {s.mode === "spectrum" && !v2 ? (
              <div className="vz-two">
                <Slider label="Bar width" value={s.spectrumBarThickness} min={2} max={16} step={1} onChange={(v) => set({ spectrumBarThickness: v })} format={(v) => `${v}px`} />
                <Slider label="Glow" value={s.spectrumGlow} min={0} max={48} step={1} onChange={(v) => set({ spectrumGlow: v })} />
              </div>
            ) : null}
            {monstercat ? (
              <div className="vz-two">
                <Slider label="Height from bottom" value={s.monstercatYOffset} min={0} max={320} step={5} onChange={(v) => set({ monstercatYOffset: v })} format={(v) => `${v}px`} />
                <Slider label="Gap between bars" value={s.monstercatSpacing} min={0} max={12} step={0.5} onChange={(v) => set({ monstercatSpacing: v })} format={(v) => v.toFixed(1)} />
              </div>
            ) : null}
          </Group>

          {hasLogo ? (
            <Group title="Logo">
              <div className="us-field">
                <StudioSeg
                  label="What's in the middle"
                  value={s.fillCenter === "white" ? "color" : s.fillCenter}
                  onChange={(v) => set({ fillCenter: v })}
                  options={[
                    { value: "image", label: "Picture" },
                    { value: "color", label: "Colour" },
                    { value: "transparent", label: "See-through" },
                  ]}
                />
              </div>
              {s.fillCenter === "image" ? (
                <>
                  <Row label="Picture" hint={centerVisualizerImageName || "Your cover art"}>
                    <Input ref={centerVisualizerImageInputRef} type="file" accept={IMAGE_EXTENSIONS.join(",")} className="hidden" onChange={handleCenterVisualizerImageUpload} />
                    <button type="button" className="us-pill-btn" onClick={() => centerVisualizerImageInputRef.current?.click()}>
                      <ImageUp className="h-3.5 w-3.5" aria-hidden="true" /> Upload logo
                    </button>
                  </Row>
                  {!v2 ? (
                    <Row label="Spin the picture">
                      <StudioSwitch label="Spin the picture" checked={Boolean(s.centerImageSpin)} onChange={(v) => set({ centerImageSpin: v })} />
                    </Row>
                  ) : null}
                </>
              ) : null}
              {s.fillCenter === "color" || s.fillCenter === "white" ? (
                <Row label="Fill colour">
                  <Swatch label="Centre colour" value={s.fillCenterColor} onChange={(v) => set({ fillCenterColor: v })} />
                </Row>
              ) : null}
              {s.fillCenter !== "transparent" ? (
                <Row label="Outline">
                  {s.spectrumBorderEnabled && !v2 ? <Swatch label="Outline colour" value={s.spectrumBorderColor} onChange={(v) => set({ spectrumBorderColor: v })} /> : null}
                  <StudioSwitch label="Outline around the logo" checked={Boolean(s.spectrumBorderEnabled)} onChange={(v) => set({ spectrumBorderEnabled: v })} />
                </Row>
              ) : null}
            </Group>
          ) : null}

          <Group title="Effects">
            {v2 ? null : monstercat ? (
              <Row label="Sparks" hint="Streaks flying across the bars">
                <StudioSwitch label="Sparks" checked={Boolean(s.monstercatParticleEnabled)} onChange={(v) => set({ monstercatParticleEnabled: v })} />
              </Row>
            ) : (
              <>
                <Row label="Stars" hint="Fly out toward the camera, faster on bass">
                  <StudioSwitch label="Stars" checked={Boolean(s.particleEnabled)} onChange={(v) => set({ particleEnabled: v })} />
                </Row>
                {s.particleEnabled ? (
                  <>
                    <Slider label="How many stars" value={s.particleIntensity} min={0.1} max={2} step={0.1} onChange={(v) => set({ particleIntensity: v })} format={(v) => `${v.toFixed(1)}×`} />
                    <Row label="Speed streaks">
                      <StudioSwitch label="Speed streaks" checked={s.trailsEnabled !== false} onChange={(v) => set({ trailsEnabled: v })} />
                    </Row>
                  </>
                ) : null}
              </>
            )}
            <Slider label="Artwork zoom on the kick" value={s.fxZoomPulse ?? 0} min={0} max={1} step={0.05} onChange={(v) => set({ fxZoomPulse: v })} format={(v) => (v ? pct(v) : "Off")} />
            {!monstercat && !v2 ? <Slider label="Shake" value={s.shakeIntensity} min={0} max={2} step={0.05} onChange={(v) => set({ shakeIntensity: v })} format={(v) => (v ? `${v.toFixed(2)}×` : "Off")} /> : null}
            {!v2 ? (
              <Row label="Flash on hard hits">
                <StudioSwitch label="Flash on hard hits" checked={Boolean(s.fxFlash)} onChange={(v) => set({ fxFlash: v })} />
              </Row>
            ) : null}
            <Row label="Dark corners">
              <StudioSwitch label="Dark corners" checked={Boolean(s.fxVignette)} onChange={(v) => set({ fxVignette: v })} />
            </Row>
            <Slider label="Artwork brightness" value={s.backgroundOpacity ?? 1} min={0.2} max={1} step={0.05} onChange={(v) => set({ backgroundOpacity: v })} format={pct} />
          </Group>

          {v2 ? null : (
          <div className="vz-group">
            <button type="button" className="vz-advanced" onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced}>
              Fine tuning
              <ChevronDown className={`us-chevron h-4 w-4 ${advanced ? "is-open" : ""}`} aria-hidden="true" />
            </button>
            {advanced ? (
              <div className="vz-rows">
                <Slider label="Number of bars" value={s.bars} min={32} max={160} step={4} onChange={(v) => set({ bars: v })} />
                <div className="vz-two">
                  <Slider label="Bass" value={s.lowSensitivity ?? 1} min={0.4} max={2} step={0.05} onChange={(v) => set({ lowSensitivity: v })} format={(v) => `${v.toFixed(2)}×`} />
                  <Slider label="Mids" value={s.midSensitivity ?? 1} min={0.4} max={2} step={0.05} onChange={(v) => set({ midSensitivity: v })} format={(v) => `${v.toFixed(2)}×`} />
                </div>
                <Slider label="Highs" value={s.highSensitivity ?? 1} min={0.4} max={2} step={0.05} onChange={(v) => set({ highSensitivity: v })} format={(v) => `${v.toFixed(2)}×`} />
                {s.mode === "spectrum" ? (
                  <>
                    <Row label="Bass in the middle" hint="Off: bass on the left">
                      <StudioSwitch label="Mirror the bars" checked={s.spectrumMirror !== false} onChange={(v) => set({ spectrumMirror: v })} />
                    </Row>
                    <div className="vz-two">
                      <Slider label="Smoothing" value={s.spectrumSmoothing ?? 0.3} min={0.05} max={0.9} step={0.05} onChange={(v) => set({ spectrumSmoothing: v })} format={(v) => v.toFixed(2)} />
                      <Slider label="Opacity" value={s.spectrumOpacity ?? 1} min={0.1} max={1} step={0.05} onChange={(v) => set({ spectrumOpacity: v })} format={pct} />
                    </div>
                  </>
                ) : null}
                {monstercat ? (
                  <>
                    <div className="vz-two">
                      <Slider label="Glow" value={s.monstercatGlow} min={0} max={36} step={1} onChange={(v) => set({ monstercatGlow: v })} />
                      <Slider label="Smoothing" value={s.monstercatSmoothing ?? 0.35} min={0.05} max={0.9} step={0.05} onChange={(v) => set({ monstercatSmoothing: v })} format={(v) => v.toFixed(2)} />
                    </div>
                    {s.monstercatParticleEnabled ? (
                      <>
                        <div className="vz-two">
                          <Slider label="Spark speed" value={s.monstercatParticleSpeed} min={0.2} max={3.5} step={0.1} onChange={(v) => set({ monstercatParticleSpeed: v })} format={(v) => `${v.toFixed(1)}×`} />
                          <Slider label="Spark size" value={s.monstercatParticleSize} min={0.4} max={4} step={0.1} onChange={(v) => set({ monstercatParticleSize: v })} format={(v) => `${v.toFixed(1)}×`} />
                        </div>
                        <Slider label="Most sparks at once" value={s.monstercatParticleCount} min={120} max={3000} step={20} onChange={(v) => set({ monstercatParticleCount: v })} />
                      </>
                    ) : null}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          )}
        </>
      ) : null}
    </StudioSection>
  );
};

export default VisualizerSettings;
