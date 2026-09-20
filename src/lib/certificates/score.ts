import { prisma } from "@/lib/prisma";

// Final certificate grade across ALL course exams:
//   percentage = (Σ approved-attempt earned points ÷ Σ exam totals) × 100
// Approved attempt per exam = the completed attempt with the highest
// scorePercentage (ties → higher attemptNumber). This mirrors the existing
// certificate convention (best passing first, scorePercentage desc) while
// the gating policy (any single pass unlocks) and the display policy
// (latest attempt) stay exactly as they are.
//   - One exam = one approved result; results are never pooled across exams.
//   - Exams with no completed attempts contribute 0 earned but keep counting
//     their total (undemonstrated material counts against the grade).
//   - Question-less exams (total 0) are skipped: 0/0 carries no signal.
// Stored score points are used verbatim (never recomputed from edited keys);
// exam totals come from the current questions (the only place totals live).

export interface PerExamScore {
  examId: string;
  totalPoints: number;
  approvedScore: number | null;
  approvedPercentage: number | null;
}

export interface FinalScore {
  percentage: number | null;
  earned: number;
  total: number;
  perExam: PerExamScore[];
}

export async function computeFinalScore(studentId: string, courseId: string): Promise<FinalScore> {
  const exams = await prisma.exam.findMany({
    where: { courseId },
    select: {
      id: true,
      questions: { select: { points: true } },
      attempts: {
        where: { studentId, status: "completed" },
        select: { score: true, scorePercentage: true, attemptNumber: true },
        orderBy: [{ scorePercentage: "desc" }, { attemptNumber: "desc" }],
      },
    },
  });

  let earned = 0;
  let total = 0;
  const perExam: PerExamScore[] = [];
  for (const exam of exams) {
    const examTotal = exam.questions.reduce((sum, q) => sum + q.points, 0);
    const approved = exam.attempts[0] ?? null;
    if (examTotal <= 0) {
      perExam.push({ examId: exam.id, totalPoints: 0, approvedScore: null, approvedPercentage: null });
      continue;
    }
    total += examTotal;
    if (approved) {
      earned += Number(approved.score);
      perExam.push({
        examId: exam.id,
        totalPoints: examTotal,
        approvedScore: Number(approved.score),
        approvedPercentage: Number(approved.scorePercentage),
      });
    } else {
      perExam.push({ examId: exam.id, totalPoints: examTotal, approvedScore: null, approvedPercentage: null });
    }
  }

  const percentage = total > 0 ? Math.round((earned / total) * 10000) / 100 : null;
  return { percentage, earned, total, perExam };
}
