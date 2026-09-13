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
