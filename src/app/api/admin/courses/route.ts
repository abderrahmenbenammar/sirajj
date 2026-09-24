import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { isCoursePath } from "@/lib/course-paths";
import { normalizeLibraryItemIds, libraryItemsExist } from "@/lib/course-references";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const [courses, instructors] = await Promise.all([
    prisma.course.findMany({
      include: {
        lessons: { orderBy: { orderIndex: "asc" } },
        instructor: { select: { nameAr: true, nameEn: true } },
        libraryReferences: {
          include: { libraryItem: { select: { id: true, type: true, titleAr: true, titleEn: true, authorName: true } } },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.instructor.findMany({ orderBy: { nameAr: "asc" } }),
  ]);
  // Mfeature_video_duration_cancelled: computedDurationSeconds set to null since YouTube duration feature is cancelled
  const withDurations = courses.map((course) => ({ ...course, computedDurationSeconds: null }));
  return NextResponse.json({ courses: withDurations, instructors });
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Manual course duration in seconds. NULL/empty means "unspecified"; 0 is
// normalized to NULL (a zero-length course is meaningless). Anything else
// (negative, fractional, wrong type) is INVALID and must be rejected.
function asDurationSeconds(value: unknown): number | null | "INVALID" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return "INVALID";
  if (value === 0) return null;
  return value;
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const body = await request.json();
  const titleAr = asText(body.titleAr) ?? asText(body.title);
  if (!titleAr) {
    return NextResponse.json({ error: "بيانات الدورة غير صحيحة" }, { status: 400 });
  }
  const path = asText(body.path);
  if (!isCoursePath(path)) {
    return NextResponse.json({ error: "المسار مطلوب (BEGINNER أو INTERMEDIATE أو ADVANCED)" }, { status: 400 });
  }
  const instructorId = asText(body.instructorId);
  if (instructorId && !(await prisma.instructor.findUnique({ where: { id: instructorId }, select: { id: true } }))) {
    return NextResponse.json({ error: "المدرّس غير موجود" }, { status: 400 });
  }
  // References link real LibraryItems only: reject malformed/deduped duplicate
  // ids, and reject any id that does not belong to an existing library item.
  const libraryItemIds = normalizeLibraryItemIds(body.libraryItemIds);
  if (libraryItemIds === null) {
    return NextResponse.json({ error: "معرفات المراجع غير صحيحة" }, { status: 400 });
  }
  if (!(await libraryItemsExist(prisma, libraryItemIds))) {
    return NextResponse.json({ error: "أحد عناصر المكتبة المختارة غير موجود" }, { status: 400 });
  }
  const durationSeconds = asDurationSeconds(body.durationSeconds);
  if (durationSeconds === "INVALID") {
    return NextResponse.json({ error: "مدة الدورة غير صحيحة" }, { status: 400 });
  }
  const course = await prisma.$transaction(async (tx) => {
    const created = await tx.course.create({
      data: {
        titleAr,
        titleEn: asText(body.titleEn) ?? titleAr,
        shortDescriptionAr: asText(body.shortDescriptionAr) ?? asText(body.description),
        shortDescriptionEn: asText(body.shortDescriptionEn),
        curriculumAr: asText(body.curriculumAr),
        curriculumEn: asText(body.curriculumEn),
        instructorNameAr: asText(body.instructorNameAr),
        instructorNameEn: asText(body.instructorNameEn),
        path,
        instructorId,
        durationSeconds,
        coverImageUrl: asText(body.coverImageUrl) ?? asText(body.image),
        ...(libraryItemIds.length > 0
          ? {
              libraryReferences: {
                create: libraryItemIds.map((libraryItemId, orderIndex) => ({ libraryItemId, orderIndex })),
              },
            }
          : {}),
      },
    });
    return created;
  });
  return NextResponse.json(course, { status: 201 });
}
