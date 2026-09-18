"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { fetchCourse, type ApiCourse } from "@/lib/courses-api";
import { type ExamListItem } from "@/lib/exams-api";
import { fetchCourseCertificate, issueCertificate, type CourseCertificateState } from "@/lib/certificates-api";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Clock, Users, BookOpen, PlayCircle, FileText, HelpCircle, Lock } from "lucide-react";
import { libraryTypeLabel } from "@/lib/library-types";
import SirajLoading from "@/components/ui/SirajLoading";

export default function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useLang();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<ApiCourse | null>(null);
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [certState, setCertState] = useState<CourseCertificateState | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [loadingCourse, setLoadingCourse] = useState(true);

  useEffect(() => {
    setLoadingCourse(true);
    fetchCourse(id).then((data) => {
      setCourse(data);
      setLoadingCourse(false);
    });
    fetch(`/api/exams?courseId=${id}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => setExams(Array.isArray(data) ? (data as ExamListItem[]) : []))
      .catch(() => undefined);
    if (isAuthenticated) {
      fetchCourseCertificate(id)
        .then(setCertState)
        .catch(() => undefined);
    } else {
      setCertState(null);
    }
  }, [id, isAuthenticated]);

  const requestCertificate = async () => {
    setIssuing(true);
    setIssueError("");
    try {
      const certificate = await issueCertificate(id);
      router.push(`/certificates/${certificate.id}`);
    } catch {
      setIssueError(t("لا تستوفي شروط الشهادة بعد", "Certificate requirements not met yet"));
    } finally {
      setIssuing(false);
    }
  };

  if (loadingCourse) {
    return <SirajLoading />;
  }

  if (!course) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t("الدورة غير موجودة", "Course not found")}
        </h1>
        <Link href="/courses" className="text-emerald-700 dark:text-emerald-400 hover:underline">
          {t("العودة للدورات", "Back to courses")}
        </Link>
      </div>
    );
  }

  const progress = course.progress || 0;
  const doneSet = new Set(course.completedLessonIds ?? []);
  const courseExams = exams.filter((exam) => !exam.lessonId);
  // Free-text instructor name: prefer the current language, fall back to the
  // other language, and render nothing (calm empty state) when both are empty.
  const instructorName = lang === "ar"
    ? (course.instructor || course.instructorEn)
    : (course.instructorEn || course.instructor);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <PlayCircle size={16} className="text-emerald-500" />;
      case "reading": return <FileText size={16} className="text-blue-500" />;
      case "quiz": return <HelpCircle size={16} className="text-amber-500" />;
      default: return <PlayCircle size={16} />;
    }
  };

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-8">
          <Link href="/courses" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            {t("الدورات", "Courses")}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white">{t(course.title, course.titleEn)}</span>
        </div>

        <div className="relative w-full h-48 sm:h-auto sm:aspect-[16/5] overflow-hidden rounded-2xl mb-8 border border-gray-200/60 dark:border-gray-800/60 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30">
          {course.image ? (
            <img
              src={course.image}
              alt={t(course.title, course.titleEn)}
              className="absolute inset-0 w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <h1 className="absolute bottom-6 start-6 end-6 text-2xl sm:text-3xl font-bold text-white drop-shadow-md">
            {t(course.title, course.titleEn)}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-2xl p-8 sm:p-10 border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white/80 dark:bg-gray-900/80 text-emerald-700 dark:text-emerald-400 inline-block mb-4">
                {t(course.pathAr, course.pathEn)}
              </span>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-6">
                {t(course.description, course.descriptionEn)}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                {instructorName && <span className="flex items-center gap-1.5"><Users size={15} /> {instructorName}</span>}
                <span className="flex items-center gap-1.5"><Clock size={15} /> {course.duration}</span>
                <span className="flex items-center gap-1.5"><BookOpen size={15} /> {course.lessons} {t("درس", "lessons")}</span>
              </div>
            </div>

            {/* Curriculum */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t("دروس الدورة", "Course Lessons")}
              </h2>
              <div className="space-y-2">
                {course.curriculum.map((item, i) => (
                  <Link
                    key={item.id}
                    href={`/courses/${course.id}/lessons/${item.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                  >
                    <span className="text-sm font-medium text-gray-400 w-6 text-center">{i + 1}</span>
                    {getTypeIcon(item.type)}
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {t(item.title, item.titleEn)}
                      </span>
                    </div>
                      {item.hasExam && (
                        <span className="text-xs px-2 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-lg shrink-0">
                          {t("اختبار مطلوب", "Exam required")}
                        </span>
                      )}
                      {item.locked && <Lock size={14} className="text-gray-400 shrink-0" />}
                      <span className="text-xs text-gray-400">{item.duration}</span>
                      {doneSet.has(item.id) && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                          {t("مكتمل", "Done")}
                        </span>
                      )}
                  </Link>
                ))}
              </div>
            </div>

            {/* References & Sources (real LibraryItems linked to the course) */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                {t("المراجع والمصادر", "References & Sources")}
              </h2>
              {course.references.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t("لا توجد مراجع لهذه الدورة بعد.", "No references for this course yet.")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {course.references.map((ref) => (
                    <li key={ref.id}>
                      <Link
                        href={`/library/${ref.id}`}
                        className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400 rounded-xl p-2 -m-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                        <span className="min-w-0">
                          <span className="font-medium text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {t(ref.titleAr, ref.titleEn)}
                          </span>
                          <span className="block text-xs text-gray-400 mt-0.5">
                            {t(libraryTypeLabel(ref.type).ar, libraryTypeLabel(ref.type).en)}
                            {ref.authorName ? ` · ${ref.authorName}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

            {/* Exams (course-level only; lesson exams live inside their lesson) */}
            {courseExams.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {t("اختبارات الدورة", "Course Exams")}
                </h2>
                <div className="space-y-2">
                  {courseExams.map((exam) => (
                    <Link
                      key={exam.id}
                      href={`/exams/${exam.id}`}
                      className="flex items-center justify-between gap-3 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {t(exam.titleAr, exam.titleEn)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {exam.questionCount} {t("أسئلة", "questions")}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Certificate */}
            {isAuthenticated && certState && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {t("شهادة الإتمام", "Completion Certificate")}
                </h2>
                {certState.certificate ? (
                  <Link
                    href={`/certificates/${certState.certificate.id}`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors"
                  >
                    {t("عرض شهادتك", "View your certificate")} · {certState.certificate.certificateCode}
                  </Link>
                ) : certState.eligible ? (
                  <div>
                    <button
                      onClick={requestCertificate}
                      disabled={issuing}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                    >
                      {issuing ? t("جارٍ الإصدار...", "Issuing...") : t("احصل على شهادتك", "Get your certificate")}
                    </button>
                    {issueError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{issueError}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t(
                      `أكمل الدروس (${certState.doneLessons}/${certState.totalLessons}) واجتز اختبار الدورة للحصول على الشهادة`,
                      `Complete the lessons (${certState.doneLessons}/${certState.totalLessons}) and pass a course exam to earn the certificate`
                    )}
                  </p>
                )}
              </div>
            )}

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sticky top-24">
              {progress > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                    <span>{t("التقدم", "Progress")}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {course.curriculum.length > 0 && (
                <Link
                  href={`/courses/${course.id}/lessons/${course.curriculum[0].id}`}
                  className="block w-full text-center py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20 mb-3"
                >
                  {progress > 0 ? t("متابعة التعلم", "Continue Learning") : t("ابدأ الدورة", "Start Course")}
                </Link>
              )}

              <div className="space-y-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("المسار", "Path")}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{t(course.pathAr, course.pathEn)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("المدة", "Duration")}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{course.duration}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{t("عدد الدروس", "Lessons")}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{course.lessons}</span>
                </div>
                {instructorName && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t("المعلم", "Instructor")}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{instructorName}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
