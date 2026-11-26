import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import TOUR_STEPS from "@/components/tour/tourSteps";
import "@/styles/tour.css";

// A guided tour of the signed-in site: the page dims, the part being explained is lit up, and
// a card beside it says what it's for. Targets are found by data-tour attributes (see
// tourSteps.js). On phones the card docks to the top or bottom of the screen, away from the
// lit part. Esc skips, the arrow keys step through.

const PAD = 8; // space between the lit part and its outline
const GAP = 14; // space between the lit part and the card
const EDGE = 12; // closest the card gets to the window edge
const PHONE = 860; // matches the site's phone layout breakpoint

const isVisible = (el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  const style = window.getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
};

export const findTarget = (step) => {
  if (!step?.targets?.length) return null;
  for (const name of step.targets) {
    const matches = document.querySelectorAll(`[data-tour="${name}"]`);
    for (const el of matches) if (isVisible(el)) return el;
  }
  return null;
};

const sameRect = (a, b) =>
  a && b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 &&
  Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Where the lit part sits on screen, clipped to the window so a tall section still reads.
const spotFor = (rect, vw, vh) => {
  if (!rect) return null;
  const top = Math.max(rect.top - PAD, 6);
  const left = Math.max(rect.left - PAD, 6);
  const bottom = Math.min(rect.bottom + PAD, vh - 6);
  const right = Math.min(rect.right + PAD, vw - 6);
  if (bottom - top < 8 || right - left < 8) return null;
  return { top, left, width: right - left, height: bottom - top };
};

// Where the card goes: beside the lit part on desktop, docked top or bottom on phones.
const placeCard = (spot, card, vw, vh) => {
  const w = card.width;
  const h = card.height;
  if (vw <= PHONE) {
    if (!spot) return { mode: "dock-bottom" };
    const spotMiddle = spot.top + spot.height / 2;
    return { mode: spotMiddle > vh * 0.5 ? "dock-top" : "dock-bottom" };
  }
  if (!spot) return { mode: "center" };
  const clampX = (x) => Math.min(Math.max(x, EDGE), vw - w - EDGE);
  const clampY = (y) => Math.min(Math.max(y, EDGE), vh - h - EDGE);
  const spaceRight = vw - (spot.left + spot.width);
  const spaceBelow = vh - (spot.top + spot.height);
  // Tall and narrow, or in the sidebar: beside it.
  if ((spot.height > spot.width || spot.left + spot.width <= 280) && spaceRight >= w + GAP + EDGE) {
    return { mode: "float", side: "right", left: spot.left + spot.width + GAP, top: clampY(spot.top) };
  }
  if (spaceBelow >= h + GAP + EDGE) {
    return { mode: "float", side: "below", left: clampX(spot.left), top: spot.top + spot.height + GAP };
  }
  if (spot.top >= h + GAP + EDGE) {
    return { mode: "float", side: "above", left: clampX(spot.left), top: spot.top - h - GAP };
  }
  if (spaceRight >= w + GAP + EDGE) {
    return { mode: "float", side: "right", left: spot.left + spot.width + GAP, top: clampY(spot.top) };
  }
  if (spot.left >= w + GAP + EDGE) {
    return { mode: "float", side: "left", left: spot.left - w - GAP, top: clampY(spot.top) };
  }
  // Fills the screen: sit inside it, at the bottom.
  return { mode: "float", side: "inside", left: clampX(spot.left + spot.width - w - GAP), top: vh - h - EDGE - 8 };
};

const ProductTour = ({ open, steps = TOUR_STEPS, onClose, onStep, startAt = 0 }) => {
  const [index, setIndex] = useState(startAt);
  const [rect, setRect] = useState(null);
  const [viewport, setViewport] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const [cardSize, setCardSize] = useState({ width: 380, height: 220 });
  const cardRef = useRef(null);
  const primaryRef = useRef(null);
  const scrolledFor = useRef(-1);
  const restoreFocus = useRef(null);

  const step = steps[index];
  const last = index === steps.length - 1;
  const first = index === 0;

  // Opening: start from the first step and remember what had focus.
  useEffect(() => {
    if (!open) return undefined;
    restoreFocus.current = document.activeElement;
    setIndex(startAt);
    scrolledFor.current = -1;
    return () => {
      const el = restoreFocus.current;
      if (el && typeof el.focus === "function") el.focus({ preventScroll: true });
    };
  }, [open, startAt]);

  // Let the page get ready for the step (switch tabs) before we look for its target.
  useEffect(() => {
    if (open && step && onStep) onStep(step, index);
  }, [open, index]);

  // Follow the target as the page scrolls, resizes or re-renders.
  useEffect(() => {
    if (!open) return undefined;
    let frame = 0;
    let prev = null;
    const tick = () => {
      const el = findTarget(step);
      if (el && scrolledFor.current !== index) {
        scrolledFor.current = index;
        const r = el.getBoundingClientRect();
        const tall = r.height > window.innerHeight * 0.7;
        el.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: tall || step.align === "start" ? "start" : "center",
        });
      }
      const next = el ? el.getBoundingClientRect() : null;
      const plain = next ? { top: next.top, left: next.left, width: next.width, height: next.height, bottom: next.bottom, right: next.right } : null;
      if (!(plain === null && prev === null) && !sameRect(plain, prev)) {
        prev = plain;
        setRect(plain);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [open, index, step]);

  useEffect(() => {
    if (!open) return undefined;
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    if (Math.abs(r.width - cardSize.width) > 1 || Math.abs(r.height - cardSize.height) > 1) {
      setCardSize({ width: r.width, height: r.height });
    }
  });

  // Each step puts focus on its main button, so Enter keeps going.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => primaryRef.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(t);
  }, [open, index]);

  const finish = useCallback((completed) => onClose?.({ completed, stepId: step?.id }), [onClose, step]);
  const next = useCallback(() => (last ? finish(true) : setIndex((i) => Math.min(i + 1, steps.length - 1))), [last, finish, steps.length]);
  const back = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish(false);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      } else if (event.key === "Tab" && cardRef.current) {
        // Keep Tab inside the card.
        const items = cardRef.current.querySelectorAll("button:not([disabled])");
        if (!items.length) return;
        const firstItem = items[0];
        const lastItem = items[items.length - 1];
        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault();
          lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault();
          firstItem.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish, next, back]);

  if (!open || !step) return null;

  const spot = spotFor(rect, viewport.w, viewport.h);
  const place = placeCard(spot, cardSize, viewport.w, viewport.h);
  const cardStyle = place.mode === "float" ? { top: place.top, left: place.left } : undefined;
  const count = String(steps.length).padStart(2, "0");
  const num = String(index + 1).padStart(2, "0");
  const titleId = `smb-tour-title-${step.id}`;

  return createPortal(
    <div className="smb-tour" data-testid="product-tour">
      {/* Clicks outside the card do nothing, so the page can't change under the tour. */}
      <div className={`smb-tour-scrim ${spot ? "has-spot" : ""}`} aria-hidden="true" />
      {spot ? (
        <div
          className="smb-tour-spot"
          aria-hidden="true"
          style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        />
      ) : null}

      <div
        ref={cardRef}
        className={`smb-tour-card smb-tour-card--${place.mode} ${place.side ? `is-${place.side}` : ""}`}
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="smb-tour-top">
          <span className="smb-tour-kicker">
            <span className="smb-tour-count">{num}<i>/{count}</i></span>
            {step.kicker}
          </span>
          {!last ? (
            <button type="button" className="smb-tour-skip" onClick={() => finish(false)} aria-label="Skip the tour">
              Skip <X aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="smb-tour-copy" key={step.id}>
          <h2 id={titleId} className="smb-tour-title">{step.title}</h2>
          <p className="smb-tour-body">{step.body}</p>
        </div>

        <div className="smb-tour-foot">
          <div className="smb-tour-dots" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.id} className={i === index ? "is-on" : i < index ? "is-past" : ""} />
            ))}
          </div>
          <div className="smb-tour-actions">
            {first ? (
              <button type="button" className="smb-btn smb-btn--ghost smb-btn--sm" onClick={() => finish(false)}>
                Not now
              </button>
            ) : (
              <button type="button" className="smb-btn smb-btn--sec smb-btn--sm" onClick={back} aria-label="Back">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button ref={primaryRef} type="button" className="smb-btn smb-btn--pri smb-btn--sm" onClick={next} data-testid="tour-next">
              {first ? "Show me around" : last ? "Done" : "Next"}
              {!last ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
            </button>
          </div>
        </div>
        <p className="smb-tour-sr" aria-live="polite">{`Step ${index + 1} of ${steps.length}: ${step.title}`}</p>
      </div>
    </div>,
    document.body,
  );
};

export default ProductTour;
