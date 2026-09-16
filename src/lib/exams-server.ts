import { prisma } from "@/lib/prisma";

// Shared server-side exam helpers (never import route files into each other).
// NOTE: student-facing queries below deliberately never select `isCorrect`.

export interface SafeOption {
  id: string;
  optionTextAr: string;
  optionTextEn: string;
}

export interface SafeQuestion {
  id: string;
  questionTextAr: string;
  questionTextEn: string;
  points: number;
  orderIndex: number;
  options: SafeOption[];
}

// An exam is answerable only when it has at least one question and every
// question has a correct option (no published flag exists in the schema).
export async function examValidity(examId: string) {
  const questionCount = await prisma.examQuestion.count({ where: { examId } });
  const invalidQuestions =
    questionCount === 0
      ? 0
      : await prisma.examQuestion.count({ where: { examId, options: { none: { isCorrect: true } } } });
  return { questionCount, available: questionCount > 0 && invalidQuestions === 0 };
}

export async function myExamStats(examId: string, studentId: string, maxAttempts: number) {
  const attempts = await prisma.examAttempt.findMany({
    where: { examId, studentId },
    orderBy: { attemptNumber: "desc" },
  });
  const completed = attempts.filter((attempt) => attempt.status === "completed");
  const inProgress = attempts.find((attempt) => attempt.status === "in_progress") ?? null;
  const last = completed[0] ?? null;
  return {
    attemptsUsed: completed.length,
    attemptsLeft: Math.max(0, maxAttempts - completed.length),
    inProgressAttemptId: inProgress?.id ?? null,
    lastResult: last
      ? {
          attemptId: last.id,
          attemptNumber: last.attemptNumber,
          score: Number(last.score),
          scorePercentage: Number(last.scorePercentage),
          passed: false,
        }
      : null,
  };
}

// Questions shaped for the student: texts + option ids/texts only, no keys.
export async function safeQuestions(examId: string): Promise<SafeQuestion[]> {
  const questions = await prisma.examQuestion.findMany({
    where: { examId },
    select: {
      id: true,
      questionTextAr: true,
      questionTextEn: true,
      points: true,
      orderIndex: true,
      options: { select: { id: true, optionTextAr: true, optionTextEn: true }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { orderIndex: "asc" },
  });
  return questions;
}

export async function myAnswersMap(attemptId: string): Promise<Record<string, string>> {
  const rows = await prisma.examAttemptAnswer.findMany({
    where: { attemptId },
    select: { questionId: true, selectedOptionId: true },
  });
  const map: Record<string, string> = {};
  for (const row of rows) map[row.questionId] = row.selectedOptionId;
  return map;
}

// Subset of exam ids for which this student owns at least one completed attempt
// whose score meets that exam's own passing threshold. Truth always comes from
// persisted ExamAttempt rows — never from client state.
export async function passedExamIdsForStudent(studentId: string, examIds: string[]): Promise<Set<string>> {
  if (examIds.length === 0) return new Set();
  const attempts = await prisma.examAttempt.findMany({
    where: { studentId, status: "completed", examId: { in: examIds } },
    select: { examId: true, scorePercentage: true, exam: { select: { passingScorePercentage: true } } },
  });
  const passed = new Set<string>();
  for (const attempt of attempts) {
    if (Number(attempt.scorePercentage) >= attempt.exam.passingScorePercentage) passed.add(attempt.examId);
  }
  return passed;
}

export interface ExamAttemptHistoryItem {
  attemptId: string;
  attemptNumber: number;
  score: number;
  scorePercentage: number;
  passed: boolean;
  submittedAt: Date | null;
}

export interface ExamDetailPayload {
  id: string;
  courseId: string;
  courseTitleAr: string;
  courseTitleEn: string;
  titleAr: string;
  titleEn: string;
  passingScorePercentage: number;
  maxAttempts: number;
  questionCount: number;
  totalPoints: number;
  available: boolean;
  attemptsUsed: number;
  attemptsLeft: number;
  inProgressAttemptId: string | null;
  lastResult: {
    attemptId: string;
    attemptNumber: number;
    score: number;
    scorePercentage: number;
    passed: boolean;
  } | null;
  history: ExamAttemptHistoryItem[];
}

// Full student-facing exam detail (no answer keys). Shared by the standalone
// exam page API and the in-lesson gated endpoint so both stay in sync.
export async function buildExamDetail(examId: string, studentId: string | null): Promise<ExamDetailPayload | null> {
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { course: { select: { id: true, titleAr: true, titleEn: true } } },
  });
  if (!exam) return null;

  const validity = await examValidity(exam.id);
  // Anonymous viewers get no attempt data (and we never query attempt tables
  // with a placeholder id, which would fail the UUID column type).
  const stats = studentId
    ? await myExamStats(exam.id, studentId, exam.maxAttempts)
    : { attemptsUsed: 0, attemptsLeft: exam.maxAttempts, inProgressAttemptId: null, lastResult: null };
  if (stats.lastResult) {
    stats.lastResult.passed = stats.lastResult.scorePercentage >= exam.passingScorePercentage;
  }
  const [history, questionsAggregate] = await Promise.all([
    studentId
      ? prisma.examAttempt.findMany({
          where: { examId: exam.id, studentId, status: "completed" },
          orderBy: { attemptNumber: "desc" },
        })
      : Promise.resolve([]),
    prisma.examQuestion.aggregate({
      where: { examId: exam.id },
      _count: true,
      _sum: { points: true },
    }),
  ]);

  return {
    id: exam.id,
    courseId: exam.courseId,
    courseTitleAr: exam.course.titleAr,
    courseTitleEn: exam.course.titleEn,
    titleAr: exam.titleAr,
    titleEn: exam.titleEn,
    passingScorePercentage: exam.passingScorePercentage,
    maxAttempts: exam.maxAttempts,
    questionCount: validity.questionCount,
    totalPoints: questionsAggregate._sum.points ?? 0,
    available: validity.available,
    ...stats,
    history: history.map((attempt) => ({
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      score: Number(attempt.score),
      scorePercentage: Number(attempt.scorePercentage),
      passed: Number(attempt.scorePercentage) >= exam.passingScorePercentage,
      submittedAt: attempt.submittedAt,
    })),
  };
}
