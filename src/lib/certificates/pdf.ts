import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";

const A4_LANDSCAPE_WIDTH_PT = 841.89;
const A4_LANDSCAPE_HEIGHT_PT = 595.28;
const PDF_TEXT_FONT_SIZE_PT = 8;
const REGULAR_FONT_PATH = path.join(
  process.cwd(),
  "src",
  "lib",
  "certificates",
  "fonts",
  "NotoNaskhArabic-Regular.ttf",
);

export interface CertificatePdfTextData {
  studentName: string;
  courseTitle: string;
  scoreText: string;
  gradeText: string;
  dateText: string;
  durationText: string;
  code: string;
}

interface PdfTextRun {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function certificateTextRuns(data: CertificatePdfTextData): PdfTextRun[] {
  const clean = (text: string) =>
    text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");

  return [
    { text: "سراج", x: 950, y: 120, width: 564, height: 120 },
    { text: "منصة سراج التعليمية", x: 700, y: 260, width: 1064, height: 80 },
    { text: "شهادة إتمام دورة", x: 500, y: 390, width: 1464, height: 110 },
    { text: "تشهد منصة سراج بأن الطالب", x: 600, y: 510, width: 1264, height: 90 },
    { text: data.studentName, x: 482, y: 717, width: 1500, height: 240 },
    { text: "قد أتم بنجاح دورة", x: 700, y: 955, width: 1064, height: 90 },
    { text: data.courseTitle, x: 82, y: 1015, width: 2300, height: 182 },
    { text: "وأتم متطلبات الدورة واجتاز التقييم بنجاح.", x: 450, y: 1200, width: 1564, height: 90 },
    { text: `الدرجة: ${data.scoreText}`, x: 965, y: 1313, width: 650, height: 47 },
    { text: `التقييم: ${data.gradeText}`, x: 965, y: 1389, width: 650, height: 47 },
    { text: `تاريخ الإتمام: ${clean(data.dateText)}`, x: 965, y: 1465, width: 650, height: 47 },
    { text: `مدة الدورة: ${data.durationText}`, x: 965, y: 1542, width: 650, height: 47 },
    { text: "رمز التحقق", x: 300, y: 1488, width: 230, height: 50 },
    { text: data.code, x: 218, y: 1575, width: 400, height: 35 },
  ];
}

function utf16Hex(text: string): string {
  let hex = "";
  for (let index = 0; index < text.length; index += 1) {
    hex += text.charCodeAt(index).toString(16).padStart(4, "0");
  }
  return hex.toUpperCase();
}

function createToUnicodeCMap(textRuns: PdfTextRun[]): Buffer {
  const codeUnits = new Set<number>();
  for (const run of textRuns) {
    for (let index = 0; index < run.text.length; index += 1) {
      codeUnits.add(run.text.charCodeAt(index));
    }
  }

  const mappings = [...codeUnits].map((codeUnit) => {
    const code = codeUnit.toString(16).padStart(4, "0").toUpperCase();
    return `<${code}> <${code}>`;
  });
  const mappingBlocks: string[] = [];
  for (let index = 0; index < mappings.length; index += 100) {
    const block = mappings.slice(index, index + 100);
    mappingBlocks.push(`${block.length} beginbfchar\n${block.join("\n")}\nendbfchar`);
  }

  return Buffer.from(
    [
      "/CIDInit /ProcSet findresource begin",
      "12 dict begin",
      "begincmap",
      "/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def",
      "/CMapName /SirajCertificateUnicode def",
      "/CMapType 2 def",
      "1 begincodespacerange",
      "<0000> <FFFF>",
      "endcodespacerange",
      ...mappingBlocks,
      "endcmap",
      "CMapName currentdict /CMap defineresource pop",
      "end",
      "end",
    ].join("\n"),
    "ascii",
  );
}

/**
 * Places the exact rendered certificate image into a print-ready PDF page.
 * The PNG is decoded and embedded as lossless RGB pixels, so text, QR, and
 * template stay visually identical to the on-platform certificate.
 */
export async function certificatePngToPdf(
  png: Buffer,
  textData: CertificatePdfTextData,
): Promise<Buffer> {
  const image = await loadImage(png);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);

  const rgba = context.getImageData(0, 0, image.width, image.height).data;
  const rgb = Buffer.allocUnsafe(image.width * image.height * 3);
  for (let source = 0, target = 0; source < rgba.length; source += 4, target += 3) {
    rgb[target] = rgba[source];
    rgb[target + 1] = rgba[source + 1];
    rgb[target + 2] = rgba[source + 2];
  }

  const imageData = deflateSync(rgb);
  const scale = A4_LANDSCAPE_WIDTH_PT / image.width;
  const drawWidth = A4_LANDSCAPE_WIDTH_PT;
  const drawHeight = image.height * scale;
  const offsetY = (A4_LANDSCAPE_HEIGHT_PT - drawHeight) / 2;
  const textRuns = certificateTextRuns(textData);
  const textCommands = textRuns.map((run) => {
    const cleanText = run.text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
    const textWidth = run.width * scale;
    const horizontalScale = (textWidth / (Math.max(cleanText.length, 1) * PDF_TEXT_FONT_SIZE_PT)) * 100;
    const x = run.x * scale;
    const y = A4_LANDSCAPE_HEIGHT_PT - (run.y + run.height / 2) * scale;
    return `/Span << /ActualText <FEFF${utf16Hex(cleanText)}> >> BDC\nBT /SirajText ${PDF_TEXT_FONT_SIZE_PT} Tf 3 Tr ${horizontalScale} Tz 1 0 0 1 ${x} ${y} Tm <${utf16Hex(cleanText)}> Tj ET\nEMC\n`;
  });
  const content = Buffer.from(
    `q\n${drawWidth} 0 0 ${drawHeight} 0 ${offsetY} cm\n/Certificate Do\nQ\n${textCommands.join("")}`,
    "ascii",
  );
  const cmap = createToUnicodeCMap(textRuns);
  const font = readFileSync(REGULAR_FONT_PATH);
  const compressedFont = deflateSync(font);

  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "ascii"),
    Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_LANDSCAPE_WIDTH_PT} ${A4_LANDSCAPE_HEIGHT_PT}] /Resources << /XObject << /Certificate 4 0 R >> /Font << /SirajText 6 0 R >> >> /Contents 5 0 R >>`,
      "ascii",
    ),
    Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${imageData.length} >>\nstream\n`,
        "ascii",
      ),
      imageData,
      Buffer.from("\nendstream", "ascii"),
    ]),
    Buffer.concat([
      Buffer.from(`<< /Length ${content.length} >>\nstream\n`, "ascii"),
      content,
      Buffer.from("endstream", "ascii"),
    ]),
    Buffer.from("<< /Type /Font /Subtype /Type0 /BaseFont /SirajNaskhArabic /Encoding /Identity-H /DescendantFonts [7 0 R] /ToUnicode 9 0 R >>", "ascii"),
    Buffer.from("<< /Type /Font /Subtype /CIDFontType2 /BaseFont /SirajNaskhArabic /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 8 0 R /DW 1000 /CIDToGIDMap /Identity >>", "ascii"),
    Buffer.from("<< /Type /FontDescriptor /FontName /SirajNaskhArabic /Flags 4 /FontBBox [-1000 -500 3000 2000] /ItalicAngle 0 /Ascent 1000 /Descent -500 /CapHeight 700 /StemV 80 /FontFile2 10 0 R >>", "ascii"),
    Buffer.concat([
      Buffer.from(`<< /Length ${cmap.length} >>\nstream\n`, "ascii"),
      cmap,
      Buffer.from("\nendstream", "ascii"),
    ]),
    Buffer.concat([
      Buffer.from(`<< /Length ${compressedFont.length} /Length1 ${font.length} /Filter /FlateDecode >>\nstream\n`, "ascii"),
      compressedFont,
      Buffer.from("\nendstream", "ascii"),
    ]),
  ];

  const chunks: Buffer[] = [Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])];
  const offsets = [0];
  let length = chunks[0].length;

  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(length);
    const object = Buffer.concat([
      Buffer.from(`${index + 1} 0 obj\n`, "ascii"),
      objects[index],
      Buffer.from("\nendobj\n", "ascii"),
    ]);
    chunks.push(object);
    length += object.length;
  }

  const xrefOffset = length;
  const xref = [
    `xref\n0 ${objects.length + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ].join("");
  chunks.push(Buffer.from(xref, "ascii"));

  return Buffer.concat(chunks);
}
