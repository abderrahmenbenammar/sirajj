/** Shared, strictly-typed data shapes passed from the server page to the
 *  client dashboard components (all values must stay React-serializable —
 *  dates are pre-serialized to ISO strings on the server). */

export interface BilingualText {
  ar: string;
  en: string;
}

export interface DashboardStats {
  totalEnrolled: number;
  totalCompletedCourses: number;
  certificatesCount: number;
}

export interface DashboardCourse {
  id: string;
  titleAr: string;
  titleEn: string;
  instructorAr: string;
  instructorEn: string;
  /** Total lessons published in the course. */
  totalLessons: number;
  /** Lessons completed by the student, clamped to `totalLessons`. */
  completedLessons: number;
  /** `(completedLessons / totalLessons) * 100`, rounded to 0–100. */
  progress: number;
  /** Completed via stored status or by finishing every lesson. */
  isCompleted: boolean;
}

export interface DashboardCertificate {
  id: string;
  certificateCode: string;
  /** ISO-8601 string (serialized on the server). */
  issueDate: string;
  courseTitleAr: string;
  courseTitleEn: string;
}
