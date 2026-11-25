"use client";

import { RadialBorderInput } from "./glow-effects";

/*
 * SirajInput — an Input component wrapped with the Aceternity-style
 * radial-border glow. Tailwind v4 RTL-safe, dark/light mode contrast
 * preserved. Keeps font-normal/font-medium (no font-bold/extrabold)
 * to avoid Maghribi glyph blur.
 *
 * Applied across:
 *   - Auth forms (login/register contact form)
 *   - Search inputs
 *   - Matn quiz answer inputs
 */
export { RadialBorderInput };

/*
 * SirajTextarea — same glow wrapper for textareas.
 */
export { RadialBorderTextarea } from "./glow-effects";