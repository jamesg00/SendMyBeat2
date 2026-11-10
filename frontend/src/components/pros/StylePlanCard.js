import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { apiError, endStylePlan, tickPlanStep } from "@/components/pros/prosData";

// Your style plan: a compact card (Workflow, Spotlight) or the full checklist (Profile).

const Ring = ({ value, label, size = 56 }) => {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  return (
    <span className="pro-ring" style={{ width: size, height: size }} aria-label={label}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-line-soft)" strokeWidth={stroke} />
        {value > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--c-acc)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${Math.min(1, value) * len} ${len}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </svg>
      <b>{label}</b>
    </span>
  );
};

const stepMeta = (step) => (step.target ? `${step.count || 0}/${step.target} · from your uploads` : step.done ? "Done" : "Tick it when done");

const StylePlanCard = ({ plan, onChange, full = false }) => {
  const [busy, setBusy] = useState(null);

  const tick = async (step) => {
    if (step.kind !== "manual" || busy) return;
    setBusy(step.id);
    try {
      onChange(await tickPlanStep(step.id, !step.done));
    } catch (error) {
      toast.error(apiError(error, "Could not save that step"));
    } finally {
      setBusy(null);
    }
  };

  const end = async () => {
    if (!window.confirm(`End your ${plan.pro_name} plan? Your ticked steps are cleared.`)) return;
    try {
      await endStylePlan();
      onChange(null);
      toast.success("Plan ended");
    } catch (error) {
      toast.error(apiError(error, "Could not end the plan"));
    }
  };

  return (
    <section className="pro-plan">
      <Link to={`/pros/${plan.pro_id}`} className="pro-plan-head">
        <Ring value={plan.total ? plan.done / plan.total : 0} label={`${plan.done}/${plan.total}`} />
        <span className="min-w-0 flex-1">
          <span className="smb-eyebrow smb-acc block">Your plan · {plan.pro_name}'s style</span>
          <span className="pro-plan-next">{plan.next ? plan.next.text : "Every step done"}</span>
        </span>
        <ChevronRight className="h-5 w-5 smb-t3" aria-hidden="true" />
      </Link>

      {full ? (
        <ul className="pro-plan-steps">
          {plan.steps.map((step) => {
            const manual = step.kind === "manual";
            return (
              <li key={step.id}>
                <button
                  type="button"
                  role={manual ? "checkbox" : undefined}
                  aria-checked={manual ? step.done : undefined}
                  disabled={!manual || busy === step.id}
                  onClick={() => tick(step)}
                  className={`pro-plan-step ${step.done ? "is-done" : ""}`}
                >
                  <span className="pro-check">{step.done ? <Check className="h-3 w-3" /> : null}</span>
                  <span className="min-w-0">
                    <span className="block">{step.text}</span>
                    <span className="smb-mono smb-t3 text-xs">
                      {step.move} · {busy === step.id ? "Saving…" : stepMeta(step)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          <li>
            <button type="button" className="pro-plan-end" onClick={end}>End this plan</button>
          </li>
        </ul>
      ) : plan.next ? (
        plan.next.target ? (
          <div className="space-y-2">
            <span className="smb-bar">
              <span className="smb-bar-fill smb-bar-fill--acc" style={{ width: `${Math.min(100, ((plan.next.count || 0) / plan.next.target) * 100)}%` }} />
            </span>
            <p className="smb-t2 text-sm">
              {plan.next.count || 0} of {plan.next.target} so far · ticks off from your uploads
            </p>
          </div>
        ) : (
          <p className="smb-t2 text-sm">Tick this off in Profile when it's done.</p>
        )
      ) : (
        <p className="smb-t2 text-sm">Pick another producer in Spotlight → Pros to keep going.</p>
      )}
    </section>
  );
};

export default StylePlanCard;
