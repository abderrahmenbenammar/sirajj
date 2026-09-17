import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MAX_ORDER_RETRIES = 5;

export type NewLessonInput = {
  courseId: string;
  titleAr: string;
  titleEn: string;
  videoUrl: string;
  subtitleUrl?: string | null;
};

export class LessonOrderConflictError extends Error {
  constructor() {
    super("lesson_order_conflict");
    this.name = "LessonOrderConflictError";
  }
}

// orderIndex is assigned automatically as one past the highest index in the
// course, so new lessons always appear last. The read + insert run in one
// transaction and retry on the (courseId, orderIndex) unique clash, which can
// only occur when two lessons are added to the same course concurrently.
export async function createLessonWithNextOrder(data: NewLessonInput) {
  for (let attempt = 0; attempt <= MAX_ORDER_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const last = await tx.lesson.findFirst({
          where: { courseId: data.courseId },
          orderBy: { orderIndex: "desc" },
          select: { orderIndex: true },
        });
        return tx.lesson.create({
          data: { ...data, orderIndex: (last?.orderIndex ?? 0) + 1 },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new LessonOrderConflictError();
}
