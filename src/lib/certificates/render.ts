import { createElement } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import QRCode from "qrcode";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  CERT_WIDTH,
  CERT_HEIGHT,
  CERT_ZONES,
  CERT_INK,
  gradeFor,
  formatScore,
  formatDuration,
  formatDateAr,
  verifyUrlFor,
  type CertTextZone,
} from "./layout";

// Deterministic certificate image generation on the immutable template.
// Arabic shaping/RTL comes from satori's own layout engine (verified against
// an independent reference shaper: exact per-word widths, pixel-identical
// lam-alef ligature). resvg only rasterizes already-positioned glyph paths.

const FONT_FAMILY = "SirajNaskh";
const TEMPLATE_REL = path.join("src", "lib", "certificates", "template-2464x1728.jpg");
const REGULAR_REL = path.join("src", "lib", "certificates", "fonts", "NotoNaskhArabic-Regular.ttf");
const BOLD_REL = path.join("src", "lib", "certificates", "fonts", "NotoNaskhArabic-Bold.ttf");

let fontsCache: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] | null = null;
let templateCache: Buffer | null = null;

async function loadFonts() {
  if (!fontsCache) {
    const root = process.cwd();
    const [regular, bold] = await Promise.all([
      readFile(path.join(root, REGULAR_REL)),
      readFile(path.join(root, BOLD_REL)),
    ]);
    fontsCache = [
      { name: FONT_FAMILY, data: regular, weight: 400, style: "normal" },
      { name: FONT_FAMILY, data: bold, weight: 700, style: "normal" },
    ];
  }
  return fontsCache;
}

async function loadTemplateBase64(): Promise<string> {
  if (!templateCache) {
    templateCache = await readFile(path.join(process.cwd(), TEMPLATE_REL));
  }
  return templateCache.toString("base64");
}

// Ink bounding box of already-positioned satori glyph paths (absolute M/L/Q/Z,
// so every number pair is an x/y coordinate).
function measureSvgInk(svg: string): { w: number; h: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const match of svg.matchAll(/<path[^>]*\sd="([^"]*)"/g)) {
    const nums = match[1]
      .replace(/[A-Za-z]/g, " ")
      .split(/[\s,]+/)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i];
      const y = nums[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (!Number.isFinite(minX)) return { w: 0, h: 0 };
  return { w: maxX - minX, h: maxY - minY };
}

async function renderSingleLine(
  text: string,
  fontSize: number,
  weight: 400 | 700,
  fonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]
): Promise<string> {
  return satori(
    createElement("div", {
      style: { width: 4000, fontFamily: FONT_FAMILY, fontSize, fontWeight: weight, direction: "rtl" },
      children: text,
    }),
    { width: 4000, height: 300, fonts }
  );
}

// Largest size that fits the zone (linear font scaling: one measurement is
// exact, then a bounded verify pass). Never exceeds the zone, never drops
// below the approved minimum (the box clips instead via overflow hidden).
async function fitFontSize(
  text: string,
  zone: { w: number; h: number; fontSize: number; minFontSize: number; weight: 400 | 700 },
  fonts: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[]
): Promise<number> {
  let size = zone.fontSize;
  for (let pass = 0; pass < 4; pass += 1) {
    const ink = measureSvgInk(await renderSingleLine(text, size, zone.weight, fonts));
    if ((ink.w <= zone.w && ink.h <= zone.h) || size <= zone.minFontSize) {
      return Math.max(zone.minFontSize, Math.min(size, zone.fontSize));
    }
    const ratio = Math.min(zone.w / ink.w, zone.h / ink.h);
    size = Math.max(zone.minFontSize, Math.floor(size * ratio));
  }
  return Math.max(zone.minFontSize, size);
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
      course: { select: { id: true, titleAr: true, durationHours: true } },
      student: { select: { fullName: true } },
    },
  });
  if (!certificate) return null;
  const [lessonCount, progress, attempts] = await Promise.all([
    prisma.lesson.count({ where: { courseId: certificate.courseId } }),
    prisma.studentCourseProgress.findUnique({
      where: { studentId_courseId: { studentId: certificate.studentId, courseId: certificate.courseId } },
      select: { completedAt: true },
    }),
    prisma.examAttempt.findMany({
      where: { studentId: certificate.studentId, status: "completed", exam: { courseId: certificate.courseId } },
      include: { exam: { select: { passingScorePercentage: true } } },
      orderBy: { scorePercentage: "desc" },
    }),
  ]);
  const best =
    attempts.find((attempt) => Number(attempt.scorePercentage) >= attempt.exam.passingScorePercentage) ?? null;
  const bestScore = best ? Number(best.scorePercentage) : 0;
  return {
    studentName: certificate.student.fullName,
    courseTitle: certificate.course.titleAr,
    scoreText: formatScore(bestScore),
    gradeText: gradeFor(bestScore),
    dateText: formatDateAr(progress?.completedAt ?? certificate.issueDate),
    durationText: formatDuration(certificate.course.durationHours, lessonCount),
    code: certificate.certificateCode,
    verifyUrl: verifyUrlFor(certificate.certificateCode),
  };
}

function textBox(zone: CertTextZone, text: string, fontSize: number) {
  return createElement("div", {
    key: `${zone.x}-${zone.y}`,
    style: {
      position: "absolute",
      left: zone.x,
      top: zone.y,
      width: zone.w,
      height: zone.h,
      display: "flex",
      alignItems: "center",
      // NOTE: satori lays the flex main axis out physically (flex-start is
      // always the left edge), so right-anchored RTL values use flex-end.
      justifyContent: zone.align === "center" ? "center" : "flex-end",
      direction: "rtl",
      overflow: "hidden",
    },
    children: createElement("span", {
      style: {
        fontFamily: FONT_FAMILY,
        fontSize,
        fontWeight: zone.weight,
        color: CERT_INK,
        whiteSpace: "nowrap",
      },
      children: text,
    }),
  });
}

export async function renderCertificateImage(data: CertificateRenderData): Promise<Buffer> {
  const fonts = await loadFonts();
  const [templateB64, qrDataUrl] = await Promise.all([
    loadTemplateBase64(),
    QRCode.toDataURL(data.verifyUrl, {
      width: 456,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#FFFFFF" },
    }),
  ]);

  const values = [data.scoreText, data.gradeText, data.dateText, data.durationText];
  const [studentSize, courseSize, numberSize, ...valueSizes] = await Promise.all([
    fitFontSize(data.studentName, CERT_ZONES.studentName, fonts),
    fitFontSize(data.courseTitle, CERT_ZONES.courseName, fonts),
    fitFontSize(data.code, CERT_ZONES.certNumber, fonts),
    ...values.map((text, i) =>
      fitFontSize(text, { ...CERT_ZONES.values[i], ...CERT_ZONES.valueFont }, fonts)
    ),
  ]);

  const overlay = await satori(
    createElement("div", {
      // display:flex is required by satori on multi-child containers
      // (children are absolutely positioned, so it changes nothing visually).
      style: { position: "relative", display: "flex", width: CERT_WIDTH, height: CERT_HEIGHT },
      children: [
        textBox(CERT_ZONES.studentName, data.studentName, studentSize),
        textBox(CERT_ZONES.courseName, data.courseTitle, courseSize),
        ...values.map((text, i) =>
          textBox(
            { ...CERT_ZONES.values[i], ...CERT_ZONES.valueFont },
            text,
            valueSizes[i]
          )
        ),
        textBox(CERT_ZONES.certNumber, data.code, numberSize),
        createElement("img", {
          key: "qr",
          src: qrDataUrl,
          style: {
            position: "absolute",
            left: CERT_ZONES.qr.x,
            top: CERT_ZONES.qr.y,
            width: CERT_ZONES.qr.size,
            height: CERT_ZONES.qr.size,
          },
        }),
      ],
    }),
    { width: CERT_WIDTH, height: CERT_HEIGHT, fonts }
  );

  const inner = overlay.slice(overlay.indexOf(">") + 1, overlay.lastIndexOf("</svg>"));
  const master =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CERT_WIDTH}" height="${CERT_HEIGHT}" viewBox="0 0 ${CERT_WIDTH} ${CERT_HEIGHT}">` +
    `<image href="data:image/jpeg;base64,${templateB64}" x="0" y="0" width="${CERT_WIDTH}" height="${CERT_HEIGHT}"/>` +
    inner +
    `</svg>`;
  return Buffer.from(new Resvg(master).render().asPng());
}

export async function renderCertificateById(certificateId: string): Promise<Buffer | null> {
  const data = await getCertificateRenderData(certificateId);
  if (!data) return null;
  return renderCertificateImage(data);
}
