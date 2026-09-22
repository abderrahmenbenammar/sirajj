// Central certificate layout — single source of truth for geometry, fonts,
// grading and formatting. Coordinates are the APPROVED final table on the
// native template reference 2464x1728 (see measurement report). The 2048x1436
// size is only a derived conversion (x * 2048/2464, y * 1436/1728) when needed.
// The template image itself (template-2464x1728.jpg, next to this file) is
// immutable: the renderer only ever reads it, never writes it.

export const CERT_WIDTH = 2464;
export const CERT_HEIGHT = 1728;

export interface CertTextZone {
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  minFontSize: number;
  weight: 400 | 700;
  align: "center" | "right";
}

export const CERT_ZONES: {
  studentName: CertTextZone;
  courseName: CertTextZone;
  values: { x: number; y: number; w: number; h: number }[];
  valueFont: { fontSize: number; minFontSize: number; weight: 400 | 700; align: "center" | "right" };
  qr: { x: number; y: number; size: number };
  certNumber: CertTextZone;
} = {
  // Expanded safe zones so the requested 156pt/110pt fit for normal
  // names; fit uses the true glyph bbox, not the fontSize line box, and
  // width is the primary limiter — height only clips real ascenders.
  studentName: { x: 482, y: 717, w: 1500, h: 240, fontSize: 146, minFontSize: 34, weight: 700, align: "center" },
  courseName: { x: 82, y: 1015, w: 2300, h: 182, fontSize: 103, minFontSize: 32, weight: 700, align: "center" },
  values: [
    { x: 965, y: 1313, w: 429, h: 47 },
    { x: 965, y: 1389, w: 418, h: 47 },
    { x: 965, y: 1465, w: 321, h: 47 },
    { x: 965, y: 1542, w: 339, h: 47 },
  ],
  valueFont: { fontSize: 42, minFontSize: 20, weight: 400, align: "right" },
  qr: { x: 323, y: 1290, size: 190 },
  certNumber: { x: 218, y: 1575, w: 400, h: 30, fontSize: 71, minFontSize: 30, weight: 700, align: "center" },
};

// Color constants
export const COLOR_STUDENT_NAME = "#074142";
export const COLOR_COURSE_NAME = "#074142";
export const COLOR_GRADE = "#01AF66";
export const COLOR_EVALUATION = "#01AF66";
export const COLOR_DATE = "#01AF66";
export const COLOR_DURATION = "#01AF66";
export const COLOR_CERT_NUMBER = "#01AF66";
export const COLOR_VERIFICATION_LABEL = "#077B75";
export const COLOR_QR_FOREGROUND = "#077B75";
export const COLOR_QR_BACKGROUND = "#FFFFFF";
export const CERT_INK = "#000000";

// Grading scale for the التقييم field (best passing score percentage).
// Central here so thresholds change in one place, never scattered in code.
export const GRADE_SCALE: { min: number; label: string }[] = [
  { min: 90, label: "ممتاز" },
  { min: 80, label: "جيد جدًا" },
  { min: 70, label: "جيد" },
  { min: 0, label: "مقبول" },
];

export function gradeFor(scorePercentage: number): string {
  for (const grade of GRADE_SCALE) {
    if (scorePercentage >= grade.min) return grade.label;
  }
  return GRADE_SCALE[GRADE_SCALE.length - 1].label;
}

export function formatScore(scorePercentage: number): string {
  const n = Number(scorePercentage);
  const text = Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  return `${text}%`;
}

// Duration prefers the summed lesson video lengths (whole seconds).
// Display keeps hour/minute precision Arabic style ("6 ساعات و25 دقيقة");
// sub-minute totals collapse to "أقل من دقيقة". Null (no known lesson
// length at all) renders as "غير محددة" — never a fabricated number.
function arabicCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function formatDurationDetailed(totalSeconds: number | null): string {
  if (totalSeconds === null) return "غير محددة";
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const parts: string[] = [];
  if (hours > 0) parts.push(arabicCount(hours, "ساعة واحدة", "ساعتان", "ساعات", "ساعة"));
  if (minutes > 0) parts.push(arabicCount(minutes, "دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة"));
  if (parts.length === 0) return "أقل من دقيقة";
  return parts.join(" و");
}

export function formatDateAr(date: Date): string {
  return date.toLocaleDateString("ar");
}

export function verifyUrlFor(certificateCode: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/verify?code=${encodeURIComponent(certificateCode)}`;
}
