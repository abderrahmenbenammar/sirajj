import { createCanvas, loadImage } from "@napi-rs/canvas";
import { deflateSync } from "node:zlib";

const A4_LANDSCAPE_WIDTH_PT = 841.89;
const A4_LANDSCAPE_HEIGHT_PT = 595.28;

/**
 * Places the exact rendered certificate image into a print-ready PDF page.
 * The PNG is decoded and embedded as lossless RGB pixels, so text, QR, and
 * template stay visually identical to the on-platform certificate.
 */
export async function certificatePngToPdf(png: Buffer): Promise<Buffer> {
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
  const content = Buffer.from(
    `q\n${drawWidth} 0 0 ${drawHeight} 0 ${offsetY} cm\n/Certificate Do\nQ\n`,
    "ascii",
  );

  const objects = [
    Buffer.from("<< /Type /Catalog /Pages 2 0 R >>", "ascii"),
    Buffer.from("<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "ascii"),
    Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_LANDSCAPE_WIDTH_PT} ${A4_LANDSCAPE_HEIGHT_PT}] /Resources << /XObject << /Certificate 4 0 R >> >> /Contents 5 0 R >>`,
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
