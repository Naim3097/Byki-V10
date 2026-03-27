'use client';

import { useEffect, useRef } from 'react';

const CELL = 48; // matches bg-grid size
const MAX_LINES = 18; // max concurrent glowing segments
const SPAWN_INTERVAL = 400; // ms between new spawns
const LINE_LIFE_MIN = 2000; // min lifetime ms
const LINE_LIFE_MAX = 5000; // max lifetime ms
const LINE_LENGTH_MIN = 1; // in cells
const LINE_LENGTH_MAX = 4; // in cells

interface GlowLine {
  x: number;
  y: number;
  length: number; // px
  horizontal: boolean;
  born: number;
  lifetime: number;
}

export default function NeonGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;
    let lines: GlowLine[] = [];
    let lastSpawn = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = canvas!.offsetWidth * dpr;
      canvas!.height = canvas!.offsetHeight * dpr;
      ctx!.scale(dpr, dpr);
    }

    resize();
    window.addEventListener('resize', resize);

    function spawnLine(now: number) {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      const cols = Math.floor(w / CELL);
      const rows = Math.floor(h / CELL);
      const horizontal = Math.random() > 0.5;
      const cellLen = LINE_LENGTH_MIN + Math.floor(Math.random() * (LINE_LENGTH_MAX - LINE_LENGTH_MIN + 1));

      let x: number, y: number;
      if (horizontal) {
        const col = Math.floor(Math.random() * Math.max(1, cols - cellLen));
        const row = Math.floor(Math.random() * rows);
        x = col * CELL;
        y = row * CELL;
      } else {
        const col = Math.floor(Math.random() * cols);
        const row = Math.floor(Math.random() * Math.max(1, rows - cellLen));
        x = col * CELL;
        y = row * CELL;
      }

      lines.push({
        x,
        y,
        length: cellLen * CELL,
        horizontal,
        born: now,
        lifetime: LINE_LIFE_MIN + Math.random() * (LINE_LIFE_MAX - LINE_LIFE_MIN),
      });
    }

    function draw(now: number) {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      ctx!.clearRect(0, 0, w, h);

      // Spawn new lines
      if (now - lastSpawn > SPAWN_INTERVAL && lines.length < MAX_LINES) {
        spawnLine(now);
        lastSpawn = now;
      }

      // Draw and cull
      lines = lines.filter((line) => {
        const age = now - line.born;
        if (age > line.lifetime) return false;

        // Smooth fade: ease in then ease out
        const progress = age / line.lifetime;
        // bell curve: sin(pi * t) — peaks at 0.5
        const alpha = Math.sin(Math.PI * progress);
        // keep it subtle: max opacity ~0.25
        const opacity = alpha * 0.25;

        if (opacity <= 0.001) return true;

        const { x, y, length, horizontal } = line;

        // Glow line
        ctx!.save();
        ctx!.globalAlpha = opacity;
        ctx!.strokeStyle = '#00ff88';
        ctx!.lineWidth = 1;
        ctx!.shadowColor = '#00ff88';
        ctx!.shadowBlur = 8;
        ctx!.beginPath();
        if (horizontal) {
          ctx!.moveTo(x, y);
          ctx!.lineTo(x + length, y);
        } else {
          ctx!.moveTo(x, y);
          ctx!.lineTo(x, y + length);
        }
        ctx!.stroke();

        // Second pass for stronger glow at center
        ctx!.globalAlpha = opacity * 0.5;
        ctx!.shadowBlur = 16;
        ctx!.stroke();
        ctx!.restore();

        return true;
      });

      raf = requestAnimationFrame(draw);
    }

    // Seed a few initial lines
    const now = performance.now();
    for (let i = 0; i < 6; i++) {
      spawnLine(now - Math.random() * LINE_LIFE_MAX * 0.6);
    }
    lastSpawn = now;

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.7 }}
    />
  );
}
