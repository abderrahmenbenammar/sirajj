"use client";

import { ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * SIRAJ unified tooltip.
 * Pure React + Tailwind (no third-party library). Hover / keyboard-focus
 * triggered, auto-flips to stay inside the viewport, arrow points at the
 * trigger, careful fade + slide. Labels are resolved by the caller through
 * useLang's `t(ar, en)` so the component itself stays RTL/LTR-agnostic.
 */
type Side = "top" | "bottom" | "left" | "right";

interface SirajTooltipProps {
  /** Already-localized short label, e.g. t("حذف الدورة", "Delete course"). */
  label: string;
  side?: Side;
  /** Extra classes for the wrapper span (e.g. "w-full", "flex-1"). */
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}

const GAP = 10;
const EDGE_MARGIN = 10;
const ARROW_SIZE = 8;

function hiddenTransform(side: Side): string {
  if (side === "bottom") return "translateY(-4px) scale(0.98)";
  if (side === "left") return "translateX(4px) scale(0.98)";
  if (side === "right") return "translateX(-4px) scale(0.98)";
  return "translateY(4px) scale(0.98)";
}

export default function SirajTooltip({ label, side = "top", className = "", disabled = false, children }: SirajTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [arrow, setArrow] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const uid = useId().replace(/[:]/g, "");

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const bubble = bubbleRef.current;
    if (!wrap || !bubble) return;

    const wr = wrap.getBoundingClientRect();
    const br = bubble.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = 0;
    let left = 0;
    if (side === "top") {
      top = wr.top - GAP - br.height;
      left = wr.left + wr.width / 2 - br.width / 2;
    } else if (side === "bottom") {
      top = wr.bottom + GAP;
      left = wr.left + wr.width / 2 - br.width / 2;
    } else if (side === "left") {
      top = wr.top + wr.height / 2 - br.height / 2;
      left = wr.left - GAP - br.width;
    } else {
      top = wr.top + wr.height / 2 - br.height / 2;
      left = wr.right + GAP;
    }

    top = Math.max(EDGE_MARGIN, Math.min(vh - br.height - EDGE_MARGIN, top));
    left = Math.max(EDGE_MARGIN, Math.min(vw - br.width - EDGE_MARGIN, left));

    const relTop = top - wr.top;
    const relLeft = left - wr.left;

    // Arrow stays aligned over the trigger even when the bubble is clamped.
    let ax = 0;
    let ay = 0;
    if (side === "top" || side === "bottom") {
      ax = Math.max(ARROW_SIZE / 2 + 1, Math.min(br.width - ARROW_SIZE / 2 - 1, wr.width / 2 - relLeft));
    } else {
      ay = Math.max(ARROW_SIZE / 2 + 1, Math.min(br.height - ARROW_SIZE / 2 - 1, wr.height / 2 - relTop));
    }

    setPos({ top: relTop, left: relLeft });
    setArrow({ x: ax, y: ay });
  }, [side]);

  useEffect(() => {
    if (!visible) return;
    const frame = requestAnimationFrame(measure);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [visible, measure]);

  const show = () => {
    if (!disabled && label) setVisible(true);
  };
  const hide = () => {
    setVisible(false);
    setPos(null);
  };

  // Arrow: rotated square whose exposed edges match the bubble border.
  const arrowClasses =
    side === "bottom"
      ? "top-[-5px] border-t border-l"
      : side === "left"
        ? "right-[-5px] border-t border-r"
        : side === "right"
          ? "left-[-5px] border-b border-l"
          : "bottom-[-5px] border-b border-r";

  return (
    <span
      ref={wrapRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClickCapture={hide}
    >
      {children}
      <span
        ref={bubbleRef}
        id={`tt-${uid}`}
        role="tooltip"
        aria-hidden={visible ? undefined : true}
        style={{
          top: pos ? `${pos.top}px` : "-9999px",
          left: pos ? `${pos.left}px` : "-9999px",
          opacity: visible ? 1 : 0,
          transform: visible ? undefined : hiddenTransform(side),
          transition: "opacity 150ms ease-out, transform 150ms ease-out",
          pointerEvents: "none",
        }}
        className="absolute z-50 max-w-[16rem] px-2.5 py-1.5 text-xs font-medium leading-relaxed break-words whitespace-normal rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-emerald-200/80 dark:border-emerald-800/70 shadow-[0_10px_28px_-10px_rgba(2,44,34,0.45)] dark:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.85)]"
      >
        {label}
        <span
          aria-hidden="true"
          className={`absolute h-2 w-2 rotate-45 bg-white dark:bg-gray-800 ${arrowClasses}`}
          style={
            side === "top" || side === "bottom"
              ? { left: `${arrow.x}px` }
              : { top: `${arrow.y}px` }
          }
        />
      </span>
    </span>
  );
}