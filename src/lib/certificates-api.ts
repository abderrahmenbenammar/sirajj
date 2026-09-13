// Client-side certificate helpers (real endpoints only).

export interface CourseCertificateState {
  certificate: { id: string; certificateCode: string; issueDate: string } | null;
  eligible: boolean;
  lessonsComplete: boolean;
  examPassed: boolean;
  totalLessons: number;
  doneLessons: number;
}

export interface CertificateDetail {
  id: string;
  certificateCode: string;
  issueDate: string;
  pdfUrl: string | null;
  course: { id: string; titleAr: string; titleEn: string };
  studentName: string;
  bestScorePercentage: number | null;
}

export interface Verification {
  valid: boolean;
  certificateCode?: string;
  studentName?: string;
  courseTitleAr?: string;
  courseTitleEn?: string;
  issueDate?: string;
}

export async function fetchCourseCertificate(courseId: string): Promise<CourseCertificateState | null> {
  const response = await fetch(`/api/courses/${courseId}/certificate`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`certificate-state-${response.status}`);
  return (await response.json()) as CourseCertificateState;
}

export async function issueCertificate(courseId: string): Promise<{ id: string; certificateCode: string }> {
  const response = await fetch(`/api/courses/${courseId}/certificate`, { method: "POST" });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body.error === "string" ? body.error : `issue-${response.status}`;
    throw new Error(message);
  }
  const certificate = body?.certificate as { id: string; certificateCode: string } | undefined;
  if (!certificate) throw new Error("issue-empty");
  return certificate;
}

export async function fetchCertificate(id: string): Promise<CertificateDetail | null> {
  const response = await fetch(`/api/certificates/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`certificate-${response.status}`);
  return (await response.json()) as CertificateDetail;
}

export async function verifyCertificate(code: string): Promise<Verification> {
  const response = await fetch(`/api/verify/${encodeURIComponent(code.trim())}`);
  if (response.status === 404) return { valid: false };
  if (!response.ok) throw new Error(`verify-${response.status}`);
  return (await response.json()) as Verification;
}
