// tmp/generate-certificate-template.ts
import { mkdir, writeFile } from "node:fs/promises";

// src/lib/certificates/pdf.ts
import { GlobalFonts, PDFDocument, loadImage } from "@napi-rs/canvas";
import QRCode from "qrcode";
import path from "node:path";

// src/lib/certificates/layout.ts
var CERT_WIDTH = 2464;
var CERT_HEIGHT = 1728;
var CERT_ZONES = {
  // Expanded safe zones so the requested 156pt/110pt fit for normal
  // names; fit uses the true glyph bbox, not the fontSize line box, and
  // width is the primary limiter — height only clips real ascenders.
  studentName: { x: 482, y: 717, w: 1500, h: 240, fontSize: 146, minFontSize: 34, weight: 700, align: "center" },
  courseName: { x: 82, y: 1015, w: 2300, h: 182, fontSize: 103, minFontSize: 32, weight: 700, align: "center" },
  values: [
    { x: 965, y: 1313, w: 429, h: 47 },
    { x: 965, y: 1389, w: 418, h: 47 },
    { x: 965, y: 1465, w: 321, h: 47 },
    { x: 965, y: 1542, w: 339, h: 47 }
  ],
  valueFont: { fontSize: 42, minFontSize: 20, weight: 400, align: "right" },
  qr: { x: 323, y: 1290, size: 190 },
  certNumber: { x: 218, y: 1575, w: 400, h: 30, fontSize: 71, minFontSize: 30, weight: 700, align: "center" }
};
var COLOR_STUDENT_NAME = "#074142";
var COLOR_COURSE_NAME = "#074142";
var COLOR_GRADE = "#01AF66";
var COLOR_EVALUATION = "#01AF66";
var COLOR_DATE = "#01AF66";
var COLOR_DURATION = "#01AF66";
var COLOR_CERT_NUMBER = "#01AF66";
var COLOR_QR_FOREGROUND = "#077B75";
var COLOR_QR_BACKGROUND = "#FFFFFF";

// src/lib/certificates/pdf.ts
var PAGE_WIDTH_PT = 841.89;
var PAGE_HEIGHT_PT = 595.28;
var FONT_REGULAR = "SirajCertificateNaskh";
var FONT_BOLD = "SirajCertificateNaskhBold";
var TEMPLATE_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "certificates",
  "template-art-2464x1728.jpg"
);
var REGULAR_FONT_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "certificates",
  "fonts",
  "NotoNaskhArabic-Regular.ttf"
);
var BOLD_FONT_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "certificates",
  "fonts",
  "NotoNaskhArabic-Bold.ttf"
);
var fontsRegistered = false;
var templateImage = null;
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
function clean(text) {
  return text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
}
function fitFontSize(context, text, box) {
  const weight = box.bold ? 700 : 400;
  context.font = `${weight} ${box.fontSize}px "${box.bold ? FONT_BOLD : FONT_REGULAR}"`;
  const metrics = context.measureText(text);
  const width = metrics.width || 1;
  const height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent || box.fontSize;
  const ratio = Math.min(box.width / width, box.height / height, 1);
  return Math.max(box.minFontSize, Math.floor(box.fontSize * ratio));
}
function drawText(context, textValue, options) {
  const text = clean(textValue);
  if (!text.trim()) return;
  const bold = options.weight === 700;
  const size = fitFontSize(context, text, {
    width: options.width,
    height: options.height,
    fontSize: options.fontSize,
    minFontSize: options.minFontSize ?? Math.min(options.fontSize, 20),
    bold
  });
  context.font = `${bold ? 700 : 400} ${size}px "${bold ? FONT_BOLD : FONT_REGULAR}"`;
  context.fillStyle = options.color;
  context.direction = options.direction ?? "rtl";
  context.textAlign = options.align ?? "center";
  context.textBaseline = "middle";
  const x = options.align === "right" ? options.x + options.width : options.x + options.width / 2;
  const y = options.y + options.height / 2;
  if (options.weight === 500) {
    context.lineWidth = 0.75;
    context.strokeStyle = options.color;
    context.strokeText(text, x, y);
  }
  context.fillText(text, x, y);
}
async function certificateDataToPdf(data) {
  ensureFonts();
  const [template, qrImage] = await Promise.all([
    loadTemplate(),
    data.verifyUrl ? QRCode.toDataURL(data.verifyUrl, {
      width: 456,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: COLOR_QR_FOREGROUND, light: COLOR_QR_BACKGROUND }
    }).then((qrDataUrl) => loadImage(Buffer.from(qrDataUrl.split(",")[1], "base64"))) : Promise.resolve(null)
  ]);
  const document = new PDFDocument({
    title: data.code ? `Siraj certificate ${data.code}` : "Siraj certificate template"
  });
  const context = document.beginPage(PAGE_WIDTH_PT, PAGE_HEIGHT_PT);
  const scale = PAGE_WIDTH_PT / CERT_WIDTH;
  const offsetY = (PAGE_HEIGHT_PT - CERT_HEIGHT * scale) / scale;
  context.scale(scale, scale);
  context.translate(0, offsetY);
  context.drawImage(template, 0, 0, CERT_WIDTH, CERT_HEIGHT);
  drawText(context, "\u0645\u0646\u0635\u0629 \u0633\u0631\u0627\u062C \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u064A\u0629", {
    x: 840,
    y: 303,
    width: 784,
    height: 96,
    fontSize: 70,
    minFontSize: 60,
    weight: 500,
    color: "#080808"
  });
  const titleGradient = context.createLinearGradient(650, 0, 1810, 0);
  titleGradient.addColorStop(0, "#073b3b");
  titleGradient.addColorStop(0.55, "#087466");
  titleGradient.addColorStop(1, "#08ad61");
  drawText(context, "\u0634\u0647\u0627\u062F\u0629 \u0625\u062A\u0645\u0627\u0645 \u062F\u0648\u0631\u0629", {
    x: 600,
    y: 437,
    width: 1264,
    height: 190,
    fontSize: 190,
    minFontSize: 128,
    weight: 700,
    color: titleGradient
  });
  drawText(context, "\u062A\u0634\u0647\u062F \u0645\u0646\u0635\u0629 \u0633\u0631\u0627\u062C \u0628\u0623\u0646", {
    x: 770,
    y: 625,
    width: 924,
    height: 150,
    fontSize: 72,
    minFontSize: 58,
    weight: 500,
    color: "#080808"
  });
  drawText(context, data.studentName, {
    x: CERT_ZONES.studentName.x,
    y: CERT_ZONES.studentName.y,
    width: CERT_ZONES.studentName.w,
    height: CERT_ZONES.studentName.h,
    fontSize: CERT_ZONES.studentName.fontSize,
    minFontSize: CERT_ZONES.studentName.minFontSize,
    weight: CERT_ZONES.studentName.weight,
    color: COLOR_STUDENT_NAME
  });
  drawText(context, "\u0642\u062F \u0623\u062A\u0645 \u0628\u0646\u062C\u0627\u062D \u062F\u0648\u0631\u0629", {
    x: 840,
    y: 915,
    width: 784,
    height: 150,
    fontSize: 80,
    minFontSize: 64,
    weight: 500,
    color: "#080808"
  });
  drawText(context, data.courseTitle, {
    x: CERT_ZONES.courseName.x,
    y: CERT_ZONES.courseName.y,
    width: CERT_ZONES.courseName.w,
    height: CERT_ZONES.courseName.h,
    fontSize: CERT_ZONES.courseName.fontSize,
    minFontSize: CERT_ZONES.courseName.minFontSize,
    weight: CERT_ZONES.courseName.weight,
    color: COLOR_COURSE_NAME
  });
  drawText(context, "\u0648\u0623\u062A\u0645 \u0645\u062A\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u062F\u0648\u0631\u0629 \u0648\u0627\u062C\u062A\u0627\u0632 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0628\u0646\u062C\u0627\u062D.", {
    x: 650,
    y: 1157,
    width: 1164,
    height: 150,
    fontSize: 72,
    minFontSize: 58,
    weight: 500,
    color: "#080808"
  });
  const labels = ["\u0627\u0644\u062F\u0631\u062C\u0629:", "\u0627\u0644\u062A\u0642\u064A\u064A\u0645:", "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0625\u062A\u0645\u0627\u0645:", "\u0645\u062F\u0629 \u0627\u0644\u062F\u0648\u0631\u0629:"];
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
      align: "right"
    });
    drawText(context, labels[index], {
      x: 1280,
      y: zone.y,
      width: 212,
      height: zone.h,
      fontSize: 42,
      minFontSize: 36,
      weight: 500,
      color: "#080808",
      align: "right"
    });
  }
  drawText(context, "\u0631\u0645\u0632 \u0627\u0644\u062A\u062D\u0642\u0642", {
    x: 303,
    y: 1488,
    width: 230,
    height: 50,
    fontSize: 28,
    minFontSize: 24,
    weight: 500,
    color: "#000000"
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
    direction: "ltr"
  });
  drawText(context, "\u0644\u0627 \u062A\u0639\u062F \u0647\u0630\u0647 \u0627\u0644\u0634\u0647\u0627\u062F\u0629 \u062A\u0632\u0643\u064A\u0629 \u0648\u0644\u0627 \u0634\u0647\u0627\u062F\u0629 \u0639\u0644\u0645\u064A\u0629", {
    x: 1845,
    y: 1590,
    width: 500,
    height: 38,
    fontSize: 24,
    minFontSize: 20,
    color: "#292929"
  });
  if (qrImage) {
    context.direction = "ltr";
    context.drawImage(qrImage, CERT_ZONES.qr.x, CERT_ZONES.qr.y, CERT_ZONES.qr.size, CERT_ZONES.qr.size);
  }
  document.endPage();
  return document.close();
}
function certificateTemplateToPdf() {
  return certificateDataToPdf({
    studentName: "",
    courseTitle: "",
    scoreText: "",
    gradeText: "",
    dateText: "",
    durationText: "",
    code: ""
  });
}

// tmp/generate-certificate-template.ts
var pdf = await certificateTemplateToPdf();
await mkdir("output/pdf", { recursive: true });
await mkdir("public/certificates", { recursive: true });
await Promise.all([
  writeFile("output/pdf/siraj-certificate-template.pdf", pdf),
  writeFile("public/certificates/siraj-certificate-template.pdf", pdf)
]);
console.log(`Generated blank certificate template (${pdf.length} bytes).`);
