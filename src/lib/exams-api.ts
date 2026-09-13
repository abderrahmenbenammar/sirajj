// Client-side types + fetchers for the real exams flow (PostgreSQL).
// Student payloads never contain answer keys (no isCorrect anywhere here).

export interface ExamListItem {
  id: string;
  courseId: string;
  courseTitleAr: string;
  courseTitleEn: string;
  titleAr: string;
  titleEn: string;
  passingScorePercentage: number;
  maxAttempts: number;
  questionCount: number;
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
}

export interface TakeOption {
  id: string;
  optionTextAr: string;
  optionTextEn: string;
}

export interface TakeQuestion {
  id: string;
  questionTextAr: string;
  questionTextEn: string;
  orderIndex: number;
  options: TakeOption[];
}

export interface TakeAttempt {
  id: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
}

export interface StartResponse {
  resumed: boolean;
  attempt: TakeAttempt;
  questions: TakeQuestion[];
  answers: Record<string, string>;
  attemptsUsed: number;
  attemptsLeft: number;
}

export interface SubmitResponse {
  success: boolean;
  alreadySubmitted: boolean;
  attemptId: string;
  examId: string;
  attemptNumber: number;
  score: number;
  scorePercentage: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  attemptsUsed: number;
  attemptsLeft: number;
  submitted: boolean;
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function fetchExams(courseId?: string): Promise<ExamListItem[]> {
  const url = courseId ? `/api/exams?courseId=${encodeURIComponent(courseId)}` : "/api/exams";
  const response = await fetch(url);
  if (!response.ok) throw new Error(`fetch-exams-${response.status}`);
  const data: unknown = await response.json();
  return Array.isArray(data) ? (data as ExamListItem[]) : [];
}

export async function startAttempt(examId: string): Promise<StartResponse> {
  const response = await fetch(`/api/exams/${examId}/start`, { method: "POST" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.error === "string" ? body.error : `start-${response.status}`;
    throw new Error(message);
  }
  return readJson<StartResponse>(response);
}

export async function saveAnswer(attemptId: string, questionId: string, selectedOptionId: string): Promise<void> {
  const response = await fetch(`/api/attempts/${attemptId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionId, selectedOptionId }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.error === "string" ? body.error : `answer-${response.status}`;
    throw new Error(message);
  }
}

export async function submitAttempt(attemptId: string): Promise<SubmitResponse> {
  const response = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.error === "string" ? body.error : `submit-${response.status}`;
    throw new Error(message);
  }
  return readJson<SubmitResponse>(response);
}
