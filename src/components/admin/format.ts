// Short admin duration display for the manual course length, e.g. "2 س 30 د".
// Unlike formatDurationDetailed (full Arabic phrasing for certificates),
// this is a compact list form. NULL means "unspecified".
export function formatDurationShort(
  totalSeconds: number | null | undefined,
  t: (ar: string, en: string) => string
): string {
  if (totalSeconds === null || totalSeconds === undefined) return t("غير محددة", "Unspecified");
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (hours > 0) parts.push(t(`${hours} س`, `${hours}h`));
  if (minutes > 0) parts.push(t(`${minutes} د`, `${minutes}m`));
  if (parts.length === 0) return t("أقل من دقيقة", "Less than a minute");
  return parts.join(" ");
}

// Parse the hours/minutes editor fields into seconds.
// Both empty (or 0+0) → null (unspecified). Anything else must be a
// non-negative integer number of hours and 0–59 minutes, else "INVALID".
export function parseDurationFields(hoursRaw: string, minutesRaw: string): number | null | "INVALID" {
  const h = hoursRaw.trim();
  const m = minutesRaw.trim();
  if (!h && !m) return null;
  if (!/^\d+$/.test(h || "0") || !/^\d+$/.test(m || "0")) return "INVALID";
  const hours = h ? parseInt(h, 10) : 0;
  const minutes = m ? parseInt(m, 10) : 0;
  if (minutes > 59) return "INVALID";
  const total = hours * 3600 + minutes * 60;
  return total > 0 ? total : null;
}

// Split stored seconds back into editor fields.
export function splitDuration(totalSeconds: number | null | undefined): { hours: string; minutes: string } {
  if (!totalSeconds) return { hours: "", minutes: "" };
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  return { hours: hours > 0 ? String(hours) : "", minutes: minutes > 0 ? String(minutes) : "" };
}
