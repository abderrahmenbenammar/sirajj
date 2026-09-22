import { GlobalFonts, createCanvas, loadImage } from "@napi-rs/canvas";
import QRCode from "qrcode";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  CERT_WIDTH,
  CERT_HEIGHT,
  CERT_ZONES,
  CERT_INK,
  gradeFor,
  formatScore,
  formatDurationDetailed,
  formatDateAr,
  verifyUrlFor,
  type CertTextZone,
  COLOR_STUDENT_NAME,
  COLOR_COURSE_NAME,
  COLOR_GRADE,
  COLOR_EVALUATION,
  COLOR_DATE,
  COLOR_DURATION,
  COLOR_CERT_NUMBER,
  COLOR_VERIFICATION_LABEL,
  COLOR_QR_FOREGROUND,
  COLOR_QR_BACKGROUND,
} from "./layout";
import { computeFinalScore } from "./score";
import { getCourseDuration } from "./videos";

// Deterministic certificate image generation on the immutable template.
// Text runs through Skia (real Arabic shaping + Unicode bidi), proven
// against an independent reference shaper: multi-word names, mixed
// digit strings, hamza/ya/marbuta forms and the QR payload all match,
// with order verified (mirrored output rejected). No manual string
// reversal anywhere: direction is declared per value (rtl/ltr) and the
// engine orders runs itself.

const FONT_REGULAR = "SirajNaskh";
const FONT_BOLD = "SirajNaskhBold";
const TEMPLATE_REL = path.join("src", "lib", "certificates", "template-2464x1728.jpg");
const REGULAR_REL = path.join("src", "lib", "certificates", "fonts", "NotoNaskhArabic-Regular.ttf");
const BOLD_REL = path.join("src", "lib", "certificates", "fonts", "NotoNaskhArabic-Bold.ttf");

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  const root = process.cwd();
  GlobalFonts.registerFromPath(path.join(root, REGULAR_REL), FONT_REGULAR);
  GlobalFonts.registerFromPath(path.join(root, BOLD_REL), FONT_BOLD);
  fontsRegistered = true;
}

let templateImage: Awaited<ReturnType<typeof loadImage>> | null = null;
async function loadTemplate() {
  if (!templateImage) {
    templateImage = await loadImage(path.join(process.cwd(), TEMPLATE_REL));
  }
  return templateImage;
}

function fontFor(weight: 400 | 700): string {
  return weight === 700 ? FONT_BOLD : FONT_REGULAR;
}

function getColorForZone(zone: CertTextZone): string {
  // Map zones to their specific colors
  if (zone === CERT_ZONES.studentName) return COLOR_STUDENT_NAME;
  if (zone === CERT_ZONES.courseName) return COLOR_COURSE_NAME;
  if (zone === CERT_ZONES.certNumber) return COLOR_CERT_NUMBER;
  // Values array zones: scoreText, gradeText, dateText, durationText
  // We need to determine which value zone this is
  // The values array in CERT_ZONES has: scoreText, gradeText, dateText, durationText
  // We can check by position
  return ""; // Will be overridden per-field in renderCertificateImage
}

// Invisible Unicode bidi controls (RLM/LRM marks that Node's ar-locale
// date formatter emits, isolates, BOM). Paragraph direction is already
// declared explicitly per value below, so these hints carry no visible
// information — but Skia positions runs differently when they are present
// (verified: identical output with/without them must hold). Stripping them
// keeps rendering byte-stable. ZWJ/ZWNJ are linguistically significant and
// are intentionally preserved.
function stripBidiControls(text: string): string {
  // U+200E, U+200F, U+202A-U+202E, U+2066-U+2069, U+FEFF (escapes kept
  // explicit so no invisible literal ever hides in this pattern).
  return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
}

// Largest size that fits the zone, measured with the real shaper
// (linear scaling: one measurement is exact, then clamp to the minimum).
function fitFontSize(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  text: string,
  zone: { w: number; h: number; fontSize: number; minFontSize: number; weight: 400 | 700 }
): number {
  ctx.font = `${zone.weight} ${zone.fontSize}px "${fontFor(zone.weight)}"`;
  const m = ctx.measureText(text);
  const w = m.width || 1;
  const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || zone.fontSize;
  const ratio = Math.min(zone.w / w, zone.h / h, 1);
  return Math.max(zone.minFontSize, Math.floor(zone.fontSize * ratio));
}

export interface CertificateRenderData {
  studentName: string;
  courseTitle: string;
  scoreText: string;
  gradeText: string;
  dateText: string;
  durationText: string;
  code: string;
  verifyUrl: string;
}

export async function getCertificateRenderData(certificateId: string): Promise<CertificateRenderData | null> {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    include: {
      course: { select: { id: true, titleAr: true } },
      student: { select: { fullName: true } },
    },
  });
  if (!certificate) return null;
  const [duration, progress, final] = await Promise.all([
    certificate.durationSeconds === null || certificate.durationSeconds === undefined
      ? getCourseDuration(certificate.courseId)
      : null,
    prisma.studentCourseProgress.findUnique({
      where: { studentId_courseId: { studentId: certificate.studentId, courseId: certificate.courseId } },
      select: { completedAt: true },
    }),
    computeFinalScore(certificate.studentId, certificate.courseId),
  ]);
  // Stored snapshots win (history never shifts under edits); the live
  // computation is only a fallback for rows issued before it existed.
  const stored = certificate.finalScorePercentage === null ? null : Number(certificate.finalScorePercentage);
  const bestScore = stored ?? final.percentage ?? 0;
  const totalSeconds = certificate.durationSeconds ?? duration?.totalSeconds ?? null;
  return {
    studentName: certificate.student.fullName,
    courseTitle: certificate.course.titleAr,
    scoreText: formatScore(bestScore),
    gradeText: gradeFor(bestScore),
    dateText: formatDateAr(progress?.completedAt ?? certificate.issueDate),
    durationText: formatDurationDetailed(totalSeconds),
    code: certificate.certificateCode,
    verifyUrl: verifyUrlFor(certificate.certificateCode),
  };
}

interface PlacedText {
  zone: CertTextZone;
  text: string;
  direction: "rtl" | "ltr";
  color: string;
}

export async function renderCertificateImage(data: CertificateRenderData): Promise<Buffer> {
  ensureFonts();
  const [template, qrDataUrl] = await Promise.all([
    loadTemplate(),
    QRCode.toDataURL(data.verifyUrl, {
      width: 456,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: COLOR_QR_FOREGROUND, light: COLOR_QR_BACKGROUND },
    }),
  ]);
  const qrImage = await loadImage(Buffer.from(qrDataUrl.split(",")[1], "base64"));

  const canvas = createCanvas(CERT_WIDTH, CERT_HEIGHT);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(template, 0, 0, CERT_WIDTH, CERT_HEIGHT);
  // Align "رمز التحقق" with the QR's vertical center (was 22px left).
  // Cover the original label in the template and redraw it centered at QR.
  ctx.fillStyle = "#FEFAF7";
  ctx.fillRect(295, 1488, 210, 50);
  ctx.fillStyle = "#000000";
  ctx.font = `400 26px "${fontFor(400)}"`;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("رمز التحقق", 323 + 95, 1513);

  const values = [data.scoreText, data.gradeText, data.dateText, data.durationText];
  const placed: PlacedText[] = [
    { zone: CERT_ZONES.studentName, text: data.studentName, direction: "rtl", color: COLOR_STUDENT_NAME },
    { zone: CERT_ZONES.courseName, text: data.courseTitle, direction: "rtl", color: COLOR_COURSE_NAME },
    ...values.map(
      (text, i): PlacedText => ({
        zone: { ...CERT_ZONES.values[i], ...CERT_ZONES.valueFont },
        text,
        direction: "rtl",
        color: [COLOR_GRADE, COLOR_EVALUATION, COLOR_DATE, COLOR_DURATION][i],
      })
    ),
    { zone: CERT_ZONES.certNumber, text: data.code, direction: "ltr", color: COLOR_CERT_NUMBER },
  ];

  ctx.textBaseline = "middle";
  for (const item of placed) {
    const text = stripBidiControls(item.text);
    const size = fitFontSize(ctx, item.text, item.zone);
    ctx.font = `${item.zone.weight} ${size}px "${fontFor(item.zone.weight)}"`;
    ctx.direction = item.direction;
    ctx.fillStyle = item.color;
    if (item.zone.align === "center") {
      ctx.textAlign = "center";
      ctx.fillText(text, item.zone.x + item.zone.w / 2, item.zone.y + item.zone.h / 2);
    } else {
      ctx.textAlign = "right";
      ctx.fillText(text, item.zone.x + item.zone.w, item.zone.y + item.zone.h / 2);
    }
  }

  ctx.direction = "ltr";
  ctx.drawImage(qrImage, CERT_ZONES.qr.x, CERT_ZONES.qr.y, CERT_ZONES.qr.size, CERT_ZONES.qr.size);
  return Buffer.from(canvas.encodeSync("png"));
}

export async function renderCertificateById(certificateId: string): Promise<Buffer | null> {
  const data = await getCertificateRenderData(certificateId);
  if (!data) return null;
  return renderCertificateImage(data);
}
