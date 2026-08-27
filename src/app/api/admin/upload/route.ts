import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const rules = {
  image: { types: new Set(["image/jpeg", "image/png", "image/webp"]), maxSize: 10 * 1024 * 1024, folder: "images" },
  video: { types: new Set(["video/mp4", "video/webm", "video/quicktime"]), maxSize: 250 * 1024 * 1024, folder: "videos" },
  document: { types: new Set(["application/pdf", "text/plain"]), maxSize: 25 * 1024 * 1024, folder: "documents" },
} as const;

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  const formData = await request.formData();
  const file = formData.get("file");
  const kind = formData.get("kind");
  const rule = typeof kind === "string" && kind in rules ? rules[kind as keyof typeof rules] : null;

  if (!(file instanceof File) || !rule || !rule.types.has(file.type) || file.size > rule.maxSize) {
    return NextResponse.json({ error: "نوع الملف أو حجمه غير مسموح" }, { status: 400 });
  }

  const extension = path.extname(file.name).toLowerCase() || (file.type === "image/png" ? ".png" : ".bin");
  const filename = `${randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", rule.folder);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/${rule.folder}/${filename}`, name: file.name });
}
