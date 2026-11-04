// Smoke test: render a sample certificate (PDF + image) using current source.
// Writes only into tmp/out so it never touches public/ assets.
import { mkdir, writeFile } from "node:fs/promises";
import { certificateDataToPdf } from "../src/lib/certificates/pdf";
import { renderCertificateImage, type CertificateRenderData } from "../src/lib/certificates/render";

const data: CertificateRenderData = {
  studentName: "أحمد بن محمد التجري",
  courseTitle: "دورة التمهيدي",
  scoreText: "95%",
  gradeText: "ممتاز",
  dateText: "2026-11-03",
  durationText: "40 ساعة",
  code: "SIRAJ-2026-TEST01",
  verifyUrl: "http://localhost:3000/verify/SIRAJ-2026-TEST01",
};

const pdf = await certificateDataToPdf(data);
if (!pdf || pdf.length < 1000) throw new Error(`PDF too small: ${pdf?.length}`);
if (!pdf.subarray(0, 5).toString().startsWith("%PDF")) throw new Error("Not a valid PDF header");

const image = await renderCertificateImage(data);
if (!image || image.length < 1000) throw new Error(`Image too small: ${image?.length}`);
if (!image.subarray(1, 4).toString().startsWith("PNG")) throw new Error("Not a valid PNG header");

await mkdir("tmp/out", { recursive: true });
await writeFile("tmp/out/verify-cert-render.pdf", pdf);
await writeFile("tmp/out/verify-cert-render.png", image);
console.log(`OK: PDF ${pdf.length} bytes, PNG ${image.length} bytes`);
