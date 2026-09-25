// Shared client-side types + fetchers for real course data (PostgreSQL via /api/courses).
// Matches the JSON shape returned by the public courses API — no mock-data involved.

export interface ApiCurriculumItem {
  id: string;
  title: string;
  titleEn: string;
  duration: string;
  type: string;
  videoUrl: string;
  locked?: boolean;
  hasExam?: boolean;
}

export interface ApiCourseReference {
  id: string;
  type: string;
  titleAr: string;
  titleEn: string;
  authorName: string | null;
  contentUrl: string;
  categoryAr: string | null;
  categoryEn: string | null;
}

export interface ApiCourse {
  id: string;
  title: string;
  titleEn: string;
  instructor: string;
  instructorEn: string;
  description: string;
  descriptionEn: string;
  image: string;
  path: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  pathAr: string;
  pathEn: string;
  duration: string;
  // Manual course duration in seconds (NULL = unspecified). The single
  // source of course length shown to students.
  durationSeconds: number | null;
  lessons: number;
  curriculum: ApiCurriculumItem[];
  examLessonIds?: string[];
  references: ApiCourseReference[];
  progress?: number;
  completedLessonIds?: string[];
}

function unwrapCourses(data: unknown): ApiCourse[] {
  if (Array.isArray(data)) return data as ApiCourse[];
  if (typeof data === "object" && data !== null && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: unknown }).items as ApiCourse[];
  }
  return [];
}

export async function fetchCourses(): Promise<ApiCourse[]> {
  const response = await fetch("/api/courses");
  if (!response.ok) return [];
  const data: unknown = await response.json();
  return unwrapCourses(data);
}

// Card-only course shape (no lesson rows, video URLs, descriptions or
// references). Used by every list/search UI; the card component accepts
// exactly this, so full ApiCourse objects stay assignable everywhere.
export type CourseCardData = Pick<
  ApiCourse,
  | "id"
  | "title"
  | "titleEn"
  | "instructor"
  | "instructorEn"
  | "image"
  | "path"
  | "pathAr"
  | "pathEn"
  | "duration"
  | "lessons"
  | "durationSeconds"
>;

// Server-side search over the summary shape with an honest total match
// count. Used by list pages, navbar suggestions and /search (no
// full-catalog download, no lesson video URLs on the wire).
export async function searchCourses(
  options: { q?: string; take?: number; skip?: number; path?: string; signal?: AbortSignal } = {}
): Promise<{ items: CourseCardData[]; total: number }> {
  const params = new URLSearchParams({ summary: "1" });
  if (options.q) params.set("q", options.q);
  if (options.take !== undefined) params.set("take", String(options.take));
  if (options.skip !== undefined) params.set("skip", String(options.skip));
  if (options.path) params.set("path", options.path);
  const response = await fetch(`/api/courses?${params.toString()}`, options.signal ? { signal: options.signal } : undefined);
  if (!response.ok) return { items: [], total: 0 };
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null) return { items: [], total: 0 };
  const { items, total } = data as { items: unknown; total: unknown };
  return {
    items: Array.isArray(items) ? (items as CourseCardData[]) : [],
    total: typeof total === "number" ? total : 0,
  };
}

export async function fetchCourse(id: string): Promise<ApiCourse | null> {
  const response = await fetch(`/api/courses/${id}`);
  if (!response.ok) return null;
  return (await response.json()) as ApiCourse;
}
