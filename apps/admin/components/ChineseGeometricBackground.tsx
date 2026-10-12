'use client';

/**
 * @file ChineseGeometricBackground.tsx
 * @brief Authentic IEEE ECU SB Background with Canvas Constellation & Drifting Chinese Watermarks.
 * @details Extracted 1:1 from the official IEEE ECU SB website (https://ieee-ecu-sb-website.vercel.app/).
 *          Guaranteed fixed background layer (z-index: 0, pointer-events: none) that never pushes or displaces layout.
 * @author Senior Full-Stack Software Architect
 * @since 2026-09-19
 */

import React, { useEffect, useRef } from 'react';

interface WatermarkChar {
  char: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  size: number;
  tint: 'red' | 'blue';
  rotate: number;
  delay: string;
  hideMobile?: boolean;
}

// Exact character positions and rotations from https://ieee-ecu-sb-website.vercel.app/
const WATERMARK_CHARS: WatermarkChar[] = [
  { char: '程', top: '-8%', left: '-6%', size: 220, tint: 'blue', rotate: 4, delay: '0s' },
  { char: '迎', bottom: '-8%', right: '-6%', size: 220, tint: 'red', rotate: -5, delay: '1.2s' },
  { char: '智', top: '5%', right: '4%', size: 100, tint: 'red', rotate: -4, delay: '2.1s' },
  { char: '创', bottom: '6%', left: '5%', size: 100, tint: 'blue', rotate: 6, delay: '0.6s' },
  { char: '迎', top: '26%', left: '-3%', size: 60, tint: 'red', rotate: -7, delay: '2.9s', hideMobile: true },
  { char: '程', bottom: '26%', right: '-3%', size: 60, tint: 'blue', rotate: 6, delay: '0.4s', hideMobile: true },
  { char: '志', top: '50%', left: '-4%', size: 65, tint: 'blue', rotate: 3, delay: '3.2s', hideMobile: true },
  { char: '新', top: '50%', right: '-4%', size: 65, tint: 'red', rotate: -6, delay: '1.8s', hideMobile: true },
  { char: '匠', top: '8%', left: '20%', size: 55, tint: 'red', rotate: 5, delay: '2.6s', hideMobile: true },
  { char: '想', bottom: '9%', right: '22%', size: 55, tint: 'blue', rotate: -5, delay: '3.6s', hideMobile: true },
];

/**
 * @brief Ambient Geometric Background for Administrative Portals.
 * @details Features subtle, GPU-accelerated pattern rendering without layout shift.
 * @return {JSX.Element} Ambient background component.
 */
export default function ChineseGeometricBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const count = isMobile ? 16 : 65;
    const maxDistance = isMobile ? 85 : 140;

    const particles = Array.from({ length: count }, () => {
      const isAccent = Math.random() > 0.88;
      const isRed = Math.random() > 0.87;
      return {
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * (isAccent ? 0.8 : 0.5),
        vy: (Math.random() - 0.5) * (isAccent ? 0.8 : 0.5),
        r: isAccent ? Math.random() * 1.5 + 1.8 : Math.random() * 1.2 + 1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.015,
        isRed,
        isAccent,
      };
    });

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Soft trailing motion blur (exact algorithm from official site)
      ctx.fillStyle = 'rgba(0, 4, 12, 0.28)';
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      // Update particle positions
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.pulse += p.pulseSpeed;

        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      });

      // Draw connecting constellation lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = 1 - dist / maxDistance;
            const isAccentLine = particles[i].isAccent || particles[j].isAccent;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);

            const isRed = particles[i].isRed && particles[j].isRed;
            ctx.strokeStyle = isRed
              ? `rgba(255, 91, 91, ${alpha * (isAccentLine ? 0.5 : 0.3)})`
              : `rgba(74, 158, 255, ${alpha * (isAccentLine ? 0.45 : 0.3)})`;
            ctx.lineWidth = isAccentLine ? 1 : 0.7;
            ctx.stroke();
          }
        }
      }

      // Draw particle nodes with pulsing glow halos
      particles.forEach((p) => {
        const pulse = 0.5 + 0.5 * Math.sin(p.pulse);
        const rgb = p.isRed ? '255, 90, 90' : '74, 158, 255';

        ctx.save();
        if (!isMobile) {
          ctx.shadowBlur = p.isAccent ? 6 : 3;
          ctx.shadowColor = `rgba(${rgb}, 0.6)`;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + (p.isAccent ? pulse * 0.6 : 0), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${0.35 + 0.35 * pulse})`;
        ctx.fill();
        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
      className="home-bg"
    >
      {/* 1. Geometric Constellation Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none',
        }}
      />

      {/* 2. Drifting Chinese Watermark Calligraphy Characters (Official Lk Array) */}
      {WATERMARK_CHARS.map((charObj, idx) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          fontSize: `${charObj.size}px`,
          transform: `rotate(${charObj.rotate}deg)`,
          animationDelay: charObj.delay,
          ['--home-rot' as any]: `${charObj.rotate}deg`,
        };

        if (charObj.top !== undefined) style.top = charObj.top;
        if (charObj.bottom !== undefined) style.bottom = charObj.bottom;
        if (charObj.left !== undefined) style.left = charObj.left;
        if (charObj.right !== undefined) style.right = charObj.right;

        return (
          <span
            key={`char-${idx}`}
            className={`home-bg-char home-bg-char-${charObj.tint} hidden md:block`}
            style={style}
          >
            {charObj.char}
          </span>
        );
      })}
    </div>
  );
}
