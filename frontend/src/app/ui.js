import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// The app's building blocks on the web: same names and looks as mobile/src/components/ui.tsx.
// Styles live in theme.css (the s-* classes).

export const cx = (...parts) => parts.filter(Boolean).join(" ");

export function Screen({ title, icon, accessory, wide, children }) {
  return (
    <main className={cx("s-screen", wide && "s-screen--wide")}>
      <div className="s-title-row">
        <h1 className="s-title">
          {icon}
          {title}
        </h1>
        {accessory}
      </div>
      {children}
    </main>
  );
}

export function Card({ children, className, style }) {
  return (
    <section className={cx("s-card", className)} style={style}>
      {children}
    </section>
  );
}

export function SectionLabel({ children, right }) {
  return (
    <div className="s-row-between" style={{ padding: "0 2px" }}>
      <span className="s-label">{children}</span>
      {right}
    </div>
  );
}

/** Primary is white-on-black like the app's; mint stays for status. */
export function Button({ title, children, variant = "primary", size = "lg", block, className, ...props }) {
  const Tag = props.href ? "a" : "button";
  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      className={cx("s-btn", variant !== "primary" && `s-btn--${variant}`, size !== "lg" && `s-btn--${size}`, block && "s-btn--block", className)}
      {...props}>
      {title ?? children}
    </Tag>
  );
}

/** iOS-style segmented control: a thumb glides between the options. */
export function Segmented({ options, value, onChange, compact, label }) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className={cx("s-seg", compact && "s-seg--compact")} role="tablist" aria-label={label}>
      <span className="s-seg-thumb" style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${index * 100}%)` }} />
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ListGroup({ children }) {
  return <div className="s-list">{children}</div>;
}

export function ListRow({ title, subtitle, value, left, right, onClick, href, external, height }) {
  const Tag = href ? "a" : onClick ? "button" : "div";
  const link = href ? { href, ...(external ? { target: "_blank", rel: "noopener noreferrer" } : null) } : null;
  return (
    <Tag className="s-row" type={Tag === "button" ? "button" : undefined} onClick={onClick} style={height ? { minHeight: height } : undefined} {...link}>
      {left}
      <span className="s-row-main">
        <span>{title}</span>
        {subtitle ? <span className="s-sub">{subtitle}</span> : null}
      </span>
      {value ? <span className="s-row-value">{value}</span> : null}
      {right}
      {(onClick || href) && !right ? <span className="s-chevron">{external ? "↗" : "›"}</span> : null}
    </Tag>
  );
}

export function Pill({ label, tone = "accent", onClick }) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag className={cx("s-pill", tone === "muted" && "s-pill--muted")} onClick={onClick} type={onClick ? "button" : undefined}>
      {label}
    </Tag>
  );
}

export function Meter({ value, color, height = 2 }) {
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <div className="s-meter" style={{ height }} role="presentation">
      <span style={{ width: `${v * 100}%`, background: color }} />
    </div>
  );
}

export const Spinner = () => <span className="s-spinner" role="status" aria-label="Loading" />;

const clock = (sec) => {
  const t = Math.max(0, Math.floor(sec));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// Live progress for a background job, shown like a deploy log. Servers report progress in big
// jumps, so the bar also creeps forward on an eased estimate from elapsed time.
export function JobProgress({ title, startedAt, expectedSec, progress = 0, message, steps, onCancel }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(t);
  }, []);
  const elapsed = (now - startedAt) / 1000;
  const estimate = 95 * (1 - Math.exp(-elapsed / (expectedSec * 0.6)));
  const pct = Math.min(97, Math.max(progress, estimate));
  const left = Math.max(0, expectedSec - elapsed);
  const per = steps?.length ? expectedSec / steps.length : 0;
  const current = steps?.length ? Math.min(steps.length - 1, Math.floor(elapsed / per)) : 0;
  const lines = steps?.length
    ? steps.map((label, i) => ({ label, at: i * per, state: i < current ? "done" : i === current ? "now" : "next" }))
    : [{ label: message ?? "Working…", at: 0, state: "now" }];

  return (
    <div className="s-job" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={title}>
      <div className="s-job-head">
        <span className="s-truncate">{title}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <Meter value={pct / 100} />
      <div className="s-log">
        {lines.slice(0, current + 2).map((l) => (
          <div key={l.label} className={l.state}>
            <span className="tm">{l.state === "next" ? "--:--" : clock(l.at)}</span>
            <span className="mk">{l.state === "done" ? "✓" : l.state === "now" ? "●" : "○"}</span>
            <span className="s-truncate">{l.label}</span>
          </div>
        ))}
      </div>
      <div className="s-row-between">
        <span className="s-hint">{left > 1 ? `~${clock(left)} left` : `${clock(elapsed)} elapsed`}</span>
        {onCancel ? (
          <button type="button" className="s-link s-sub" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** The SendMyBeat app icon, with the same rounded corners as on the home screen. */
export function AppIcon({ size = 32 }) {
  return <img src="/icon.png" alt="SendMyBeat" width={size} height={size} style={{ borderRadius: size * 0.225, flex: "none" }} />;
}

/** A bottom sheet on phones, a centered dialog on wide screens. Escape or a click outside closes it. */
export function Sheet({ open, onClose, wide, label, children }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);
  useLayoutEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="s-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={cx("s-sheet", wide && "s-sheet--wide")} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <span className="s-grabber" />
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** What a screen still needs: a bar that fills as items get done, and one chip per item. */
export function Checklist({ title = "BEFORE YOU SUBMIT", items }) {
  const required = items.filter((i) => !i.optional);
  const left = required.filter((i) => !i.done);
  const summary = left.length ? `${required.length - left.length} of ${required.length} ready · add ${left[0].label.toLowerCase()}` : "All set";
  return (
    <div className="s-stack" style={{ gap: 8 }}>
      <div className="s-row-between" style={{ alignItems: "baseline" }}>
        <span className="s-section" style={{ fontSize: 10.5, letterSpacing: 0.5 }}>
          {title}
        </span>
        <span className={left.length ? "s-muted" : "s-ok"} style={{ fontSize: 12, fontWeight: left.length ? 400 : 700 }}>
          {summary}
        </span>
      </div>
      <div className="s-check-bar">
        {required.map((i) => (
          <span key={i.label} className={i.done ? "on" : undefined} />
        ))}
      </div>
      <div className="s-chips">
        {items.map((i) => {
          const tappable = !i.done && !!i.onClick;
          const Tag = tappable ? "button" : "span";
          return (
            <Tag key={i.label} type={tappable ? "button" : undefined} onClick={tappable ? i.onClick : undefined} className={cx("s-check-chip", i.done ? "done" : !i.optional && "todo")}>
              <span className="s-check-mark">{i.done ? "✓" : null}</span>
              <span>
                {i.label}
                {i.optional && !i.done ? <span style={{ color: "var(--t3)" }}> · optional</span> : null}
              </span>
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

/** Drawn play / pause glyph. */
export function PlayPauseIcon({ playing, size = 12, color = "var(--on-primary)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      {playing ? (
        <>
          <rect x={2} y={1} width={3} height={10} rx={0.8} fill={color} />
          <rect x={7} y={1} width={3} height={10} rx={0.8} fill={color} />
        </>
      ) : (
        <path d="M3.2 1.4 L10.6 6 L3.2 10.6 Z" fill={color} />
      )}
    </svg>
  );
}

/** A ring that fills to `value` (0-1) with a label in the middle. */
export function Ring({ value, size, stroke, label, sub }) {
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} aria-label={sub ? `${label} ${sub}` : label}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line-soft)" strokeWidth={stroke} fill="none" />
        {value > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--acc)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${Math.min(1, value) * len} ${len}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </svg>
      <span className="s-display" style={{ fontSize: size * 0.24, lineHeight: 1.1 }}>
        {label}
      </span>
      {sub ? <span style={{ color: "var(--t3)", font: `400 ${Math.max(10, size * 0.1)}px var(--mono)` }}>{sub}</span> : null}
    </div>
  );
}

export const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** Open a link from a profile, but only real web pages. */
export const safeLink = (url) => (url && /^https?:\/\/[^\s]+$/i.test(String(url).trim()) ? String(url).trim() : undefined);
