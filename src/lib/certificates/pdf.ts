import { GlobalFonts, PDFDocument, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import QRCode from "qrcode";
import path from "node:path";
import {
  CERT_HEIGHT,
  CERT_WIDTH,
  CERT_ZONES,
  COLOR_CERT_NUMBER,
  COLOR_COURSE_NAME,
  COLOR_DATE,
  COLOR_DURATION,
  COLOR_EVALUATION,
  COLOR_GRADE,
  COLOR_QR_BACKGROUND,
  COLOR_QR_FOREGROUND,
  COLOR_STUDENT_NAME,
} from "./layout";

const PAGE_WIDTH_PT = 841.89;
const PAGE_HEIGHT_PT = 595.28;
const FONT_REGULAR = "SirajCertificateNaskh";
const FONT_BOLD = "SirajCertificateNaskhBold";
const TEMPLATE_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "certificates",
  "template-art-2464x1728.jpg",
);
const REGULAR_FONT_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "certificates",
  "fonts",
  "NotoNaskhArabic-Regular.ttf",
);
const BOLD_FONT_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "certificates",
  "fonts",
  "NotoNaskhArabic-Bold.ttf",
);

export interface CertificatePdfTextData {
  studentName: string;
  courseTitle: string;
  scoreText: string;
  gradeText: string;
  dateText: string;
  durationText: string;
  code: string;
  verifyUrl?: string;
}

let fontsRegistered = false;
let templateImage: Awaited<ReturnType<typeof loadImage>> | null = null;

function ensureFonts() {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(REGULAR_FONT_PATH, FONT_REGULAR);
  GlobalFonts.registerFromPath(BOLD_FONT_PATH, FONT_BOLD);
  fontsRegistered = true;
}

async function loadTemplate() {
  if (!templateImage) templateImage = await loadImage(TEMPLATE_PATH);
  return templateImage;
}

function clean(text: string): string {
  return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
}

function fitFontSize(
  context: SKRSContext2D,
  text: string,
  box: { width: number; height: number; fontSize: number; minFontSize: number; bold?: boolean },
) {
  const weight = box.bold ? 700 : 400;
  context.font = `${weight} ${box.fontSize}px "${box.bold ? FONT_BOLD : FONT_REGULAR}"`;
  const metrics = context.measureText(text);
  const width = metrics.width || 1;
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || box.fontSize;
  const ratio = Math.min(box.width / width, box.height / height, 1);
  return Math.max(box.minFontSize, Math.floor(box.fontSize * ratio));
}

function drawText(
  context: SKRSContext2D,
  textValue: string,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    minFontSize?: number;
    weight?: 400 | 700;
    color: string | CanvasGradient;
    align?: "center" | "right";
    direction?: "rtl" | "ltr";
  },
) {
  const text = clean(textValue);
  if (!text.trim()) return;
  const bold = options.weight === 700;
  const size = fitFontSize(context, text, {
    width: options.width,
    height: options.height,
    fontSize: options.fontSize,
    minFontSize: options.minFontSize ?? Math.min(options.fontSize, 20),
    bold,
  });
  context.font = `${bold ? 700 : 400} ${size}px "${bold ? FONT_BOLD : FONT_REGULAR}"`;
  context.fillStyle = options.color;
  context.direction = options.direction ?? "rtl";
  context.textAlign = options.align ?? "center";
  context.textBaseline = "middle";
  const x = options.align === "right" ? options.x + options.width : options.x + options.width / 2;
  context.fillText(text, x, options.y + options.height / 2);
}

/**
 * Creates a landscape A4 PDF with visible, selectable Arabic text. The
 * certificate's decorative artwork remains a high-resolution image; every
 * printed heading, label, and student value is drawn as PDF text.
 */
export async function certificateDataToPdf(data: CertificatePdfTextData): Promise<Buffer> {
  ensureFonts();
  const [template, qrImage] = await Promise.all([
    loadTemplate(),
    data.verifyUrl
      ? QRCode.toDataURL(data.verifyUrl, {
          width: 456,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: COLOR_QR_FOREGROUND, light: COLOR_QR_BACKGROUND },
        }).then((qrDataUrl) => loadImage(Buffer.from(qrDataUrl.split(",")[1], "base64")))
      : Promise.resolve(null),
  ]);

  const document = new PDFDocument({
    title: data.code ? `Siraj certificate ${data.code}` : "Siraj certificate template",
  });
  const context = document.beginPage(PAGE_WIDTH_PT, PAGE_HEIGHT_PT) as SKRSContext2D;
  const scale = PAGE_WIDTH_PT / CERT_WIDTH;
  const offsetY = (PAGE_HEIGHT_PT - CERT_HEIGHT * scale) / scale;
  context.scale(scale, scale);
  context.translate(0, offsetY);
  context.drawImage(template, 0, 0, CERT_WIDTH, CERT_HEIGHT);

  drawText(context, "منصة سراج التعليمية", {
    x: 840,
    y: 303,
    width: 784,
    height: 96,
    fontSize: 70,
    minFontSize: 60,
    weight: 700,
    color: "#080808",
  });

  const titleGradient = context.createLinearGradient(650, 0, 1810, 0);
  titleGradient.addColorStop(0, "#073b3b");
  titleGradient.addColorStop(0.55, "#087466");
  titleGradient.addColorStop(1, "#08ad61");
  drawText(context, "شهادة إتمام دورة", {
    x: 600,
    y: 437,
    width: 1264,
    height: 190,
    fontSize: 190,
    minFontSize: 128,
    weight: 700,
    color: titleGradient,
  });

  drawText(context, "تشهد منصة سراج بأن", {
    x: 770,
    y: 625,
    width: 924,
    height: 150,
    fontSize: 72,
    minFontSize: 58,
    weight: 700,
    color: "#080808",
  });

  drawText(context, data.studentName, {
    x: CERT_ZONES.studentName.x,
    y: CERT_ZONES.studentName.y,
    width: CERT_ZONES.studentName.w,
    height: CERT_ZONES.studentName.h,
    fontSize: CERT_ZONES.studentName.fontSize,
    minFontSize: CERT_ZONES.studentName.minFontSize,
    weight: CERT_ZONES.studentName.weight,
    color: COLOR_STUDENT_NAME,
  });

  drawText(context, "قد أتم بنجاح دورة", {
    x: 840,
    y: 915,
    width: 784,
    height: 150,
    fontSize: 80,
    minFontSize: 64,
    weight: 700,
    color: "#080808",
  });

  drawText(context, data.courseTitle, {
    x: CERT_ZONES.courseName.x,
    y: CERT_ZONES.courseName.y,
    width: CERT_ZONES.courseName.w,
    height: CERT_ZONES.courseName.h,
    fontSize: CERT_ZONES.courseName.fontSize,
    minFontSize: CERT_ZONES.courseName.minFontSize,
    weight: CERT_ZONES.courseName.weight,
    color: COLOR_COURSE_NAME,
  });

  drawText(context, "وأتم متطلبات الدورة واجتاز التقييم بنجاح.", {
    x: 650,
    y: 1157,
    width: 1164,
    height: 150,
    fontSize: 72,
    minFontSize: 58,
    weight: 700,
    color: "#080808",
  });

  const labels = ["الدرجة:", "التقييم:", "تاريخ الإتمام:", "مدة الدورة:"];
  const values = [data.scoreText, data.gradeText, data.dateText, data.durationText];
  const valueColors = [COLOR_GRADE, COLOR_EVALUATION, COLOR_DATE, COLOR_DURATION];
  for (let index = 0; index < CERT_ZONES.values.length; index += 1) {
    const zone = CERT_ZONES.values[index];
    drawText(context, values[index], {
      x: zone.x,
      y: zone.y,
      width: index < 2 ? Math.min(zone.w, 390) : zone.w,
      height: zone.h,
      fontSize: 42,
      minFontSize: 20,
      color: valueColors[index],
      align: "right",
    });
    drawText(context, labels[index], {
      x: 1280,
      y: zone.y,
      width: 212,
      height: zone.h,
      fontSize: 42,
      minFontSize: 36,
      weight: 700,
      color: "#080808",
      align: "right",
    });
  }

  drawText(context, "رمز التحقق", {
    x: 303,
    y: 1488,
    width: 230,
    height: 50,
    fontSize: 28,
    minFontSize: 24,
    weight: 700,
    color: "#000000",
  });
  drawText(context, data.code, {
    x: CERT_ZONES.certNumber.x,
    y: CERT_ZONES.certNumber.y,
    width: CERT_ZONES.certNumber.w,
    height: 48,
    fontSize: CERT_ZONES.certNumber.fontSize,
    minFontSize: CERT_ZONES.certNumber.minFontSize,
    weight: 700,
    color: COLOR_CERT_NUMBER,
    direction: "ltr",
  });

  drawText(context, "لا تعد هذه الشهادة تزكية ولا شهادة علمية", {
    x: 650,
    y: 1590,
    width: 1164,
    height: 38,
    fontSize: 24,
    minFontSize: 20,
    color: "#292929",
  });

  if (qrImage) {
    context.direction = "ltr";
    context.drawImage(qrImage, CERT_ZONES.qr.x, CERT_ZONES.qr.y, CERT_ZONES.qr.size, CERT_ZONES.qr.size);
  }
  document.endPage();
  return document.close();
}

export function certificateTemplateToPdf(): Promise<Buffer> {
  return certificateDataToPdf({
    studentName: "",
    courseTitle: "",
    scoreText: "",
    gradeText: "",
    dateText: "",
    durationText: "",
    code: "",
  });
}
