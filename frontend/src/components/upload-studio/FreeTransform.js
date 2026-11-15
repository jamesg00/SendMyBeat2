import React, { useCallback, useEffect, useRef, useState } from "react";

// Free transform for the artwork, like Photoshop's (ported from Clippr's image editor).
// The image is a layer on the video frame: drag inside it to move, drag a side handle to stretch or
// squash one axis (Shift scales evenly), drag a corner to scale (proportional while "Keep
// proportions" is on; Shift flips that), Alt scales from the centre, the round knob (or dragging just outside a corner) rotates and
// Shift snaps rotation to 15°. Moves snap to the frame's centre and edges (hold Ctrl to stop that).
// On touch: one finger moves, two fingers pinch to scale and twist to rotate.
//
// The transform is the one Upload Studio sends to the renderer:
//   posX / posY  centre offset from the frame centre, in half-frames (1 = centre on the right edge)
//   sx / sy      size against the "fit" size (the image contained in the frame), per axis
//   rot          degrees clockwise; flipH / flipV mirror the image

export const SCALE_MIN = 0.05;
export const SCALE_MAX = 5;
export const POS_LIMIT = 2;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rotp = (x, y, deg) => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
};
const wrapDeg = (r) => ((((r + 180) % 360) + 360) % 360) - 180;

/** The image's size when fitted inside the frame (what scale 1 means). */
export const fitSize = (frameW, frameH, ratio) => {
  const r = ratio > 0 ? ratio : frameW / frameH;
  return r >= frameW / frameH ? [frameW, frameW / r] : [frameH * r, frameH];
};

/** Bounding box of the rotated, scaled image (px). */
const bounds = (hw, hh, rot) => {
  const a = (rot * Math.PI) / 180;
  return [
    Math.abs(2 * hw * Math.cos(a)) + Math.abs(2 * hh * Math.sin(a)),
    Math.abs(2 * hw * Math.sin(a)) + Math.abs(2 * hh * Math.cos(a)),
  ];
};

const HANDLE = 9; // handle square size (px)
const HIT = 12; // hit radius around handles
const KNOB_GAP = 30; // rotate knob distance above the top edge

const FreeTransform = ({ frameW, frameH, imageRatio, imageUrl, pad = 0, value, lockAspect = true, locked = false, onChange, onGestureStart, onUndo, onRedo }) => {
  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const [hover, setHover] = useState(null);
  const [guides, setGuides] = useState([]);
  const [hud, setHud] = useState("");

  const [fitW, fitH] = fitSize(frameW, frameH, imageRatio);
  const toPx = useCallback(
    (v) => ({
      cx: frameW / 2 + (v.posX * frameW) / 2,
      cy: frameH / 2 + (v.posY * frameH) / 2,
      hw: (fitW * Math.abs(v.sx)) / 2,
      hh: (fitH * Math.abs(v.sy)) / 2,
      rot: v.rot,
    }),
    [frameW, frameH, fitW, fitH],
  );
  const fromPx = useCallback(
    (p, base) => ({
      ...base,
      posX: clamp((p.cx - frameW / 2) / (frameW / 2), -POS_LIMIT, POS_LIMIT),
      posY: clamp((p.cy - frameH / 2) / (frameH / 2), -POS_LIMIT, POS_LIMIT),
      sx: clamp((2 * p.hw) / fitW, SCALE_MIN, SCALE_MAX),
      sy: clamp((2 * p.hh) / fitH, SCALE_MIN, SCALE_MAX),
      rot: wrapDeg(p.rot),
    }),
    [frameW, frameH, fitW, fitH],
  );

  const px = toPx(value);
  const layerPt = (lx, ly, p = px) => {
    const r = rotp(lx, ly, p.rot);
    return [p.cx + r[0], p.cy + r[1]];
  };
  const toLocal = (x, y, p) => rotp(x - p.cx, y - p.cy, -p.rot);

  // Pointer position in frame px (the preview can be scaled by CSS).
  const localPoint = (e) => {
    const rect = rootRef.current.getBoundingClientRect();
    const fullW = frameW + 2 * pad;
    const fullH = frameH + 2 * pad;
    return [((e.clientX - rect.left) * fullW) / rect.width - pad, ((e.clientY - rect.top) * fullH) / rect.height - pad];
  };

  const hit = (x, y) => {
    if (locked) return { k: "none" };
    for (let hx = -1; hx <= 1; hx += 1) {
      for (let hy = -1; hy <= 1; hy += 1) {
        if (!hx && !hy) continue;
        const p = layerPt(hx * px.hw, hy * px.hh);
        if (Math.abs(p[0] - x) <= HIT && Math.abs(p[1] - y) <= HIT) return { k: "scale", hx, hy };
      }
    }
    const kn = layerPt(0, -px.hh - KNOB_GAP);
    if (Math.hypot(kn[0] - x, kn[1] - y) <= HIT + 2) return { k: "rotate" };
    const l = toLocal(x, y, px);
    if (Math.abs(l[0]) <= px.hw && Math.abs(l[1]) <= px.hh) return { k: "move" };
    for (let hx = -1; hx <= 1; hx += 2) {
      for (let hy = -1; hy <= 1; hy += 2) {
        const p = layerPt(hx * px.hw, hy * px.hh);
        if (Math.hypot(p[0] - x, p[1] - y) <= 30) return { k: "rotate" };
      }
    }
    return { k: "move" }; // anywhere else on the small preview still moves the image
  };

  const cursorFor = (h) => {
    if (!h || h.k === "none") return "default";
    if (h.k === "move") return dragRef.current ? "grabbing" : "move";
    if (h.k === "rotate") return "crosshair";
    let ang = ((Math.atan2(h.hy, h.hx) * 180) / Math.PI + px.rot) % 180;
    if (ang < 0) ang += 180;
    if (ang < 22.5 || ang >= 157.5) return "ew-resize";
    if (ang < 67.5) return "nwse-resize";
    if (ang < 112.5) return "ns-resize";
    return "nesw-resize";
  };

  // ---- gestures (same maths as Clippr's editor, in preview px)
  const scaleGesture = (p0, hx, hy, x, y, { shift, alt }) => {
    const l = toLocal(x, y, p0);
    // Corners follow the proportions lock (Shift flips it); side handles stretch or squash their
    // own side, and Shift makes them scale evenly instead.
    const prop = hx && hy ? lockAspect !== shift : shift;
    const ax = alt ? 0 : -hx * p0.hw;
    const ay = alt ? 0 : -hy * p0.hh;
    const w0 = 2 * p0.hw;
    const h0 = 2 * p0.hh;
    let w = hx ? Math.max(4, (l[0] - ax) * hx * (alt ? 2 : 1)) : w0;
    let h = hy ? Math.max(4, (l[1] - ay) * hy * (alt ? 2 : 1)) : h0;
    if (prop) {
      const fw = w / w0;
      const fh = h / h0;
      const f = hx && hy ? (Math.abs(fw - 1) >= Math.abs(fh - 1) ? fw : fh) : hx ? fw : fh;
      w = w0 * f;
      h = h0 * f;
    }
    let clx = 0;
    let cly = 0;
    if (!alt) {
      clx = hx ? ax + (hx * w) / 2 : 0;
      cly = hy ? ay + (hy * h) / 2 : 0;
    }
    const r = rotp(clx, cly, p0.rot);
    return { ...p0, hw: w / 2, hh: h / 2, cx: p0.cx + r[0], cy: p0.cy + r[1] };
  };

  const snap = (p, noSnap) => {
    if (noSnap) {
      setGuides([]);
      return p;
    }
    const [bw, bh] = bounds(p.hw, p.hh, p.rot);
    const tol = 6;
    const gs = [];
    let { cx, cy } = p;
    for (const [axis, size, span] of [["x", frameW, bw], ["y", frameH, bh]]) {
      const c = axis === "x" ? cx : cy;
      let best = null;
      for (const target of [0, size / 2, size]) {
        for (const off of [-span / 2, 0, span / 2]) {
          const d = target - (c + off);
          if (Math.abs(d) <= tol && (!best || Math.abs(d) < Math.abs(best[0]))) best = [d, target];
        }
      }
      if (best) {
        if (axis === "x") cx += best[0];
        else cy += best[0];
        gs.push({ axis, v: best[1] });
      }
    }
    setGuides(gs);
    return { ...p, cx, cy };
  };

  const emit = (p, base) => onChange(fromPx(p, base));

  const onPointerDown = (e) => {
    if (locked) return;
    e.stopPropagation();
    e.preventDefault();
    rootRef.current.setPointerCapture?.(e.pointerId);
    rootRef.current.focus({ preventScroll: true });
    const pt = localPoint(e);
    pointersRef.current.set(e.pointerId, pt);
    if (pointersRef.current.size === 2) {
      // Second finger: pinch to scale, twist to rotate.
      const [a, b] = [...pointersRef.current.values()];
      dragRef.current = { k: "pinch", p0: toPx(value), base: value, d0: Math.hypot(b[0] - a[0], b[1] - a[1]), a0: Math.atan2(b[1] - a[1], b[0] - a[0]) };
      return;
    }
    if (pointersRef.current.size > 2) return;
    const h = hit(pt[0], pt[1]);
    onGestureStart?.();
    dragRef.current = { k: h.k, h, start: pt, p0: toPx(value), base: value };
  };

  const onPointerMove = (e) => {
    const pt = localPoint(e);
    if (pointersRef.current.has(e.pointerId)) pointersRef.current.set(e.pointerId, pt);
    const d = dragRef.current;
    if (!d) {
      const h = hit(pt[0], pt[1]);
      setHover((prev) => (prev && prev.k === h.k && prev.hx === h.hx && prev.hy === h.hy ? prev : h));
      return;
    }
    e.preventDefault();
    const mods = { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey };
    const { p0, base } = d;
    if (d.k === "pinch") {
      if (pointersRef.current.size < 2) return;
      const [a, b] = [...pointersRef.current.values()];
      const f = Math.hypot(b[0] - a[0], b[1] - a[1]) / Math.max(1, d.d0);
      const turn = ((Math.atan2(b[1] - a[1], b[0] - a[0]) - d.a0) * 180) / Math.PI;
      emit({ ...p0, hw: p0.hw * f, hh: p0.hh * f, rot: p0.rot + turn }, base);
      setHud(`${Math.round(Math.abs(base.sx) * f * 100)}%  ·  ${Math.round(wrapDeg(p0.rot + turn))}°`);
      return;
    }
    if (d.k === "move") {
      let dx = pt[0] - d.start[0];
      let dy = pt[1] - d.start[1];
      if (mods.shift) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      const next = snap({ ...p0, cx: p0.cx + dx, cy: p0.cy + dy }, mods.ctrl);
      emit(next, base);
      const v = fromPx(next, base);
      setHud(`x ${Math.round(v.posX * 50)}%  y ${Math.round(v.posY * 50)}%`);
    } else if (d.k === "rotate") {
      const a0 = (Math.atan2(d.start[1] - p0.cy, d.start[0] - p0.cx) * 180) / Math.PI;
      const a1 = (Math.atan2(pt[1] - p0.cy, pt[0] - p0.cx) * 180) / Math.PI;
      let r = p0.rot + (a1 - a0);
      if (mods.shift) r = Math.round(r / 15) * 15;
      emit({ ...p0, rot: r }, base);
      setHud(`${wrapDeg(r).toFixed(1)}°`);
    } else if (d.k === "scale") {
      const next = scaleGesture(p0, d.h.hx, d.h.hy, pt[0], pt[1], mods);
      emit(next, base);
      const v = fromPx(next, base);
      setHud(`W ${Math.round(v.sx * 100)}%  ·  H ${Math.round(v.sy * 100)}%`);
    }
  };

  const endPointer = (e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      dragRef.current = null;
      setGuides([]);
      setHud("");
    } else if (dragRef.current?.k === "pinch") {
      // One finger left: keep moving from where it is.
      const [pt] = [...pointersRef.current.values()];
      dragRef.current = { k: "move", h: { k: "move" }, start: pt, p0: toPx(value), base: value };
    }
  };

  // Arrow keys nudge (Shift = 10px); Ctrl/Cmd+Z undo, Shift+Ctrl/Cmd+Z or Ctrl+Y redo.
  const onKeyDown = (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key === "z" || e.key === "Z")) {
      e.preventDefault();
      if (e.shiftKey) onRedo?.();
      else onUndo?.();
      return;
    }
    if (mod && (e.key === "y" || e.key === "Y")) {
      e.preventDefault();
      onRedo?.();
      return;
    }
    const step = e.shiftKey ? 10 : 1;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!move || locked) return;
    e.preventDefault();
    e.stopPropagation();
    if (!e.repeat) onGestureStart?.();
    emit({ ...px, cx: px.cx + move[0], cy: px.cy + move[1] }, value);
  };

  useEffect(() => {
    const pointers = pointersRef.current;
    return () => pointers.clear();
  }, []);

  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => layerPt(x * px.hw, y * px.hh));
  const topMid = layerPt(0, -px.hh);
  const knob = layerPt(0, -px.hh - KNOB_GAP);
  const handles = [];
  for (let hx = -1; hx <= 1; hx += 1) for (let hy = -1; hy <= 1; hy += 1) if (hx || hy) handles.push({ hx, hy, p: layerPt(hx * px.hw, hy * px.hh) });
  const activeKind = dragRef.current?.k;

  return (
    <div
      ref={rootRef}
      className={`ft ${locked ? "is-locked" : ""}`}
      style={{ cursor: cursorFor(dragRef.current ? dragRef.current.h : hover), left: -pad, top: -pad, width: frameW + 2 * pad, height: frameH + 2 * pad }}
      tabIndex={0}
      role="application"
      aria-label="Image transform. Drag to move, drag handles to resize, drag the knob to rotate, arrow keys nudge."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={() => !dragRef.current && setHover(null)}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={onKeyDown}
    >
      <svg className="ft-svg" viewBox={`${-pad} ${-pad} ${frameW + 2 * pad} ${frameH + 2 * pad}`} preserveAspectRatio="none" aria-hidden="true">
        {/* The part of the picture outside the frame, faded, so you can see what you're placing. */}
        {imageUrl && pad > 0 ? (
          <>
            <defs>
              <mask id="ft-outside">
                <rect x={-pad} y={-pad} width={frameW + 2 * pad} height={frameH + 2 * pad} fill="white" />
                <rect x={0} y={0} width={frameW} height={frameH} fill="black" />
              </mask>
            </defs>
            <g mask="url(#ft-outside)" opacity="0.28">
              <image
                href={imageUrl}
                x={-px.hw}
                y={-px.hh}
                width={2 * px.hw}
                height={2 * px.hh}
                preserveAspectRatio="none"
                transform={`translate(${px.cx} ${px.cy}) rotate(${px.rot}) scale(${value.flipH ? -1 : 1} ${value.flipV ? -1 : 1})`}
              />
            </g>
            <rect className="ft-frame" x={0} y={0} width={frameW} height={frameH} />
          </>
        ) : null}
        {/* thirds grid while moving or scaling */}
        {activeKind && activeKind !== "rotate" ? (
          <g className="ft-grid">
            {[1, 2].map((i) => (
              <React.Fragment key={i}>
                <line x1={(frameW * i) / 3} y1={0} x2={(frameW * i) / 3} y2={frameH} />
                <line x1={0} y1={(frameH * i) / 3} x2={frameW} y2={(frameH * i) / 3} />
              </React.Fragment>
            ))}
          </g>
        ) : null}
        {guides.map((g) =>
          g.axis === "x" ? (
            <line key={`gx${g.v}`} className="ft-guide" x1={g.v} y1={0} x2={g.v} y2={frameH} />
          ) : (
            <line key={`gy${g.v}`} className="ft-guide" x1={0} y1={g.v} x2={frameW} y2={g.v} />
          ),
        )}
        {!locked ? (
          <>
            <polygon className="ft-box-shadow" points={corners.map((c) => c.join(",")).join(" ")} />
            <polygon className="ft-box" points={corners.map((c) => c.join(",")).join(" ")} />
            <line className="ft-knob-line" x1={topMid[0]} y1={topMid[1]} x2={knob[0]} y2={knob[1]} />
            <circle className={`ft-knob ${hover?.k === "rotate" || activeKind === "rotate" ? "is-hot" : ""}`} cx={knob[0]} cy={knob[1]} r={6} />
            <circle className="ft-center" cx={px.cx} cy={px.cy} r={3} />
            {handles.map(({ hx, hy, p }) => {
              const hot = hover?.k === "scale" && hover.hx === hx && hover.hy === hy;
              const side = !(hx && hy);
              const w = side ? (hx ? HANDLE - 3 : HANDLE + 5) : HANDLE;
              const h = side ? (hy ? HANDLE - 3 : HANDLE + 5) : HANDLE;
              return (
                <rect
                  key={`${hx}${hy}`}
                  className={`ft-handle ${side ? "is-side" : ""} ${hot ? "is-hot" : ""}`}
                  x={-w / 2}
                  y={-h / 2}
                  width={w}
                  height={h}
                  rx={side ? 3 : 2}
                  transform={`translate(${p[0]} ${p[1]}) rotate(${px.rot})`}
                />
              );
            })}
          </>
        ) : null}
      </svg>
      {hud ? <span className="ft-hud">{hud}</span> : null}
    </div>
  );
};

export default FreeTransform;
