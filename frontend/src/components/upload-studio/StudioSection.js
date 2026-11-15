import React, { useId } from "react";
import { ChevronDown } from "lucide-react";

// One look for every block in Upload Studio: an icon chip, a title, a one-line summary, and an
// optional switch or chevron on the right. Collapsible sections open and close from the header.

export const StudioSwitch = ({ checked, onChange, label, disabled = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    className={`us-switch ${checked ? "is-on" : ""}`}
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
  >
    <i aria-hidden="true" />
  </button>
);

/** Segmented choice: [{ value, label, hint? }] */
export const StudioSeg = ({ value, onChange, options, label }) => (
  <div className="us-seg" role="radiogroup" aria-label={label}>
    {options.map((o) => (
      <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? "is-active" : ""} onClick={() => onChange(o.value)} title={o.hint}>
        {o.icon ? <o.icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        {o.label}
      </button>
    ))}
  </div>
);

const StudioSection = ({ icon: Icon, title, summary, action = null, collapsible = false, open = true, onToggle, tone = "default", children, className = "" }) => {
  const bodyId = useId();
  const showBody = !collapsible || open;
  const head = (
    <>
      {Icon ? (
        <span className={`us-chip us-chip--${tone}`} aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <span className="us-head-text">
        <span className="us-title">{title}</span>
        {summary ? <span className="us-summary">{summary}</span> : null}
      </span>
    </>
  );
  return (
    <section className={`us-sec ${showBody ? "is-open" : ""} ${className}`}>
      <div className="us-head">
        {collapsible ? (
          <button type="button" className="us-head-btn" onClick={() => onToggle?.(!open)} aria-expanded={open} aria-controls={bodyId}>
            {head}
            <ChevronDown className={`us-chevron h-4 w-4 ${open ? "is-open" : ""}`} aria-hidden="true" />
          </button>
        ) : (
          <div className="us-head-btn is-static">{head}</div>
        )}
        {action ? <div className="us-head-action">{action}</div> : null}
      </div>
      {showBody && children ? (
        <div className="us-body" id={bodyId}>
          {children}
        </div>
      ) : null}
    </section>
  );
};

export default StudioSection;
