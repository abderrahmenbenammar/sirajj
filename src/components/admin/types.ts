// Shared admin types + form helpers (extracted from the former monolithic
// admin page so every /admin/* route shares the same shapes).

export type AdminLesson = {
  id: string;
  titleAr: string;
  titleEn: string;
  orderIndex: number;
  videoUrl: string;
  videoDurationSeconds: number | null;
};

export type Course = {
  id: string;
  titleAr: string;
  titleEn: string;
  shortDescriptionAr: string | null;
  shortDescriptionEn: string | null;
  curriculumAr: string | null;
  curriculumEn: string | null;
  instructorNameAr: string | null;
  instructorNameEn: string | null;
  instructorId: string | null;
  instructor: { nameAr: string; nameEn: string } | null;
  coverImageUrl: string | null;
  computedDurationSeconds: number | null;
  // Manual course duration in seconds (NULL = unspecified). Authoritative
  // course length; independent of lesson video lengths.
  durationSeconds: number | null;
  path: string;
  lessons: AdminLesson[];
  libraryReferences: { libraryItemId: string }[];
};

export type Subscriber = {
  id: string;
  fullName: string;
  email: string;
  authProvider: string;
  role: string;
  status: string;
  createdAt: string;
  _count: { courseProgress: number; certificates: number };
};

export type SubscriberDetails = Subscriber & {
  courseProgress: {
    completionPercentage: number;
    status: string;
    completedAt: string | null;
    course: { id: string; titleAr: string };
  }[];
  lessonCompletions: {
    completedAt: string;
    lesson: { titleAr: string; orderIndex: number; course: { titleAr: string } };
  }[];
};

export type LibraryItem = {
  id: string;
  type: string;
  titleAr: string;
  authorName: string | null;
  contentUrl: string;
  coverImageUrl: string | null;
  categoryId: string | null;
};

export type AdminCategory = { id: string; nameAr: string; nameEn: string; slug: string };

export type AdminFaq = {
  id: string;
  questionAr: string;
  questionEn: string;
  answerAr: string;
  answerEn: string;
  category: string;
  orderIndex: number;
};

export type AdminContact = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

export type AdminSubscriber = { id: string; email: string; subscribedAt: string };

export type AdminCertificate = {
  id: string;
  certificateCode: string;
  issueDate: string;
  student: { id: string; fullName: string; email: string };
  course: { id: string; titleAr: string };
};

export type AdminLessonOption = { id: string; titleAr: string; titleEn: string };

export type AdminExam = {
  id: string;
  courseId: string;
  courseTitleAr: string;
  titleAr: string;
  titleEn: string;
  lessonId: string | null;
  lesson: AdminLessonOption | null;
  passingScorePercentage: number;
  maxAttempts: number;
  questionCount: number;
  totalPoints: number;
  attemptCount: number;
  invalidQuestions: number;
  available: boolean;
};

export type AdminExamDetail = {
  id: string;
  course: { id: string; titleAr: string };
  lesson: AdminLessonOption | null;
  titleAr: string;
  titleEn: string;
  passingScorePercentage: number;
  maxAttempts: number;
  questions: {
    id: string;
    questionTextAr: string;
    questionTextEn: string;
    points: number;
    orderIndex: number;
    options: { id: string; optionTextAr: string; optionTextEn: string; isCorrect: boolean }[];
  }[];
};

export type BuilderOption = { textAr: string; textEn: string; isCorrect: boolean };
export type BuilderQuestion = { id: string; textAr: string; textEn: string; points: string; options: BuilderOption[] };

export const makeBuilderQuestion = (): BuilderQuestion => ({
  id: Math.random().toString(36).slice(2),
  textAr: "",
  textEn: "",
  points: "1",
  options: [
    { textAr: "", textEn: "", isCorrect: true },
    { textAr: "", textEn: "", isCorrect: false },
  ],
});

export const EMPTY_COURSE_FORM = {
  titleAr: "",
  titleEn: "",
  shortDescriptionAr: "",
  shortDescriptionEn: "",
  coverImageUrl: "",
  path: "BEGINNER",
  instructorNameAr: "",
  instructorNameEn: "",
  libraryItemIds: [] as string[],
};

// Cover image rules mirror the server's upload route (kind "image"):
// JPG/PNG/WEBP, up to 10MB. Enforced client-side for instant feedback; the
// server re-checks MIME + size regardless of what the client sends.
export const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_COVER_SIZE = 10 * 1024 * 1024;
