"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface Flake { x: number; y: number; r: number; vy: number; drift: number; phase: number; rot: number; vr: number; star: boolean }

/** Gently falling snowflakes over the whole site. Pointer-transparent; paused for reduced-motion users and hidden tabs. */
export default function SnowFall() {
  const ref = useRef<HTMLCanvasElement>(null);
  const path = usePathname();
  const hidden = path.startsWith("/dashboard") || path.startsWith("/admin-login");

  useEffect(() => {
    if (hidden) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let w = 0, h = 0, raf = 0, last = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let flakes: Flake[] = [];

    const make = (initial: boolean): Flake => {
      const r = 2 + Math.random() * 6;
      return {
        x: Math.random() * w, y: initial ? Math.random() * h : -12, r,
        vy: 18 + r * 7 + Math.random() * 14, drift: 10 + Math.random() * 22, phase: Math.random() * Math.PI * 2,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.8, star: r > 4.2,
      };
    };
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, Math.max(28, (w * h) / 22000)));
      flakes = Array.from({ length: count }, () => make(true));
    };

    const drawFlake = (f: Flake) => {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rot);
      ctx.globalAlpha = 0.45 + f.r / 14;
      if (f.star) {
        // real six-armed snowflake with twigs; a light-blue halo keeps it visible on white
        for (const [color, width] of [["rgba(120,190,225,0.9)", 2.6], ["#ffffff", 1.2]] as const) {
          ctx.strokeStyle = color; ctx.lineWidth = width * (f.r / 6); ctx.lineCap = "round";
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            ctx.save(); ctx.rotate((k * Math.PI) / 3);
            ctx.moveTo(0, 0); ctx.lineTo(0, -f.r * 1.6);
            ctx.moveTo(0, -f.r * 0.9); ctx.lineTo(-f.r * 0.5, -f.r * 1.3);
            ctx.moveTo(0, -f.r * 0.9); ctx.lineTo(f.r * 0.5, -f.r * 1.3);
            ctx.restore();
          }
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "rgba(120,190,225,0.85)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, 0, f.r * 0.8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
    };

    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - (last || t)) / 1000);
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < flakes.length; i++) {
        const f = flakes[i];
        f.y += f.vy * dt;
        f.phase += dt * 0.9;
        f.x += Math.sin(f.phase) * f.drift * dt;
        f.rot += f.vr * dt;
        if (f.y > h + 14 || f.x < -20 || f.x > w + 20) flakes[i] = make(false);
        drawFlake(flakes[i]);
      }
      raf = requestAnimationFrame(frame);
    };
    const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };

    resize();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); document.removeEventListener("visibilitychange", onVis); };
  }, [hidden]);

  if (hidden) return null;
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-20 print:hidden" />;
}
