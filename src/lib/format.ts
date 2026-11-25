// Centralized number/date formatting for Siraj (منصة سراج).
//
// Policy: EVERY number shown anywhere on the platform — UI labels, progress
// percentages, durations, lesson counts, notification badges, quiz scores,
// dates, verification serials and the generated PDF certificates — uses
// International / Western Arabic numerals (0123456789) while the surrounding
// text stays Arabic.
//
// Why this file exists: the default `ar` locale (and any `ar-SA`, `ar-EG`, …
// tag) formats numbers with the Eastern (Hindi) digit set ٠١٢٣٤٥٦٧٨٩. The
// only reliable switch is the Unicode extension `-u-nu-latn`, which every
// formatter below forces on.

// Eastern Arabic-Indic digits ٠..٩ (U+0660..U+0669) and Persian digits
// ۰..۹ (U+06F0..U+06F9) both map linearly onto ASCII 0..9.
const EASTERN_DIGIT_BASE = 0x0660; // '٠'
const PERSIAN_DIGIT_BASE = 0x06f0; // '۰'

/**
 * Converts any Eastern Arabic (٠١٢٣٤٥٦٧٨٩) or Persian (۰۱۲۳۴۵۶۷۸۹) digit
 * into the ASCII digit `0-9`, the Arabic percent sign `٪` into `%`, and the
 * Arabic decimal/thousand separators `٫` / `٬` into `.` / `,`.
 *
 * Accepts a number for convenience (numbers are already ASCII when
 * stringified); passes pure Latin input through untouched.
 */
export function toWesternDigits(input: string | number): string {
  if (typeof input === "number") return String(input);
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - EASTERN_DIGIT_BASE))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - PERSIAN_DIGIT_BASE))
    .replace(/٪/g, "%")
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}

/**
 * Formats a number with Arabic conventions (grouping/units) but strictly
 * Latin digits, e.g. `formatNumber(1234.5)` → "1,234.5".
 */
export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return toWesternDigits(new Intl.NumberFormat("ar-u-nu-latn", options).format(value));
}

/**
 * Formats a date with Arabic month names and Latin digits, e.g.
 * `formatDate(new Date())` → "25 نوفمبر 2026".
 *
 * Invalid dates return "" instead of throwing so a bad row can never crash a
 * page render.
 */
export function formatDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  return toWesternDigits(new Intl.DateTimeFormat("ar-u-nu-latn", options).format(value));
}

/**
 * Forces Latin digits on an already-selected BCP-47 locale tag, for call
 * sites that follow the UI language:
 *   "ar" → "ar-u-nu-latn", "ar-SA" → "ar-SA-u-nu-latn"
 *   "en" / "en-GB" / …      → unchanged.
 */
export function latinDigitsLocale(locale: string): string {
  if (!/^ar\b/i.test(locale)) return locale;
  if (/-u-nu-/i.test(locale)) return locale.replace(/-u-nu-[a-z0-9-]*/i, "-u-nu-latn");
  return `${locale}-u-nu-latn`;
}
