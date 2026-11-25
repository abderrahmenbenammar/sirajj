"use client";

import { motion } from "framer-motion";
import { useState } from "react";

/*
 * BottomGradient — inspired by the Aceternity SignupFormDemo.
 * A crisp hairline emerald+cyan gradient at the bottom of a button/card,
 * revealed on hover with a smooth opacity transition.
 *
 * RTL-safe: the gradient direction is logical (bottom), no horizontal flips.
 */
export function BottomGradient({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      className={`inline-block relative overflow-hidden ${className || ""}`}
    >
      <motion.rect
        x1="0"
        y1="100%"
        x2="100%"
        y2="100%"
        className="absolute bottom-0 left-0 right-0 h-0.5 w-full bg-gradient-to-t from-emerald-400/50 via-cyan-400/50 to-transparent blur-sm"
        animate={{ opacity: [0, 1], transition: { duration: 0.5 } }}
        exit={{ opacity: 0 }}
      />
    </motion.div>
  );
}

/*
 * WindowEdgeGlow — subtle luminous hairline accents on the top and bottom
 * edges of modal dialogs and elevated cards. Uses the same emerald/cyan palette
 * for brand coherence.
 */
export function WindowEdgeGlow({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <motion.div
      className={`relative overflow-hidden ${className || ""}`}
    >
      {/* Top accent */}
      <motion.rect
        x1="0"
        y1="0"
        x2="100%"
        y2="0"
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-b from-emerald-400/20 via-cyan-400/20 to-transparent"
        animate={{ opacity: [0, 1], transition: { duration: 0.6 } }}
        exit={{ opacity: 0 }}
      />
      {/* Bottom accent */}
      <motion.rect
        x1="0"
        y1="100%"
        x2="100%"
        y2="100%"
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-t from-emerald-400/20 via-cyan-400/20 to-transparent"
        animate={{ opacity: [0, 1], transition: { duration: 0.6 } }}
        exit={{ opacity: 0 }}
      />
    </motion.div>
  );
}

/*
 * RadialBorderInput — mouse-tracking radial-gradient border illumination.
 * When the pointer hovers or the input is focused, a radial gradient "light"
 * follows the cursor around the input's border, using Siraj's emerald (#10b981)
 * and cyan (#06b6d4) brand colors.
 *
 * Fully RTL-aware: the gradient position is passed raw from the mousemove
 * handler, and the input's `dir`/`textAlign` handle visual direction.
 */
export interface RadialBorderInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Optional className overrides */
  className?: string;
}

/**
 * Wrapper component that adds a radial-gradient border glow following
 * mouse movement (or touch) over an <input> or <textarea>.
 *
 * Usage:
 *   <RadialBorderInput dir="rtl" placeholder="ابحث عن دورة..." />
 */
export function RadialBorderInput({
  dir,
  className,
  ...props
}: RadialBorderInputProps) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMouseX(e.clientX);
    setMouseY(e.clientY);
  };

  // Build the radial gradient as inline style
  const gradient = `radial-gradient(120px circle at ${mouseX}px ${mouseY}px, #10b981, #06b6d4, transparent 80%)`;

  const inputClassName = [
    "group-hover:outline-none",
    "group-focus-within:outline-none",
    "relative",
    "w-full",
    "rounded-xl",
    "border-2",
    "border-emerald-500/20",
    "transition-all",
    "duration-300",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="relative group w-full"
      onMouseMove={handleMouseMove}
      style={{}}>
      {/* The input itself */}
      <input
        className={inputClassName}
        dir={dir}
        {...props}
      />
      {/* Radial glow overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300"
        style={{ backgroundImage: gradient }}
      />
    </div>
  );
}

/*
 * RadialBorderTextarea — same as RadialBorderInput but for <textarea>.
 */
export interface RadialBorderTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function RadialBorderTextarea({
  dir,
  className,
  ...rest
}: RadialBorderTextareaProps) {
  const props = rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>;
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMouseX(e.clientX);
    setMouseY(e.clientY);
  };

  const gradient = `radial-gradient(120px circle at ${mouseX}px ${mouseY}px, #10b981, #06b6d4, transparent 80%)`;

  const textareaClassName = [
    "group-hover:outline-none",
    "group-focus-within:outline-none",
    "relative",
    "w-full",
    "rounded-xl",
    "border-2",
    "border-emerald-500/20",
    "transition-all",
    "duration-300",
    "resize-y",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className="relative group w-full"
      onMouseMove={handleMouseMove}
      style={{}}>
      <textarea
        className={textareaClassName}
        dir={dir}
        {...props}
      />
      <motion.div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300"
        style={{ backgroundImage: gradient }}
      />
    </div>
  );
}

/*
 * GlowWindow — reusable wrapper for modals/dialogs and interactive cards.
 * Features:
 *   - Subtle animated border sheen (emerald/cyan luminous rim).
 *   - WindowEdgeGlow accents on top and bottom edges.
 *   - Pointer-tracking radial highlight when hovered (via RadialBorderInput's
 *     pattern, but applied to the window's inner focus area).
 */
export interface GlowWindowProps {
  className?: string;
  children: React.ReactNode;
}

export function GlowWindow({ className, children }: GlowWindowProps) {
  return (
    <motion.div
      className={`relative overflow-hidden border-2 border-emerald-500/10 rounded-lg ${className || ""}`}
      animate={{ opacity: [1, 1], transition: { duration: 0.2 } }}
    >
      {/* WindowEdgeGlow will be rendered by the caller or via composition */}
      {children}
    </motion.div>
  );
}