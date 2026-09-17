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

export class InvalidLessonOrderError extends Error {
  constructor() {
    super("invalid_lesson_order");
    this.name = "InvalidLessonOrderError";
  }
}

// Temporary slot used while renumbering. Every lesson is parked here first so
// the final 1..N writes can never collide with the (courseId, orderIndex)
// unique constraint (renumbering in place would clash while swapping rows).
const REORDER_TEMP_BASE = 1_000_000;

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

// Rewrites a course's lessons to a contiguous 1..N order matching
// `orderedLessonIds`. The caller must pass exactly the ids that currently
// belong to the course; anything else (missing, unknown or duplicate ids) is
// rejected so a lesson can never move between courses or leave a gap.
export async function reorderCourseLessons(courseId: string, orderedLessonIds: string[]) {
  for (let attempt = 0; attempt <= MAX_ORDER_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const lessons = await tx.lesson.findMany({ where: { courseId }, select: { id: true } });
        const existingIds = new Set(lessons.map((lesson) => lesson.id));
        const requestedIds = new Set(orderedLessonIds);
        const isValid =
          orderedLessonIds.length === lessons.length &&
          requestedIds.size === orderedLessonIds.length &&
          orderedLessonIds.every((id) => existingIds.has(id));
        if (!isValid) throw new InvalidLessonOrderError();

        // Phase 1: park every lesson in a unique, non-conflicting slot.
        for (let index = 0; index < orderedLessonIds.length; index++) {
          await tx.lesson.update({ where: { id: orderedLessonIds[index] }, data: { orderIndex: REORDER_TEMP_BASE + index } });
        }
        // Phase 2: write the final contiguous 1..N order.
        for (let index = 0; index < orderedLessonIds.length; index++) {
          await tx.lesson.update({ where: { id: orderedLessonIds[index] }, data: { orderIndex: index + 1 } });
        }
        return tx.lesson.findMany({ where: { courseId }, orderBy: { orderIndex: "asc" } });
      });
    } catch (error) {
      if (error instanceof InvalidLessonOrderError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new LessonOrderConflictError();
}
