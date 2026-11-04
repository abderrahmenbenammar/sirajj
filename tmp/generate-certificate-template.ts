import { mkdir, writeFile } from "node:fs/promises";
import { certificateTemplateToPdf } from "../src/lib/certificates/pdf";

const pdf = await certificateTemplateToPdf();
await mkdir("output/pdf", { recursive: true });
await mkdir("public/certificates", { recursive: true });
await Promise.all([
  writeFile("output/pdf/siraj-certificate-template.pdf", pdf),
  writeFile("public/certificates/siraj-certificate-template.pdf", pdf),
]);
console.log(`Generated blank certificate template (${pdf.length} bytes).`);
