import React, { useEffect, useState } from "react";
import axios from "axios";
import { BadgeCheck, ChevronRight, FileText, Info, LogOut, Shield, Star } from "lucide-react";
import { toast } from "sonner";
import { API } from "@/App";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import StylePlanCard from "@/components/pros/StylePlanCard";
import { apiError, useStylePlan } from "@/components/pros/prosData";

// The rest of the app's Profile tab: your credits, style plan, verification, bug reports and
// ideas, supporting SendMyBeat, and the account links.

const VERSION = "1.0.0";
const dollars = (cents) => `$${(cents / 100).toFixed(cents % 100 ? 2 : 0)}`;

const Usage = ({ label, left, total }) => (
  <div className="smb-meter">
    <div className="smb-meter-row">
      <span className="smb-meter-label">{label}</span>
      <span className="smb-meter-value">
        {left}/{total}
      </span>
    </div>
    <span className="smb-bar">
      <span className="smb-bar-fill" style={{ width: `${total > 0 ? Math.min(100, (left / total) * 100) : 0}%` }} />
    </span>
  </div>
);

export const CreditsCard = ({ subscription, onPlans }) => {
  if (!subscription) return null;
  const s = subscription;
  return (
    <section className="smb-card">
      <div className="smb-card-head">
        <h2 className="smb-card-title">Credits</h2>
        <span className="smb-mono smb-t3 text-xs">{s.trial ? "resets every day" : s.is_subscribed ? "resets every month" : "no plan yet"}</span>
      </div>
      {s.is_subscribed ? (
        <>
          <Usage label={s.trial ? "AI generations today" : "AI generations this month"} left={s.daily_credits_remaining} total={s.daily_credits_total} />
          <Usage label={s.trial ? "Uploads today" : "Uploads this month"} left={s.upload_credits_remaining} total={s.upload_credits_total} />
          {s.trial && s.trial_ends_at ? (
            <p className="smb-t2 text-sm">Your free trial ends {new Date(s.trial_ends_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}, then Plus at $5/month.</p>
          ) : null}
        </>
      ) : (
        <p className="smb-t2 text-sm">
          {s.trial_available ? "Try everything free for 3 days: 3 generations and 3 uploads a day." : "Plus is 50 generations and 50 uploads a month for $5. Pro is 100 of each for $10."}
        </p>
      )}
      {!s.pro_access ? (
        <Button onClick={onPlans} className="smb-btn smb-btn--pri smb-btn--full">
          {!s.is_subscribed ? (s.trial_available ? "Start your 3-day free trial" : "Choose a plan") : "Upgrade to Pro: 100 of each, $10/mo"}
        </Button>
      ) : null}
    </section>
  );
};

const VERIFICATION = {
  none: ["Not verified", "Verified producers get a check next to their name in Spotlight."],
  pending: ["Under review", "We're checking your request. Your profile gets the check as soon as it's approved."],
  approved: ["Verified", "Your Spotlight profile shows the check next to your name."],
  rejected: ["Not approved", "Your last request wasn't approved. You can send a new one from your Spotlight profile."],
};

export const VerificationCard = ({ onOpenSpotlight }) => {
  const [me, setMe] = useState(null);
  useEffect(() => {
    axios.get(`${API}/producers/me`).then((r) => setMe(r.data), () => setMe(null));
  }, []);
  const status = me?.verification_status || "none";
  const [title, body] = VERIFICATION[status] || VERIFICATION.none;
  return (
    <section className="smb-card">
      <div className="smb-card-head">
        <h2 className="smb-card-title">Verification</h2>
        <span className={`smb-pill ${status === "approved" ? "smb-pill--ok" : status === "pending" ? "smb-pill--warn" : status === "rejected" ? "smb-pill--bad" : ""}`}>
          {status === "approved" ? <BadgeCheck className="h-3 w-3" /> : null}
          {title}
        </span>
      </div>
      <p className="smb-t2 text-sm">
        {body}
        {status === "rejected" && me?.verification_note ? ` Note: ${me.verification_note}` : ""}
      </p>
      {status === "none" || status === "rejected" ? (
        <Button onClick={onOpenSpotlight} className="smb-btn smb-btn--sec smb-btn--full">
          Request it from your Spotlight profile
        </Button>
      ) : null}
    </section>
  );
};

const SCREENS = ["Create", "Upload Studio", "Spotlight", "Analytics", "Pros", "Profile", "Plans", "Other"];
const COPY = {
  bug: { prompt: "What went wrong?", placeholder: "What did you click, what did you expect, and what happened instead?", thanks: "Thanks for the report. We'll look into it." },
  idea: { prompt: "What would you like to see?", placeholder: "Describe the feature and how it would help your uploads.", thanks: "Thanks for the idea. We read every one." },
};
const STATUS_LABEL = { new: "Sent", planned: "Planned", fixed: "Fixed", closed: "Closed" };

export const FeedbackCard = () => {
  const [kind, setKind] = useState("bug");
  const [screen, setScreen] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState([]);
  const copy = COPY[kind];
  const ready = message.trim().length >= 5;

  const loadMine = () => axios.get(`${API}/feedback/mine`).then((r) => setMine(r.data?.items || []), () => {});
  useEffect(() => {
    loadMine();
  }, []);

  const send = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      await axios.post(`${API}/feedback`, { kind, message: message.trim(), screen: screen || undefined, app_version: VERSION, platform: "web", device: navigator.userAgent.slice(0, 180) });
      toast.success(copy.thanks);
      setMessage("");
      setScreen(null);
      loadMine();
    } catch (error) {
      toast.error(apiError(error, "Could not send it. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="smb-card smb-span-2">
      <div className="smb-card-head">
        <h2 className="smb-card-title">Report a bug or suggest an idea</h2>
        <div className="pro-seg" role="tablist" aria-label="Kind">
          {[
            ["bug", "Bug"],
            ["idea", "Idea"],
          ].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={kind === id} className={kind === id ? "is-active" : ""} onClick={() => setKind(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className="smb-eyebrow">{kind === "bug" ? "Where did it happen?" : "Where would it go?"} (optional)</p>
        <div className="pf-chips">
          {SCREENS.map((name) => (
            <button key={name} type="button" role="checkbox" aria-checked={screen === name} className={`pf-chip ${screen === name ? "is-active" : ""}`} onClick={() => setScreen(screen === name ? null : name)}>
              {name}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="feedback-message" className="smb-eyebrow block">{copy.prompt}</label>
        <Textarea id="feedback-message" rows={4} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={copy.placeholder} />
        <p className="smb-t3 text-xs">We'll include your browser type. No passwords or personal details, please.</p>
      </div>
      <Button onClick={send} disabled={!ready || busy} className="smb-btn smb-btn--pri">
        {busy ? "Sending…" : kind === "bug" ? "Send report" : "Send idea"}
      </Button>
      {mine.length ? (
        <div>
          <p className="smb-eyebrow">What you've sent</p>
          <div className="pro-rows">
            {mine.slice(0, 6).map((item) => (
              <div key={item.id} className="pro-row">
                <span className="flex-1 min-w-0">
                  <span className="block line-clamp-2">{item.message}</span>
                  <span className="smb-mono smb-t3 text-xs">
                    {item.kind === "bug" ? "Bug" : "Idea"}
                    {item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString("en", { month: "short", day: "numeric" })}` : ""}
                  </span>
                </span>
                <span className={`smb-pill ${item.status === "fixed" || item.status === "planned" ? "smb-pill--ok" : ""}`}>{STATUS_LABEL[item.status] || item.status}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export const SupportCard = ({ subscription, onFounding }) => {
  const [config, setConfig] = useState(null);
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    axios.get(`${API}/subscription/config`).then((r) => setConfig(r.data), () => setConfig(null));
  }, []);
  const founding = config?.founding;
  const tips = config?.tip_amounts_cents || [];
  const spots = subscription?.founding_spots_left;
  if (!founding && !tips.length) return null;

  const tip = async (cents) => {
    setBusy(cents);
    try {
      const res = await axios.post(`${API}/support/tip`, { amount_cents: cents, success_url: `${window.location.origin}/dashboard?tab=settings`, cancel_url: `${window.location.origin}/dashboard?tab=settings` });
      window.location.href = res.data.checkout_url;
    } catch (error) {
      toast.error(apiError(error, "Could not open checkout"));
      setBusy(null);
    }
  };

  return (
    <section className="smb-card">
      <div className="smb-card-head">
        <h2 className="smb-card-title">Support SendMyBeat</h2>
        {founding && spots != null ? <span className="smb-mono smb-t3 text-xs">{spots > 0 ? `${spots} of ${founding.limit} founding spots left` : "founding spots all taken"}</span> : null}
      </div>
      <p className="smb-t2 text-sm">Early support pays for building the iPhone app and keeps SendMyBeat going.</p>
      {founding ? (
        subscription?.founding_member ? (
          <p className="smb-acc text-sm font-semibold">You're a founding member. Thank you.</p>
        ) : spots === 0 ? null : (
          <>
            <Button onClick={onFounding} className="smb-btn smb-btn--pri smb-btn--full">
              Founding member: a year of Pro for {dollars(founding.price_cents)}
            </Button>
            <p className="smb-t3 text-xs">Normally $120. If you already pay for a plan, it switches to this one.</p>
          </>
        )
      ) : null}
      {tips.length ? (
        <>
          <div className="flex gap-2">
            {tips.map((cents) => (
              <Button key={cents} onClick={() => tip(cents)} disabled={busy !== null} className="smb-btn smb-btn--sec flex-1">
                {busy === cents ? "…" : `Tip ${dollars(cents)}`}
              </Button>
            ))}
          </div>
          <p className="smb-t3 text-xs">A one-time payment. It doesn't change your plan.</p>
        </>
      ) : null}
    </section>
  );
};

export const StylePlanSection = () => {
  const { plan, setPlan } = useStylePlan();
  if (!plan) return null;
  return (
    <div className="smb-span-2">
      <StylePlanCard plan={plan} onChange={setPlan} full />
    </div>
  );
};

export const AccountLinksCard = ({ onNavigate, onLogout }) => (
  <section className="smb-card">
    <div className="smb-card-head">
      <h2 className="smb-card-title">Account</h2>
      <span className="smb-mono smb-t3 text-xs">SendMyBeat {VERSION}</span>
    </div>
    <div className="pf-rows">
      {[
        ["/spotlight", "My Spotlight profile", Star],
        ["/about", "About", Info],
        ["/privacy-policy", "Privacy policy", Shield],
        ["/terms", "Terms", FileText],
      ].map(([path, label, Icon]) => (
        <button key={path} type="button" className="pf-row" onClick={() => onNavigate(path)}>
          <Icon className="smb-ico" aria-hidden="true" />
          <span className="flex-1">{label}</span>
          <ChevronRight className="h-4 w-4 smb-t3" aria-hidden="true" />
        </button>
      ))}
      <button type="button" className="pf-row smb-danger" onClick={onLogout}>
        <LogOut className="smb-ico" aria-hidden="true" style={{ color: "inherit" }} />
        <span className="flex-1">Log out</span>
      </button>
    </div>
  </section>
);
