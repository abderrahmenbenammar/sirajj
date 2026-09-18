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
  lessons: number;
  curriculum: ApiCurriculumItem[];
  examLessonIds?: string[];
  references: ApiCourseReference[];
  progress?: number;
  completedLessonIds?: string[];
}

export async function fetchCourses(): Promise<ApiCourse[]> {
  const response = await fetch("/api/courses");
  if (!response.ok) return [];
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as ApiCourse[]) : [];
}

export async function fetchCourse(id: string): Promise<ApiCourse | null> {
  const response = await fetch(`/api/courses/${id}`);
  if (!response.ok) return null;
  return (await response.json()) as ApiCourse;
}
