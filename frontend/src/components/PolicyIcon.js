// An icon in a small accent tile, for the About, Privacy and Terms pages.
// The tile is a span around the svg (not padding on the svg itself), because
// Safari on iPhone ignores padding on an svg and drew the icons as empty circles.
const PolicyIcon = ({ icon: Icon, className = "" }) => (
  <span className={`policy-icon ${className}`.trim()} aria-hidden="true">
    <Icon strokeWidth={2} />
  </span>
);

export default PolicyIcon;
