"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";

const TRAIL_LENGTH = 5;
const TRAIL_OPACITIES = [0.3, 0.2, 0.15, 0.1, 0.05];
const DOT_SIZE = 8;
const RING_SIZE = 36;
const TRAIL_DOT_SIZE = 4;
const SPRING_FACTOR = 0.15;

const INTERACTIVE_SELECTOR =
  "button, a, [role=button], input, select, textarea, [data-magnetic], [type=button], [type=submit], [type=reset], label[for], summary, details, [tabindex]:not([tabindex='-1'])";

const TEXT_SELECTOR =
  "p, span, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, cite, figcaption, label, [role=text]";

export function CustomCursor() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isInteractive = useRef(false);
  const isText = useRef(false);
  const isPressed = useRef(false);
  const isVisible = useRef(false);
  const mousePos = useRef({ x: -100, y: -100 });
  const ringPos = useRef({ x: -100, y: -100 });
  const trailPositions = useRef<{ x: number; y: number }[]>(
    Array.from({ length: TRAIL_LENGTH }, () => ({ x: -100, y: -100 }))
  );
  const rafId = useRef<number>(0);
  const frameCount = useRef(0);
  const mounted = useRef(false);

  const getColors = useCallback(() => {
    if (isDark) {
      return {
        dot: "#f8fafc",
        ring: "rgba(248, 250, 252, 0.15)",
        hover: "var(--primary, #f8fafc)",
      };
    }
    return {
      dot: "#0f172a",
      ring: "rgba(15, 23, 42, 0.15)",
      hover: "var(--primary, #0f172a)",
    };
  }, [isDark]);

  const isTouchDevice = useCallback(() => {
    if (typeof window === "undefined") return true;
    return (
      window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0
    );
  }, []);

  const checkInteractive = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      isInteractive.current = false;
      isText.current = false;
      return;
    }
    isInteractive.current = !!target.closest(INTERACTIVE_SELECTOR);
    isText.current = !isInteractive.current && !!target.closest(TEXT_SELECTOR);
  }, []);

  const animateRef = useRef<() => void>();
  
  animateRef.current = () => {
    if (!mounted.current) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const trails = trailRefs.current;
    if (!dot || !ring) return;

    frameCount.current++;

    // Dot follows exactly
    const mx = mousePos.current.x;
    const my = mousePos.current.y;
    dot.style.transform = `translate(${mx - DOT_SIZE / 2}px, ${my - DOT_SIZE / 2}px)`;

    // Ring follows with spring lag
    ringPos.current.x += (mx - ringPos.current.x) * SPRING_FACTOR;
    ringPos.current.y += (my - ringPos.current.y) * SPRING_FACTOR;
    ring.style.transform = `translate(${ringPos.current.x - RING_SIZE / 2}px, ${ringPos.current.y - RING_SIZE / 2}px)`;

    // Update trail positions every 2 frames for performance
    if (frameCount.current % 2 === 0) {
      for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
        trailPositions.current[i] = { ...trailPositions.current[i - 1] };
      }
      trailPositions.current[0] = { x: mx, y: my };
    }

    // Render trail dots
    const colors = getColors();
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      const trail = trails[i];
      if (!trail) continue;
      const pos = trailPositions.current[i];
      trail.style.transform = `translate(${pos.x - TRAIL_DOT_SIZE / 2}px, ${pos.y - TRAIL_DOT_SIZE / 2}px)`;
      trail.style.opacity = isVisible.current ? String(TRAIL_OPACITIES[i]) : "0";
      trail.style.backgroundColor = colors.dot;
    }

    // Apply styles based on state
    if (isPressed.current) {
      ring.style.transform += " scale(0.8)";
    } else if (isInteractive.current) {
      ring.style.transform += " scale(1.5)";
      dot.style.transform += " scale(0.5)";
      dot.style.backgroundColor = colors.hover;
    } else {
      dot.style.transform += " scale(1)";
      dot.style.backgroundColor = colors.dot;
    }

    // Text mode indicator
    if (isText.current && !isInteractive.current) {
      ring.style.transform += " scaleY(1.8) scaleX(0.6)";
      ring.style.borderRadius = "2px";
    } else {
      ring.style.borderRadius = "50%";
    }

    rafId.current = requestAnimationFrame(animateRef.current!);
  };

  useEffect(() => {
    if (isTouchDevice()) return;

    mounted.current = true;

    // Add custom cursor body class
    document.body.classList.add("custom-cursor-active");

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
      if (!isVisible.current) {
        isVisible.current = true;
        dotRef.current!.style.opacity = "1";
        ringRef.current!.style.opacity = "1";
        // Jump ring to current position on first move
        ringPos.current = { x: e.clientX, y: e.clientY };
      }
      checkInteractive(e.target);
    };

    const handleMouseDown = () => {
      isPressed.current = true;
    };

    const handleMouseUp = () => {
      isPressed.current = false;
    };

    const handleMouseLeave = () => {
      isVisible.current = false;
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
      trailRefs.current.forEach((t) => {
        if (t) t.style.opacity = "0";
      });
    };

    const handleMouseEnter = () => {
      isVisible.current = true;
      if (dotRef.current) dotRef.current.style.opacity = "1";
      if (ringRef.current) ringRef.current.style.opacity = "1";
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    document.documentElement.addEventListener("mouseenter", handleMouseEnter);

    rafId.current = requestAnimationFrame(animate);

    return () => {
      mounted.current = false;
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      document.documentElement.removeEventListener("mouseenter", handleMouseEnter);
      document.body.classList.remove("custom-cursor-active");
    };
  }, [isTouchDevice, animate, checkInteractive]);

  const colors = getColors();

  return (
    <>
      <style>{`
        /* Custom Cursor Styles */
        .custom-cursor-active,
        .custom-cursor-active * {
          cursor: none !important;
        }

        @keyframes cursor-dot-enter {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes cursor-ring-enter {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes cursor-trail-fade {
          from {
            opacity: 0.3;
          }
          to {
            opacity: 0;
          }
        }

        .custom-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          width: ${DOT_SIZE}px;
          height: ${DOT_SIZE}px;
          border-radius: 50%;
          background-color: ${colors.dot};
          pointer-events: none;
          z-index: 9999;
          opacity: 0;
          transition: background-color 0.2s ease, opacity 0.15s ease;
          will-change: transform;
          animation: cursor-dot-enter 0.3s ease-out forwards;
          mix-blend-mode: difference;
        }

        .custom-cursor-ring {
          position: fixed;
          top: 0;
          left: 0;
          width: ${RING_SIZE}px;
          height: ${RING_SIZE}px;
          border-radius: 50%;
          border: 1.5px solid ${colors.ring};
          pointer-events: none;
          z-index: 9999;
          opacity: 0;
          transition:
            transform 0.08s ease-out,
            border-color 0.2s ease,
            border-radius 0.2s ease,
            opacity 0.15s ease;
          will-change: transform;
          animation: cursor-ring-enter 0.4s ease-out forwards;
        }

        .custom-cursor-ring.is-pressed {
          transition:
            transform 0.06s ease-in,
            border-color 0.2s ease,
            border-radius 0.2s ease,
            opacity 0.15s ease;
        }

        .custom-cursor-trail {
          position: fixed;
          top: 0;
          left: 0;
          width: ${TRAIL_DOT_SIZE}px;
          height: ${TRAIL_DOT_SIZE}px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 9998;
          opacity: 0;
          will-change: transform, opacity;
          transition: opacity 0.3s ease;
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .custom-cursor-dot,
          .custom-cursor-ring,
          .custom-cursor-trail {
            transition: none !important;
            animation: none !important;
          }
        }

        /* Hide on touch devices via CSS as fallback */
        @media (pointer: coarse) {
          .custom-cursor-dot,
          .custom-cursor-ring,
          .custom-cursor-trail {
            display: none !important;
          }
        }
      `}</style>

      {/* Trail dots */}
      {Array.from({ length: TRAIL_LENGTH }, (_, i) => (
        <div
          key={`trail-${i}`}
          ref={(el) => {
            trailRefs.current[i] = el;
          }}
          className="custom-cursor-trail"
        />
      ))}

      {/* Main dot */}
      <div ref={dotRef} className="custom-cursor-dot" />

      {/* Ring */}
      <div ref={ringRef} className="custom-cursor-ring" />
    </>
  );
}

export default CustomCursor;