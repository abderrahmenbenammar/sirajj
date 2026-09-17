import { prisma } from "@/lib/prisma";
import { examValidity, passedExamIdsForStudent } from "@/lib/exams-server";

// Server-side lesson gating. A lesson's exam lives on the lesson itself
// (Exam.lessonId); the student must pass it before any *later* lesson in
// orderIndex becomes reachable. Locks are cumulative: an unmet required exam in
// any earlier lesson keeps every following lesson locked. Truth is always read
// from ExamAttempt rows, so hiding UI is never the protection.

export interface GateLesson {
  id: string;
  titleAr: string;
  titleEn: string;
  orderIndex: number;
  videoUrl: string;
}

export interface GateExamRef {
  id: string;
  lessonId: string;
  titleAr: string;
  titleEn: string;
  passingScorePercentage: number;
  maxAttempts: number;
  questionCount: number;
  available: boolean;
}

export interface CourseGate {
  lessons: GateLesson[];
  /** All exams linked to a lesson, keyed by lesson id (ordered by creation). */
  examsByLesson: Map<string, GateExamRef[]>;
  /** Lessons that actually gate the next lesson (>=1 answerable exam). */
  gatedLessonIds: Set<string>;
  /** Lessons whose gate is satisfied for this viewer (or that have no gate). */
  clearedLessonIds: Set<string>;
  /** Lessons the viewer may not open yet. */
  lockedLessonIds: Set<string>;
}

// Loads one course and resolves the access state for a viewer in a single pass.
// `studentId` is null for anonymous visitors, who can never satisfy a gate.
export async function loadCourseGate(studentId: string | null, courseId: string): Promise<CourseGate> {
  const [lessons, exams] = await Promise.all([
    prisma.lesson.findMany({
      where: { courseId },
      orderBy: { orderIndex: "asc" },
      select: { id: true, titleAr: true, titleEn: true, orderIndex: true, videoUrl: true },
    }),
    prisma.exam.findMany({
      where: { courseId, lessonId: { not: null } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        lessonId: true,
        titleAr: true,
        titleEn: true,
        passingScorePercentage: true,
        maxAttempts: true,
      },
    }),
  ]);

  const validity = await Promise.all(exams.map((exam) => examValidity(exam.id)));

  const examsByLesson = new Map<string, GateExamRef[]>();
  const gatedLessonIds = new Set<string>();
  const gatingExamIds: string[] = [];

  exams.forEach((exam, index) => {
    if (!exam.lessonId) return;
    const ref: GateExamRef = {
      id: exam.id,
      lessonId: exam.lessonId,
      titleAr: exam.titleAr,
      titleEn: exam.titleEn,
      passingScorePercentage: exam.passingScorePercentage,
      maxAttempts: exam.maxAttempts,
      questionCount: validity[index].questionCount,
      available: validity[index].available,
    };
    const list = examsByLesson.get(exam.lessonId) ?? [];
    list.push(ref);
    examsByLesson.set(exam.lessonId, list);
    if (ref.available) {
      gatedLessonIds.add(exam.lessonId);
      gatingExamIds.push(ref.id);
    }
  });

  const passedExamIds = studentId ? await passedExamIdsForStudent(studentId, gatingExamIds) : new Set<string>();

  // A gated lesson is cleared once the viewer passed at least one of its
  // answerable exams; un-gated lessons are always cleared.
  const clearedLessonIds = new Set<string>();
  for (const lesson of lessons) {
    if (!gatedLessonIds.has(lesson.id)) {
      clearedLessonIds.add(lesson.id);
      continue;
    }
    const list = examsByLesson.get(lesson.id) ?? [];
    if (list.some((exam) => exam.available && passedExamIds.has(exam.id))) {
      clearedLessonIds.add(lesson.id);
    }
  }

  // Locks are cumulative: once any earlier lesson has an unmet required exam,
  // every following lesson stays locked until that exam is passed. A gated
  // lesson itself is never locked by its own exam (only the lessons after it),
  // so the student can always open it and take the exam. This is what makes the
  // sequence Lesson1(Exam) -> Lesson2 -> Lesson3(Exam) -> ... hold for any count.
  const lockedLessonIds = new Set<string>();
  let hasEarlierUnmetGate = false;
  for (const lesson of lessons) {
    if (hasEarlierUnmetGate) lockedLessonIds.add(lesson.id);
    if (gatedLessonIds.has(lesson.id) && !clearedLessonIds.has(lesson.id)) {
      hasEarlierUnmetGate = true;
    }
  }

  return { lessons, examsByLesson, gatedLessonIds, clearedLessonIds, lockedLessonIds };
}
