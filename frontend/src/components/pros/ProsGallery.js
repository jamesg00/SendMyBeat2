import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Check, Copy, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import StylePlanCard from "@/components/pros/StylePlanCard";
import { compactNumber, fetchPros, plansHref, useLoad, useProAccess, useStylePlan } from "@/components/pros/prosData";

// The Pros section of Spotlight: producers who blew up on YouTube, who you're closest to, and
// your current style plan (the app's Pros tab).

export const proPhotoCredit = (pro) =>
  pro.photo_source === "press" ? pro.photo_credit || "Press photo" : pro.photo_source === "youtube" ? "YouTube channel" : pro.photo_source === "video" ? "From their top upload" : null;

/** Big picture fading into the card, with the name and stats on the fade. */
export const ProHero = ({ pro, tall = false, children }) => {
  const credit = proPhotoCredit(pro);
  return (
    <div className={`pro-hero ${tall ? "pro-hero--tall" : ""}`}>
      {pro.photo ? (
        <img src={pro.photo} alt={pro.photo_source === "press" ? `${pro.name}, ${credit}` : `${pro.name}'s picture from YouTube`} loading="lazy" />
      ) : (
        <span className="pro-hero-mono" aria-hidden="true">{pro.name.slice(0, 1)}</span>
      )}
      <div className="pro-hero-chips">
        <span>{pro.group}</span>
        {credit ? <span>{credit}</span> : null}
      </div>
      <div className="pro-hero-body">{children}</div>
    </div>
  );
};

const PRO_PERKS = [
  "Each pro's full story, their moves and latest uploads",
  "The title formula, upload rhythm and best days behind their channel",
  "How close your uploads are to their style, and the gaps to close",
  "A 14-day plan that copies their moves, with the plan agent to do steps for you",
];

/** What free accounts see instead of Pro screens. */
export const ProPaywall = ({ status, title = "Pros is part of Pro", lead }) => (
  <section className="smb-card pro-paywall">
    <span className="pro-paywall-icon" aria-hidden="true">
      <Lock className="h-5 w-5" />
    </span>
    <div className="min-w-0 space-y-1">
      <p className="smb-eyebrow smb-acc">Pro · $10/mo</p>
      <h3 className="pro-paywall-title">{title}</h3>
      <p className="smb-t2 text-sm">{lead || "Study the producers who blew up on YouTube and copy what worked for them."}</p>
    </div>
    <ul className="pro-paywall-perks">
      {PRO_PERKS.map((perk) => (
        <li key={perk}>
          <Check className="h-4 w-4" aria-hidden="true" />
          {perk}
        </li>
      ))}
    </ul>
    <div className="pro-paywall-cta">
      <Button asChild className="smb-btn smb-btn--pri">
        <a href={plansHref("pro")}>{status?.trial_available ? "Start free, then get Pro" : status?.is_subscribed ? "Upgrade to Pro" : "See Pro"}</a>
      </Button>
    </div>
  </section>
);

/** Free accounts: a preview of who's inside, with every door leading to Pro. */
const LockedGallery = ({ items, status }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="smb-eyebrow">Pros · {items.length} producers</p>
        <h2 className="text-3xl font-bold">They blew up on YouTube.</h2>
      </div>
      <ProPaywall status={status} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((pro) => (
          <article key={pro.id} className="pro-card pro-card--locked">
            <button type="button" className="pro-card-open" onClick={() => navigate(plansHref("pro"))} aria-label={`${pro.name}: part of Pro`}>
              <ProHero pro={pro}>
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="pro-card-name truncate">{pro.name}</h3>
                  {pro.verified ? <BadgeCheck className="h-5 w-5 flex-shrink-0" aria-label="Verified channel" /> : null}
                </div>
                <p className="pro-card-why">{pro.why || pro.tagline}</p>
                <span className="smb-pill pro-lock-pill">
                  <Lock className="h-3 w-3" aria-hidden="true" /> Pro
                </span>
              </ProHero>
            </button>
          </article>
        ))}
      </div>
    </div>
  );
};

const ProsGallery = () => {
  const navigate = useNavigate();
  const pros = useLoad(fetchPros);
  const { plan, setPlan } = useStylePlan();
  const { proAccess, checking, status } = useProAccess();
  const [hovered, setHovered] = useState(null);

  const copyStyle = (id) => navigate(proAccess ? `/pros/${id}/plan` : plansHref("pro"));

  if (checking || (pros.loading && !pros.data)) {
    return <p className="smb-t3 text-sm">Loading the pros…</p>;
  }
  if (pros.error && !pros.data) {
    return (
      <section className="smb-card">
        <p className="smb-danger text-sm">{pros.error}</p>
        <Button onClick={pros.reload} className="smb-btn smb-btn--sec smb-btn--sm">Try again</Button>
      </section>
    );
  }

  const items = pros.data || [];
  if (!proAccess || items.some((p) => p.locked)) return <LockedGallery items={items} status={status} />;
  const closest = items.filter((p) => p.match != null).sort((a, b) => (b.match || 0) - (a.match || 0));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="smb-eyebrow">Pros · {items.length} producers</p>
        <h2 className="text-3xl font-bold">They blew up on YouTube.</h2>
        <p className="smb-t2 max-w-2xl">
          See why each one grew, read their channel numbers, and copy the moves into your own uploads.
        </p>
      </div>

      {plan ? <StylePlanCard plan={plan} onChange={setPlan} /> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((pro) => (
          <article
            key={pro.id}
            className={`pro-card ${hovered === pro.id ? "is-hovered" : ""}`}
            onMouseEnter={() => setHovered(pro.id)}
            onMouseLeave={() => setHovered(null)}
          >
            <button type="button" className="pro-card-open" onClick={() => navigate(`/pros/${pro.id}`)} aria-label={`${pro.name}: ${pro.why || pro.tagline}`}>
              <ProHero pro={pro}>
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="pro-card-name truncate">{pro.name}</h3>
                  {pro.verified ? <BadgeCheck className="h-5 w-5 flex-shrink-0" aria-label="Verified channel" /> : null}
                </div>
                <p className="pro-card-why">{pro.why || pro.tagline}</p>
                <div className="pro-stats">
                  <div>
                    <b>{pro.subscribers ? compactNumber.format(pro.subscribers) : "–"}</b>
                    <small>subscribers</small>
                  </div>
                  <div>
                    <b className="smb-acc">{pro.match != null ? `${pro.match}%` : "–"}</b>
                    <small>your match</small>
                  </div>
                  <div>
                    <b className="truncate">{pro.sound?.[0] || "–"}</b>
                    <small>known for</small>
                  </div>
                </div>
              </ProHero>
            </button>
            <div className="pro-card-actions">
              <Button onClick={() => navigate(`/pros/${pro.id}`)} className="smb-btn smb-btn--pri smb-btn--sm">
                Why they blew up
              </Button>
              <Button onClick={() => copyStyle(pro.id)} className="smb-btn smb-btn--sec smb-btn--sm">
                <Copy className="h-4 w-4" />
                Copy style
              </Button>
            </div>
          </article>
        ))}
      </div>

      {closest.length ? (
        <section className="smb-card">
          <div className="smb-card-head">
            <h3 className="smb-card-title">Closest to your style</h3>
            <span className="smb-mono smb-t3 text-xs">your uploads vs their last 50</span>
          </div>
          <div className="pro-match-list">
            {closest.map((pro) => (
              <button key={pro.id} type="button" className="pro-match-row" onClick={() => navigate(`/pros/${pro.id}`)} aria-label={`${pro.name}, ${pro.match}% match`}>
                {pro.photo ? <img src={pro.photo} alt="" className="pro-match-avatar" loading="lazy" /> : <span className="pro-match-avatar" />}
                <span className="pro-match-name truncate">{pro.name}</span>
                <span className="smb-bar flex-1">
                  <span className="smb-bar-fill smb-bar-fill--acc" style={{ width: `${pro.match || 0}%` }} />
                </span>
                <span className="smb-mono pro-match-pct">{pro.match}%</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <p className="smb-t3 text-sm">Upload through SendMyBeat to see which pros your titles and rhythm are closest to.</p>
      )}
    </div>
  );
};

export default ProsGallery;
