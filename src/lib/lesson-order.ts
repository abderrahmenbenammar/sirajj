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
//
// The whole reorder runs in ONE transaction but issues only a fixed number of
// statements (validate + two bulk UPDATEs + reload) instead of the previous
// 2 + 2N per-row updates. That matters on a pooled/high-latency connection
// (Supabase transaction pooler): a 16-lesson course used to need 34 sequential
// round-trips and blew past Prisma's 5s interactive-transaction timeout (P2028);
// now it needs 4 no matter how many lessons there are.
//
// The swap is done in two bulk UPDATEs because PostgreSQL enforces the
// (courseId, orderIndex) unique constraint row by row, not at statement end;
// writing final values directly could momentarily collide while two rows swap.
// Phase 1 parks every lesson ABOVE the course's current maximum index (a range
// no live row occupies, so it can never clash and no fixed constant is needed),
// then phase 2 writes the final 1..N values into slots that are now all free.
export async function reorderCourseLessons(courseId: string, orderedLessonIds: string[]) {
  for (let attempt = 0; attempt <= MAX_ORDER_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const lessons = await tx.lesson.findMany({
            where: { courseId },
            select: { id: true, orderIndex: true },
          });
          const existingIds = new Set(lessons.map((lesson) => lesson.id));
          const requestedIds = new Set(orderedLessonIds);
          const isValid =
            orderedLessonIds.length === lessons.length &&
            requestedIds.size === orderedLessonIds.length &&
            orderedLessonIds.every((id) => existingIds.has(id));
          if (!isValid) throw new InvalidLessonOrderError();
          if (orderedLessonIds.length === 0) return [];

          const tempBase = lessons.reduce((max, lesson) => Math.max(max, lesson.orderIndex), 0) + 1;

          // Phase 1: park everything in one statement, all of it parameterized.
          const parked = Prisma.join(
            orderedLessonIds.map((id, index) => Prisma.sql`(${id}::uuid, ${tempBase + index}::int)`)
          );
          await tx.$executeRaw`
            UPDATE "lessons" AS l
            SET "order_index" = v."new_order"
            FROM (VALUES ${parked}) AS v("id", "new_order")
            WHERE l."id" = v."id" AND l."course_id" = ${courseId}::uuid
          `;

          // Phase 2: write the final contiguous 1..N order in one statement.
          const finalOrder = Prisma.join(
            orderedLessonIds.map((id, index) => Prisma.sql`(${id}::uuid, ${index + 1}::int)`)
          );
          await tx.$executeRaw`
            UPDATE "lessons" AS l
            SET "order_index" = v."new_order"
            FROM (VALUES ${finalOrder}) AS v("id", "new_order")
            WHERE l."id" = v."id" AND l."course_id" = ${courseId}::uuid
          `;

          return tx.lesson.findMany({ where: { courseId }, orderBy: { orderIndex: "asc" } });
        },
        // Safety net only. The design above keeps this at 4 statements, so the
        // default 5s is ample; this guards a cold pooled connection being slow
        // to acquire. It is NOT the fix for the round-trip cost.
        { maxWait: 15000, timeout: 20000 }
      );
    } catch (error) {
      if (error instanceof InvalidLessonOrderError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
  throw new LessonOrderConflictError();
}
