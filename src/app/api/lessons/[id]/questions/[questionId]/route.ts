import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string; questionId: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CONTENT_LENGTH = 2000;

const USER_SELECT = { select: { id: true, fullName: true, role: true } } as const;

function toUser(user: { id: string; fullName: string; role: string }) {
  return { id: user.id, name: user.fullName, role: user.role };
}

// Loads the target row scoped to the lesson path and checks ownership:
// only the author (or an ADMIN) may edit/delete it. Returns null when the
// item does not exist in this lesson (404) and an error response when the
// user is not allowed (403).
async function authorizeItem(
  questionId: string,
  lessonId: string,
  userId: string,
  role: string | undefined,
): Promise<
  | { item: { id: string; userId: string }; error?: undefined }
  | { item?: undefined; error: NextResponse }
> {
  if (!UUID_RE.test(questionId)) {
    return { error: NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 }) };
  }
  const item = await prisma.lessonQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, lessonId: true, userId: true },
  });
  if (!item || item.lessonId !== lessonId) {
    return { error: NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 }) };
  }
  if (item.userId !== userId && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "لا تملك صلاحية لهذا الإجراء" }, { status: 403 }) };
  }
  return { item };
}

// Removes a question (cascading its replies) or a single reply.
export async function DELETE(_request: Request, { params }: Context) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: lessonId, questionId } = await params;

  try {
    const authorized = await authorizeItem(questionId, lessonId, userId, session?.user?.role);
    if (authorized.error) return authorized.error;

    await prisma.lessonQuestion.delete({ where: { id: authorized.item.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[lesson-questions] failed to delete item", lessonId, questionId, error);
    return NextResponse.json({ error: "تعذر حذف العنصر، حاول مجددًا" }, { status: 500 });
  }
}

// Edits the content of a question or a reply. Returns the updated item in
// the same shape the list endpoint uses.
export async function PATCH(request: Request, { params }: Context) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: lessonId, questionId } = await params;

  try {
    const authorized = await authorizeItem(questionId, lessonId, userId, session?.user?.role);
    if (authorized.error) return authorized.error;

    const body: unknown = await request.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    const { content } = body as { content?: unknown };
    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "محتوى السؤال مطلوب" }, { status: 400 });
    }
    const trimmed = content.trim();
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: "محتوى السؤال طويل جدًا" }, { status: 400 });
    }

    const updated = await prisma.lessonQuestion.update({
      where: { id: authorized.item.id },
      data: { content: trimmed },
      select: { id: true, content: true, createdAt: true, user: USER_SELECT },
    });

    return NextResponse.json({
      id: updated.id,
      content: updated.content,
      createdAt: updated.createdAt.toISOString(),
      user: toUser(updated.user),
    });
  } catch (error) {
    console.error("[lesson-questions] failed to update item", lessonId, questionId, error);
    return NextResponse.json({ error: "تعذر حفظ التعديل، حاول مجددًا" }, { status: 500 });
  }
}
