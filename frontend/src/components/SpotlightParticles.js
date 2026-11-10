import React, { useEffect, useRef } from "react";

// Dust in a stage light, behind the Spotlight page. A soft beam falls from the top; fine motes
// float through it at three depths, with depth of field: far motes are tiny and sharp, near ones
// large, soft and faint. Motes are only lit inside the beam. Monochrome and slow on purpose.
// One canvas, paused while the tab is hidden, a still frame for reduced motion.

const LAYERS = [
  // share of motes, size range (px), blur (glow radius x size), brightness, drift speed
  { share: 0.62, size: [0.5, 1.1], soft: 2.2, light: 0.75, speed: 0.05 },
  { share: 0.3, size: [1.2, 2.2], soft: 3.2, light: 0.5, speed: 0.09 },
  { share: 0.08, size: [3.5, 7], soft: 2.4, light: 0.16, speed: 0.16 }, // out of focus, near the lens
];

const rand = (min, max) => min + Math.random() * (max - min);
const smooth = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const SpotlightParticles = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const isLight = () => ["light", "paper"].includes(document.documentElement.getAttribute("data-palette"));

    let width = 0;
    let height = 0;
    let motes = [];
    let frame = 0;
    const pointer = { x: -9999, y: -9999, vx: 0, vy: 0 };

    // The beam: from a point above the page, widening as it falls. Its centre sways very slowly.
    const beam = { x: 0.62, top: -0.15, spread: 0.36 };
    const beamAt = (x, y, t) => {
      const cx = width * (beam.x + Math.sin(t * 0.05) * 0.03);
      const depth = Math.max(0, (y - height * beam.top) / height);
      const half = width * 0.04 + depth * width * beam.spread;
      const across = Math.abs(x - cx) / half;
      return (1 - smooth(0.55, 1, across)) * (1 - smooth(0.7, 1.15, depth));
    };

    const makeMote = (layer) => ({
      layer,
      x: rand(0, width),
      y: rand(0, height),
      size: rand(layer.size[0], layer.size[1]),
      // Drift heading turns slowly, so paths curve like dust in still air.
      heading: rand(0, Math.PI * 2),
      turn: rand(-0.004, 0.004),
      speed: layer.speed * rand(0.6, 1.4),
      vx: 0,
      vy: 0,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const total = Math.min(220, Math.round((width * height) / 6500));
      motes = LAYERS.flatMap((layer) => Array.from({ length: Math.round(total * layer.share) }, () => makeMote(layer)));
    };

    // The blurred beam is costly to draw, so it's rendered once per size/theme and reused.
    let beamImage = null;
    let beamKey = "";
    const renderBeam = (light) => {
      const pad = 120;
      const off = document.createElement("canvas");
      off.width = width + pad * 2;
      off.height = height + pad;
      const o = off.getContext("2d");
      const cx = pad + width * beam.x;
      const topY = height * beam.top;
      const bottomHalf = width * 0.04 + width * beam.spread * 1.15;
      const grad = o.createLinearGradient(0, topY, 0, height);
      const tint = light ? "255, 236, 200" : "255, 248, 236";
      grad.addColorStop(0, `rgba(${tint}, ${light ? 0.22 : 0.075})`);
      grad.addColorStop(0.55, `rgba(${tint}, ${light ? 0.08 : 0.03})`);
      grad.addColorStop(1, `rgba(${tint}, 0)`);
      o.filter = "blur(40px)";
      o.fillStyle = grad;
      o.beginPath();
      o.moveTo(cx - width * 0.03, topY);
      o.lineTo(cx + width * 0.03, topY);
      o.lineTo(cx + bottomHalf, height * 1.05);
      o.lineTo(cx - bottomHalf, height * 1.05);
      o.closePath();
      o.fill();
      return off;
    };
    const drawBeam = (t, light) => {
      const key = `${width}x${height}:${light}`;
      if (key !== beamKey) {
        beamImage = renderBeam(light);
        beamKey = key;
      }
      ctx.drawImage(beamImage, -120 + Math.sin(t * 0.05) * 0.03 * width, 0, beamImage.width, beamImage.height);
    };

    const draw = (time) => {
      const t = time / 1000;
      const light = isLight();
      ctx.clearRect(0, 0, width, height);
      drawBeam(t, light);
      // Pointer moving through the air stirs nearby dust along with it.
      pointer.vx *= 0.9;
      pointer.vy *= 0.9;
      for (const m of motes) {
        if (!still) {
          m.heading += m.turn + Math.sin(t * 0.3 + m.x * 0.01) * 0.002;
          let dx = Math.cos(m.heading) * m.speed;
          let dy = Math.sin(m.heading) * m.speed - m.speed * 0.25; // a faint upward lift
          const px = m.x - pointer.x;
          const py = m.y - pointer.y;
          const dist = Math.hypot(px, py);
          if (dist < 160) {
            const pull = (1 - dist / 160) ** 2 * 0.05;
            m.vx += pointer.vx * pull;
            m.vy += pointer.vy * pull;
          }
          m.vx *= 0.96;
          m.vy *= 0.96;
          m.x += dx + m.vx;
          m.y += dy + m.vy;
          if (m.x < -20) m.x = width + 20;
          if (m.x > width + 20) m.x = -20;
          if (m.y < -20) m.y = height + 20;
          if (m.y > height + 20) m.y = -20;
        }
        const lit = 0.12 + 0.88 * beamAt(m.x, m.y, t);
        const a = m.layer.light * lit * (light ? 0.55 : 1);
        if (a < 0.01) continue;
        const r = m.size * m.layer.soft;
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
        const color = light ? "120, 92, 40" : "255, 250, 240";
        g.addColorStop(0, `rgba(${color}, ${a})`);
        g.addColorStop(m.layer.size[0] > 3 ? 0.6 : 0.3, `rgba(${color}, ${a * 0.45})`);
        g.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (time) => {
      draw(time);
      frame = requestAnimationFrame(loop);
    };

    let last = null;
    const onMove = (event) => {
      if (last) {
        pointer.vx = event.clientX - last.x;
        pointer.vy = event.clientY - last.y;
      }
      last = { x: event.clientX, y: event.clientY };
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };
    const onLeave = () => {
      last = null;
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !still) frame = requestAnimationFrame(loop);
    };
    const onResize = () => {
      resize();
      if (still) draw(0);
    };

    resize();
    if (still) draw(0);
    else frame = requestAnimationFrame(loop);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="sp-particles" aria-hidden="true" />;
};

export default SpotlightParticles;
