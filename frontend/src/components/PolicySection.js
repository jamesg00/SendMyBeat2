import PolicyIcon from "@/components/PolicyIcon";

// One numbered section of the Privacy Policy or Terms, with its icon tile.
const PolicySection = ({ icon, title, children, className = "" }) => (
  <section className={className}>
    <h2 className="policy-title mb-3 flex items-center gap-3 text-lg font-semibold sm:mb-4 sm:text-xl md:text-2xl">
      <PolicyIcon icon={icon} />
      <span>{title}</span>
    </h2>
    {children}
  </section>
);

export default PolicySection;
