import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

type Context = { params: Promise<{ id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CONTENT_LENGTH = 2000;

const USER_SELECT = { select: { id: true, fullName: true, role: true } } as const;

function toUser(user: { id: string; fullName: string; role: string }) {
  return { id: user.id, name: user.fullName, role: user.role };
}

// Top-level questions, newest first, each with its replies (oldest first)
// and both authors' display names. A failed read (e.g. the lesson_questions
// table not migrated yet) must never break the lesson page: log and return
// an empty list instead.
export async function GET(_request: Request, { params }: Context) {
  const { id: lessonId } = await params;
  if (!UUID_RE.test(lessonId)) {
    return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  }

  try {
    const questions = await prisma.lessonQuestion.findMany({
      where: { lessonId, parentId: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: USER_SELECT,
        replies: {
          orderBy: { createdAt: "asc" },
          select: { id: true, content: true, createdAt: true, user: USER_SELECT },
        },
      },
    });

    return NextResponse.json({
      questions: questions.map((question) => ({
        id: question.id,
        content: question.content,
        createdAt: question.createdAt.toISOString(),
        user: toUser(question.user),
        replies: question.replies.map((reply) => ({
          id: reply.id,
          content: reply.content,
          createdAt: reply.createdAt.toISOString(),
          user: toUser(reply.user),
        })),
      })),
    });
  } catch (error) {
    console.error("[lesson-questions] failed to load questions", lessonId, error);
    return NextResponse.json({ questions: [] });
  }
}

export async function POST(request: Request, { params }: Context) {
  const session = await auth();
  const studentId = session?.user?.id;
  if (!studentId) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const { id: lessonId } = await params;
  if (!UUID_RE.test(lessonId)) {
    return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, courseId: true, titleAr: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "الدرس غير موجود" }, { status: 404 });
    }

    const body: unknown = await request.json().catch(() => null);
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    const { content, parentId: rawParentId } = body as { content?: unknown; parentId?: unknown };

    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "محتوى السؤال مطلوب" }, { status: 400 });
    }
    const trimmed = content.trim();
    if (trimmed.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json({ error: "محتوى السؤال طويل جدًا" }, { status: 400 });
    }

    let parentId: string | null = null;
    let parentUserId: string | null = null;
    if (rawParentId !== undefined && rawParentId !== null) {
      if (typeof rawParentId !== "string" || !UUID_RE.test(rawParentId)) {
        return NextResponse.json({ error: "رد غير صالح" }, { status: 400 });
      }
      const parent = await prisma.lessonQuestion.findUnique({
        where: { id: rawParentId },
        select: { id: true, lessonId: true, parentId: true, userId: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "السؤال غير موجود" }, { status: 404 });
      }
      if (parent.lessonId !== lessonId) {
        return NextResponse.json({ error: "رد غير صالح" }, { status: 400 });
      }
      if (parent.parentId !== null) {
        return NextResponse.json({ error: "لا يمكن الرد على رد" }, { status: 400 });
      }
      parentId = parent.id;
      parentUserId = parent.userId;
    }

    const created = await prisma.lessonQuestion.create({
      data: { content: trimmed, lessonId, userId: studentId, parentId },
      select: { id: true, content: true, createdAt: true, user: USER_SELECT },
    });
    const createdItem = {
      id: created.id,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
      user: toUser(created.user),
    };

    const link = `/courses/${lesson.courseId}/lessons/${lesson.id}#lesson-qa`;
    if (parentId === null) {
      // Notify every admin about the new question. Fire-and-forget: a
      // notification failure must NEVER break the Q&A response. In-app and
      // web push degrade independently of each other.
      void (async () => {
        let adminIds: string[] = [];
        try {
          const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
          adminIds = admins.map((admin) => admin.id);
          if (adminIds.length > 0) {
            await prisma.notification.createMany({
              data: adminIds.map((adminId) => ({
                userId: adminId,
                title: "سؤال جديد",
                message: `سؤال جديد في درس: ${lesson.titleAr}`,
                link,
              })),
            });
          }
        } catch (error) {
          console.error("[notifications] failed to notify admins about question", error);
        }
        if (adminIds.length > 0) {
          await sendPushToUsers(adminIds, {
            title: "سؤال جديد",
            body: `سؤال جديد في درس: ${lesson.titleAr}`,
            url: link,
          });
        }
      })();
      return NextResponse.json({ parentId: null, question: { ...createdItem, replies: [] } });
    }

    if (parentUserId !== null && parentUserId !== studentId) {
      // Notify the question author about the reply (never oneself).
      const recipientId: string = parentUserId;
      void (async () => {
        try {
          await prisma.notification.create({
            data: {
              userId: recipientId,
              title: "رد جديد",
              message: "تم الرد على سؤالك في منصة سراج",
              link,
            },
          });
        } catch (error) {
          console.error("[notifications] failed to notify author about reply", error);
        }
        await sendPushToUsers([recipientId], {
          title: "رد جديد",
          body: "تم الرد على سؤالك في منصة سراج",
          url: link,
        });
      })();
    }
    return NextResponse.json({ parentId, reply: createdItem });
  } catch (error) {
    console.error("[lesson-questions] failed to create question", lessonId, error);
    return NextResponse.json({ error: "تعذر حفظ السؤال، حاول مجددًا" }, { status: 500 });
  }
}
