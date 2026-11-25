"use client";

import { GlowWindow, WindowEdgeGlow } from "./glow-effects";

/*
 * SirajGlowWindow — reusable wrapper for modals, dialogs, and elevated
 * cards with the Aceternity luminous border treatment.
 *
 * Applies:
 *   - 1px–1.5px luminous emerald/cyan rim via the GlowWindow component.
 *   - WindowEdgeGlow top/bottom hairline accents for brand coherence.
 *   - Preserves font-normal/font-medium (never font-bold/extrabold).
 *   - RTL-safe layout (inherits dir from parent).
 *
 * Used for:
 *   - Login / register / contact auth modals.
 *   - Certificate preview / generation dialogs.
 *   - Notification / confirmation popups.
 *   - Course detail sidebars and filters panels.
 */
export { GlowWindow, WindowEdgeGlow };