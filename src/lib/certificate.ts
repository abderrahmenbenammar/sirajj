import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit, { type Font } from "@pdf-lib/fontkit";
import { ArabicShaper } from "arabic-persian-reshaper";
import {
  COLOR_CERT_NUMBER,
  COLOR_COURSE_NAME,
  COLOR_DATE,
  COLOR_STUDENT_NAME,
} from "./certificates/layout";

// ---------------------------------------------------------------------------
// Official template PDF (A4 landscape, single page, 841.92 x 594.96 pt).
// Read from disk at request time: replacing the file needs no code change.
// ---------------------------------------------------------------------------
const TEMPLATE_PATH = path.join(process.cwd(), "public", "templates", "certificate-template.pdf");

// Arabic typeface embedded into every generated certificate. Swap this file
// (or just this path) to restyle the certificate — any TTF that covers the
// Arabic presentation forms (U+FE70..U+FEFF) plus base letters works.
// Noto Naskh Arabic covers every codepoint the reshaper can produce for
// real-world names/titles/dates (Maghribi, by contrast, is missing U+FEEE).
const FONT_PATH = path.join(process.cwd(), "public", "fonts", "NotoNaskhArabic-Regular.ttf");

// ---------------------------------------------------------------------------
// CERTIFICATE_LAYOUT — single source of truth for the four dynamic fields.
//
// Geometry is in PDF points with the origin at the BOTTOM-LEFT of the
// A4 landscape page (841.92 x 594.96). Every value was measured against the
// rendered template; the template's own printed text sits at these baselines:
//
//   y=363  «شهادة إتمام دورة»        (title, printed — never drawn here)
//   y=307  «تشهد منصة سراج بأن الطالب»
//   y=228  «قد أتم بنجاح دورة»
//   y=164  «وأتم متطلبات الدورة واجتاز التقييم بنجاح.»
//   y=134/107/80/53  the four value pills (الدرجة، التقييم، تاريخ الإتمام،
//                    مدة الدورة): each spans x 335.5..506.5, ~22.5 pt tall,
//                    with its label right-aligned INSIDE the pill's right end
//   y=62   «رمز التحقق»             (x 129..198, bottom-left corner)
//
// X is intentionally NOT stored per field: text is auto-centered on
// `centerX` using the embedded font's real advance widths (widthOfTextAtSize),
// so any value stays balanced on its axis and shrinks to fit maxWidth.
// ---------------------------------------------------------------------------
export const CERTIFICATE_LAYOUT = {
  page: { width: 841.92, height: 594.96 },

  // Student name — fills the visual gap between «تشهد…الطالب» (y=307) and
  // «قد أتم بنجاح دورة» (y=228): baseline 264 keeps ~12 pt clearance both
  // sides at size 34. Long names shrink down to 18 pt before truncating.
  studentName: {
    baselineY: 264,
    fontSize: 34,
    minFontSize: 18,
    centerX: 420.96, // page center
    maxWidth: 600,
    color: COLOR_STUDENT_NAME, // #074142 — the template's dark teal ink
  },

  // Course title — fills the gap between «قد أتم بنجاح دورة» (y=228) and
  // «وأتم متطلبات…» (y=164): baseline 196 at size 26, shrinking for long
  // titles (maxWidth keeps it clear of both printed lines).
  courseTitle: {
    baselineY: 196,
    fontSize: 26,
    minFontSize: 15,
    centerX: 420.96,
    maxWidth: 640,
    color: COLOR_COURSE_NAME, // #074142
  },

  // Completion date — third pill («تاريخ الإتمام:», pill y 73..95.5). The
  // label occupies x 442..506, so the value lives in the free area to its
  // left: zone x 341.5..436 → center 388.75, width 94. Same baseline as the
  // printed label (80) so the row reads as one line.
  completionDate: {
    baselineY: 80,
    fontSize: 12,
    minFontSize: 9,
    centerX: 388.75,
    maxWidth: 94,
    color: COLOR_DATE, // #01AF66 — brand green for values
  },

  // Verification code — directly below «رمز التحقق» (baseline 62), centered
  // on that label's axis (x 129..198 → center 163.5), above the inner frame
  // line at y≈30. Latin-only value (SIRAJ-YYYY-XXXXXXXX) drawn LTR.
  certificateCode: {
    baselineY: 42,
    fontSize: 10,
    minFontSize: 8,
    centerX: 163.5,
    maxWidth: 200,
    color: COLOR_CERT_NUMBER, // #01AF66
  },
} as const;

export interface CertificatePdfData {
  studentName: string;
  courseTitle: string;
  /** Certificate issue date — printed as «23 نوفمبر 2026». */
  completionDate: Date;
  /** e.g. SIRAJ-2026-ABCD2345 — Latin/digits only, drawn left-to-right. */
  certificateCode: string;
}

// ---------------------------------------------------------------------------
// Shaping + bidi-lite. pdf-lib draws glyphs strictly in string order and has
// no bidi engine, so Arabic must be (1) reshaped to presentation forms and
// (2) reordered into visual order before drawText.
// ---------------------------------------------------------------------------

// Bidi control marks that Intl/APIs inject around mixed text; invisible to
// readers but would render as tofu from the embedded font — strip them.
const BIDI_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

function cleanText(text: string): string {
  return text.replace(BIDI_MARKS, "").replace(/\s+/g, " ").trim();
}

// Codepoints that belong to RTL runs. Arabic-Indic digits (U+0660..0669,
// U+06F0..06F9) are numeric: digit sequences never reverse internally, so
// they are deliberately excluded and form LTR runs instead.
function isRtlChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp >= 0x0660 && cp <= 0x0669) return false;
  if (cp >= 0x06f0 && cp <= 0x06f9) return false;
  return (
    (cp >= 0x0600 && cp <= 0x06ff) || // Arabic block (letters, punctuation)
    (cp >= 0x0750 && cp <= 0x077f) || // Arabic Supplement
    (cp >= 0x08a0 && cp <= 0x08ff) || // Arabic Extended-A
    (cp >= 0xfb50 && cp <= 0xfdff) || // Presentation Forms-A
    (cp >= 0xfe70 && cp <= 0xfeff) // Presentation Forms-B (post-shaping)
  );
}

/**
 * Reorders shaped logical text into visual (left-to-right draw) order.
 *
 * pdf-lib paints characters left to right, so an RTL paragraph must be
 * reversed — but embedded LTR runs (Latin words, digit sequences such as
 * "2026" or "SIRAJ-2026-ABCD2345") must keep their internal order, otherwise
 * they would render mirrored.
 *
 * Whitespace is neutral (bidi N1/N2): it takes the direction of the runs
 * around it — same direction on both sides → that direction, otherwise the
 * paragraph direction (RTL here). Without this, spaces adjacent to digit
 * runs ("23 ") would be swallowed by the LTR run and, after run reversal,
 * land at the ends of the line instead of between the tokens, gluing
 * "23" + word + "2026" together.
 *
 * Then reverse the RUN order and reverse characters only inside RTL runs:
 *
 *   "23 نوفمبر 2026"  → runs [23][ word ][2026] (both spaces → RTL)
 *                    → visual "2026" + " " + reversed(word) + " " + "23"
 *                      (Arabic reads right-to-left: 23 → word → 2026)
 *   "SIRAJ-2026-ABCD" → no RTL chars → returned unchanged.
 *
 * A pure-Arabic string collapses to a plain reversal (all runs RTL).
 */
function toVisualOrder(text: string): string {
  const chars = Array.from(text);
  // Strong direction per char; whitespace is neutral (null).
  const strong: ("rtl" | "ltr" | null)[] = chars.map((ch) =>
    isRtlChar(ch) ? "rtl" : /\s/.test(ch) ? null : "ltr"
  );
  const paragraph: "rtl" | "ltr" = strong.includes("rtl") ? "rtl" : "ltr";
  if (paragraph === "ltr") return text; // pure LTR: draw as-is

  // Resolve neutrals: N1 (same direction on both sides → that direction),
  // else N2 (paragraph direction). Neighbors = nearest strong chars.
  const dir = strong.map((d, i) => {
    if (d) return d;
    let p = i - 1;
    while (p >= 0 && strong[p] === null) p--;
    let n = i + 1;
    while (n < chars.length && strong[n] === null) n++;
    const pd = p >= 0 ? strong[p] : null;
    const nd = n < chars.length ? strong[n] : null;
    return pd !== null && pd === nd ? pd : paragraph;
  });

  const runs: { rtl: boolean; chars: string[] }[] = [];
  chars.forEach((ch, i) => {
    const rtl = dir[i] === "rtl";
    const last = runs[runs.length - 1];
    if (last && last.rtl === rtl) last.chars.push(ch);
    else runs.push({ rtl, chars: [ch] });
  });
  runs.reverse();
  return runs
    .map((run) => (run.rtl ? run.chars.slice().reverse().join("") : run.chars.join("")))
    .join("");
}

/** Clean → reshape (presentation forms) → visual order. "" for blank input. */
function shapeForDrawing(text: string): string {
  const cleaned = cleanText(text);
  if (!cleaned) return "";
  return toVisualOrder(ArabicShaper.convertArabic(cleaned));
}

/** Gregorian date in Arabic with Latin digits: «23 نوفمبر 2026». */
export function formatCompletionDate(date: Date): string {
  try {
    // Latin digits (-nu-latn) keep the number runs LTR-safe in the layout;
    // month names come from the same locale the rest of the app displays.
    return new Intl.DateTimeFormat("ar-u-nu-latn", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

interface FieldLayout {
  baselineY: number;
  fontSize: number;
  minFontSize: number;
  centerX: number;
  maxWidth: number;
  color: string;
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  );
}

// pdf-lib encodes text through fontkit's layout(). Called without a
// direction, fontkit infers one from the string content — and for anything
// containing Arabic it naively reverses the ENTIRE glyph array. That would
// undo the visual ordering produced by toVisualOrder() above and mirror
// digit runs ("2026" → "6202"). Our strings are already final visual
// order, so we register a fontkit wrapper that always lays out with
// direction "ltr": layout then only maps codepoints to glyphs (the Arabic
// presentation forms we feed it carry no GSUB/GPOS rules that change them).
type Layout = Font["layout"];
type Layout5 = (
  str: Parameters<Layout>[0],
  features?: Parameters<Layout>[1],
  script?: string,
  language?: string,
  direction?: "ltr" | "rtl"
) => ReturnType<Layout>;

const ltrFontkit = {
  create(buffer: Uint8Array, postscriptName?: string): Font {
    const font = fontkit.create(buffer, postscriptName);
    const layout5 = font.layout as unknown as Layout5;
    const wrapped = Object.create(font) as Font;
    wrapped.layout = (str, features) => layout5.call(font, str, features, undefined, undefined, "ltr");
    return wrapped;
  },
};

function drawField(page: PDFPage, font: PDFFont, layout: FieldLayout, value: string) {
  const text = shapeForDrawing(value);
  if (!text) return;

  // Prefer the configured size; shrink (never below minFontSize) until the
  // shaped text fits the field's maxWidth.
  let size = layout.fontSize;
  let width = font.widthOfTextAtSize(text, size);
  if (width > layout.maxWidth) {
    size = Math.max(layout.minFontSize, Math.floor((layout.maxWidth / width) * size));
    width = font.widthOfTextAtSize(text, size);
  }

  page.drawText(text, {
    x: layout.centerX - width / 2, // auto-centered on the field axis
    y: layout.baselineY, // pdf-lib's y is the text baseline
    size,
    font,
    color: hexToRgb(layout.color),
  });
}

/**
 * Fills the four dynamic fields of the official template and returns the
 * resulting PDF bytes — ready for a `Content-Type: application/pdf` response.
 */
export async function renderCertificatePdf(data: CertificatePdfData): Promise<Uint8Array> {
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const fontBytes = fs.readFileSync(FONT_PATH);

  const pdf = await PDFDocument.load(templateBytes);
  pdf.registerFontkit(ltrFontkit);
  // Subsetting (subset: true) was measured to corrupt glyph metrics for
  // this font — letters render scattered/isolated — so the full 197 KB
  // face is embedded (the template artwork dominates the file size anyway).
  //
  // ccmp must stay off: on this font it decomposes some Arabic presentation
  // forms into base + zero-width combining marks (twodotshorizontalbelowar,
  // uni0654). Those mark glyphs carry no codePoints, so pdf-lib's ToUnicode
  // CMap omits them and readers fall back to glyph-id-as-codepoint, leaking
  // stray characters (glyph 324 → U+0144) into copy/paste and extraction.
  // We feed pre-shaped presentation forms, so ccmp adds nothing for us.
  const font = await pdf.embedFont(fontBytes, { subset: false, features: { ccmp: false } });

  const page = pdf.getPage(0); // template is a single A4 landscape page

  drawField(page, font, CERTIFICATE_LAYOUT.studentName, data.studentName);
  drawField(page, font, CERTIFICATE_LAYOUT.courseTitle, data.courseTitle);
  drawField(page, font, CERTIFICATE_LAYOUT.completionDate, formatCompletionDate(data.completionDate));
  drawField(page, font, CERTIFICATE_LAYOUT.certificateCode, data.certificateCode);

  return pdf.save();
}
