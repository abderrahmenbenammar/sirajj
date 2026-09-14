// The three fixed learning paths. They are a postgres ENUM on courses.path —
// not free-form categories — and can never be expanded from the UI.
// Same source of truth for API validation, admin selects, public filters and
// the /paths page (always tercet; paths are never data-driven).

export const COURSE_PATHS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;
export type CoursePathKey = (typeof COURSE_PATHS)[number];

export const COURSE_PATH_LABELS: Record<CoursePathKey, { ar: string; en: string }> = {
  BEGINNER: { ar: "مبتدئ", en: "Beginner" },
  INTERMEDIATE: { ar: "متوسط", en: "Intermediate" },
  ADVANCED: { ar: "متقدم", en: "Advanced" },
};

export function isCoursePath(value: unknown): value is CoursePathKey {
  return typeof value === "string" && (COURSE_PATHS as readonly string[]).includes(value);
}