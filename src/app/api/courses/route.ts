import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COURSE_PATH_LABELS, isCoursePath } from "@/lib/course-paths";
import { PUBLIC_LIST_CACHE_HEADERS } from "@/lib/http-cache";

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

// Public course listing over real courses. Optional server-side search
// (case-insensitive across titles and instructor names, backed by the same
// pattern as /api/library) with take/skip paging. The response carries the
// total match count so search UIs can show honest counts.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // summary=1 returns only course-card fields (no lesson rows, video URLs,
  // descriptions or references) for list/search UIs. Full shape stays the
  // default so existing callers are unaffected.
  const summary = searchParams.get("summary") === "1";
  const q = asText(searchParams.get("q"));
  const takeRaw = asInt(searchParams.get("take"));
  const skipRaw = asInt(searchParams.get("skip") ?? 0);
  if ((searchParams.get("take") !== null && (takeRaw === null || takeRaw < 1 || takeRaw > 100)) ||
      (searchParams.get("skip") !== null && (skipRaw === null || skipRaw < 0))) {
    return NextResponse.json({ error: "قيم التقسيم غير صالحة" }, { status: 400 });
  }
  const pathFilter = asText(searchParams.get("path"));
  if (pathFilter !== null && !isCoursePath(pathFilter)) {
    return NextResponse.json({ error: "مسار غير صالح" }, { status: 400 });
  }
  const where = {
    ...(pathFilter ? { path: pathFilter } : {}),
    ...(q
      ? {
          OR: [
            { titleAr: { contains: q, mode: "insensitive" as const } },
            { titleEn: { contains: q, mode: "insensitive" as const } },
            { instructorNameAr: { contains: q, mode: "insensitive" as const } },
            { instructorNameEn: { contains: q, mode: "insensitive" as const } },
            { instructor: { nameAr: { contains: q, mode: "insensitive" as const } } },
            { instructor: { nameEn: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [total, courses] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      include: {
        instructor: { select: { nameAr: true, nameEn: true } },
        lessons: { orderBy: { orderIndex: "asc" } },
        libraryReferences: {
          include: { libraryItem: { include: { category: { select: { id: true, nameAr: true, nameEn: true } } } } },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
      take: takeRaw ?? undefined,
      skip: skipRaw ?? undefined,
    }),
  ]);
  const cardFields = (course: (typeof courses)[number]) => ({
    id: course.id,
    title: course.titleAr,
    titleEn: course.titleEn,
    instructor: course.instructorNameAr ?? course.instructor?.nameAr ?? "",
    instructorEn: course.instructorNameEn ?? course.instructor?.nameEn ?? "",
    image: course.coverImageUrl ?? "",
    path: course.path,
    pathAr: COURSE_PATH_LABELS[course.path].ar,
    pathEn: COURSE_PATH_LABELS[course.path].en,
    duration: `${course.lessons.length} درس`,
    lessons: course.lessons.length,
    // Manual course duration (seconds, NULL = unspecified). The single
    // source of course length; never computed from lesson videos here.
    durationSeconds: course.durationSeconds,
  });
  const items = summary
    ? courses.map((course) => cardFields(course))
    : courses.map((course) => ({
    ...cardFields(course),
    description: course.shortDescriptionAr ?? "",
    descriptionEn: course.shortDescriptionEn ?? "",
    curriculum: course.lessons.map((lesson) => ({ id: lesson.id, title: lesson.titleAr, titleEn: lesson.titleEn, duration: "فيديو", type: "video", videoUrl: lesson.videoUrl })),
    references: course.libraryReferences.map((ref) => ({
      id: ref.libraryItem.id,
      type: ref.libraryItem.type,
      titleAr: ref.libraryItem.titleAr,
      titleEn: ref.libraryItem.titleEn,
      authorName: ref.libraryItem.authorName,
      contentUrl: ref.libraryItem.contentUrl,
      categoryAr: ref.libraryItem.category?.nameAr ?? null,
      categoryEn: ref.libraryItem.category?.nameEn ?? null,
    })),
  }));
  return NextResponse.json({ items, total }, { headers: PUBLIC_LIST_CACHE_HEADERS });
}