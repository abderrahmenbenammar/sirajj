import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildExamDetail } from "@/lib/exams-server";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  const detail = await buildExamDetail(id, studentId);
  if (!detail) return NextResponse.json({ error: "الاختبار غير موجود" }, { status: 404 });

  return NextResponse.json(detail);
}
