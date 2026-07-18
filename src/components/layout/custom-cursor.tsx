'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTheme } from 'next-themes';

const DOT_SIZE = 8;
const RING_SIZE = 36;
const TRAIL_DOT_SIZE = 4;
const TRAIL_LENGTH = 5;
const SPRING_FACTOR = 0.15;
const TRAIL_OPACITIES = [0.3, 0.2, 0.15, 0.1, 0.05];

const INTERACTIVE_SELECTOR =
  'button, a, [role="button"], input, select, textarea, [data-magnetic], label, .pointer-events-auto';
const TEXT_SELECTOR = 'p, span, h1, h2, h3, h4, h5, h6, li, td, th, div[class*="text-"]';

function isTouchDevice() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    (navigator as any).maxTouchPoints > 0
  );
}

export function CustomCursor() {
  const { resolvedTheme } = useTheme();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);

  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const trailPositions = useRef(
    Array.from({ length: TRAIL_LENGTH }, () => ({ x: -100, y: -100 }))
  );
  const isInteractive = useRef(false);
  const isText = useRef(false);
  const isPressed = useRef(false);
  const isVisible = useRef(false);
  const frameCount = useRef(0);
  const rafId = useRef(0);
  const mounted = useRef(false);

  const getColors = useCallback(() => {
    const isDark = resolvedTheme === 'dark';
    return {
      dot: isDark ? '#f8fafc' : '#0f172a',
      ring: isDark ? 'rgba(248, 250, 252, 0.15)' : 'rgba(15, 23, 42, 0.15)',
      hover: 'oklch(0.6 0.2 270)',
    };
  }, [resolvedTheme]);

  const checkInteractive = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      isInteractive.current = false;
      isText.current = false;
      return;
    }
    isInteractive.current = !!target.closest(INTERACTIVE_SELECTOR);
    isText.current = !isInteractive.current && !!target.closest(TEXT_SELECTOR);
  }, []);

  useEffect(() => {
    if (isTouchDevice()) return;

    mounted.current = true;
    document.body.classList.add('custom-cursor-active');

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible.current) {
        isVisible.current = true;
        dotRef.current!.style.opacity = '1';
        ringRef.current!.style.opacity = '1';
        ringPos.current = { x: e.clientX, y: e.clientY };
      }
      checkInteractive(e.target);
    };

    const handleMouseDown = () => { isPressed.current = true; };
    const handleMouseUp = () => { isPressed.current = false; };
    const handleMouseLeave = () => {
      isVisible.current = false;
      dotRef.current!.style.opacity = '0';
      ringRef.current!.style.opacity = '0';
    };
    const handleMouseEnter = () => {
      isVisible.current = true;
      dotRef.current!.style.opacity = '1';
      ringRef.current!.style.opacity = '1';
    };

    function animate() {
      if (!mounted.current) return;

      const dot = dotRef.current;
      const ring = ringRef.current;
      const trails = trailRefs.current;
      if (!dot || !ring) return;

      frameCount.current++;

      const mx = mousePos.current.x;
      const my = mousePos.current.y;
      dot.style.transform = `translate(${mx - DOT_SIZE / 2}px, ${my - DOT_SIZE / 2}px)`;

      ringPos.current.x += (mx - ringPos.current.x) * SPRING_FACTOR;
      ringPos.current.y += (my - ringPos.current.y) * SPRING_FACTOR;
      ring.style.transform = `translate(${ringPos.current.x - RING_SIZE / 2}px, ${ringPos.current.y - RING_SIZE / 2}px)`;

      if (frameCount.current % 2 === 0) {
        for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
          trailPositions.current[i] = { ...trailPositions.current[i - 1] };
        }
        trailPositions.current[0] = { x: mx, y: my };
      }

      const colors = getColors();
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const trail = trails[i];
        if (!trail) continue;
        const pos = trailPositions.current[i];
        trail.style.transform = `translate(${pos.x - TRAIL_DOT_SIZE / 2}px, ${pos.y - TRAIL_DOT_SIZE / 2}px)`;
        trail.style.opacity = isVisible.current ? String(TRAIL_OPACITIES[i]) : '0';
        trail.style.backgroundColor = colors.dot;
      }

      // Reset transforms before applying state
      const baseRingTransform = `translate(${ringPos.current.x - RING_SIZE / 2}px, ${ringPos.current.y - RING_SIZE / 2}px)`;
      const baseDotTransform = `translate(${mx - DOT_SIZE / 2}px, ${my - DOT_SIZE / 2}px)`;

      if (isPressed.current) {
        ring.style.transform = baseRingTransform + ' scale(0.8)';
        dot.style.transform = baseDotTransform + ' scale(1)';
        dot.style.backgroundColor = colors.dot;
      } else if (isInteractive.current) {
        ring.style.transform = baseRingTransform + ' scale(1.5)';
        dot.style.transform = baseDotTransform + ' scale(0.5)';
        dot.style.backgroundColor = colors.hover;
      } else {
        ring.style.transform = baseRingTransform;
        dot.style.transform = baseDotTransform;
        dot.style.backgroundColor = colors.dot;
      }

      if (isText.current && !isInteractive.current) {
        ring.style.borderRadius = '2px';
      } else {
        ring.style.borderRadius = '50%';
      }

      rafId.current = requestAnimationFrame(animate);
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.documentElement.addEventListener('mouseenter', handleMouseEnter);

    rafId.current = requestAnimationFrame(animate);

    return () => {
      mounted.current = false;
      cancelAnimationFrame(rafId.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter);
      document.body.classList.remove('custom-cursor-active');
    };
  }, [getColors, checkInteractive]);

  const colors = getColors();

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: '50%',
          backgroundColor: colors.dot,
          pointerEvents: 'none',
          zIndex: 99999,
          opacity: 0,
          willChange: 'transform',
          transition: 'width 0.2s, height 0.2s, background-color 0.2s',
        }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: '50%',
          border: `1.5px solid ${colors.ring}`,
          pointerEvents: 'none',
          zIndex: 99998,
          opacity: 0,
          willChange: 'transform, border-radius',
          transition: 'width 0.3s cubic-bezier(0.16,1,0.3,1), height 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.2s',
          mixBlendMode: 'difference',
        }}
      />
      {/* Trail dots */}
      {Array.from({ length: TRAIL_LENGTH }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { trailRefs.current[i] = el; }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: TRAIL_DOT_SIZE,
            height: TRAIL_DOT_SIZE,
            borderRadius: '50%',
            backgroundColor: colors.dot,
            pointerEvents: 'none',
            zIndex: 99997,
            opacity: 0,
            willChange: 'transform, opacity',
          }}
        />
      ))}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          [style*="will-change"] { transition: none !important; }
        }
        @media (pointer: coarse) {
          .custom-cursor-active, .custom-cursor-active * { cursor: auto !important; }
        }
      `}</style>
    </>
  );
}

export default CustomCursor;