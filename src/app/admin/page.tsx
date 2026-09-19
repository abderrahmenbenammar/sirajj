"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BookPlus, Check, Film, GraduationCap, ImagePlus, ListPlus, Plus, ShieldCheck, Trash2, Users, X, LibraryBig } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { COURSE_PATHS, COURSE_PATH_LABELS } from "@/lib/course-paths";
import SirajTooltip from "@/components/ui/SirajTooltip";
import SirajLoading from "@/components/ui/SirajLoading";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import CourseLessonsManager from "@/components/admin/CourseLessonsManager";
import CourseReferencesPicker from "@/components/admin/CourseReferencesPicker";

type AdminLesson = { id: string; titleAr: string; titleEn: string; orderIndex: number; videoUrl: string };
type Course = { id: string; titleAr: string; titleEn: string; shortDescriptionAr: string | null; shortDescriptionEn: string | null; curriculumAr: string | null; curriculumEn: string | null; instructorNameAr: string | null; instructorNameEn: string | null; instructorId: string | null; instructor: { nameAr: string; nameEn: string } | null; coverImageUrl: string | null; durationHours: number | null; path: string; lessons: AdminLesson[]; libraryReferences: { libraryItemId: string }[] };
type Subscriber = { id: string; fullName: string; email: string; authProvider: string; role: string; status: string; createdAt: string; _count: { courseProgress: number; certificates: number } };
type SubscriberDetails = Subscriber & {
  courseProgress: { completionPercentage: number; status: string; completedAt: string | null; course: { id: string; titleAr: string } }[];
  lessonCompletions: { completedAt: string; lesson: { titleAr: string; orderIndex: number; course: { titleAr: string } } }[];
};
type LibraryItem = { id: string; type: string; titleAr: string; authorName: string | null; contentUrl: string; coverImageUrl: string | null; categoryId: string | null };
type AdminCategory = { id: string; nameAr: string; nameEn: string; slug: string };
type AdminFaq = { id: string; questionAr: string; questionEn: string; answerAr: string; answerEn: string; category: string; orderIndex: number };
type AdminContact = { id: string; name: string; email: string; subject: string; message: string; status: string; createdAt: string };
type AdminSubscriber = { id: string; email: string; subscribedAt: string };
type AdminCertificate = {
  id: string; certificateCode: string; issueDate: string;
  student: { id: string; fullName: string; email: string };
  course: { id: string; titleAr: string };
};
type AdminLessonOption = { id: string; titleAr: string; titleEn: string };
type AdminExam = {
  id: string; courseId: string; courseTitleAr: string; titleAr: string; titleEn: string;
  lessonId: string | null; lesson: AdminLessonOption | null;
  passingScorePercentage: number; maxAttempts: number;
  questionCount: number; totalPoints: number; attemptCount: number; invalidQuestions: number; available: boolean;
};
type AdminExamDetail = {
  id: string;
  course: { id: string; titleAr: string };
  lesson: AdminLessonOption | null;
  titleAr: string; titleEn: string;
  passingScorePercentage: number; maxAttempts: number;
  questions: {
    id: string; questionTextAr: string; questionTextEn: string; points: number; orderIndex: number;
    options: { id: string; optionTextAr: string; optionTextEn: string; isCorrect: boolean }[];
  }[];
};

type BuilderOption = { textAr: string; textEn: string; isCorrect: boolean };
type BuilderQuestion = { id: string; textAr: string; textEn: string; points: string; options: BuilderOption[] };

const makeBuilderQuestion = (): BuilderQuestion => ({
  id: Math.random().toString(36).slice(2),
  textAr: "",
  textEn: "",
  points: "1",
  options: [
    { textAr: "", textEn: "", isCorrect: true },
    { textAr: "", textEn: "", isCorrect: false },
  ],
});

const EMPTY_COURSE_FORM = { titleAr: "", titleEn: "", shortDescriptionAr: "", shortDescriptionEn: "", coverImageUrl: "", durationHours: "", path: "BEGINNER", instructorNameAr: "", instructorNameEn: "", libraryItemIds: [] as string[] };

// Cover image rules mirror the server's upload route (kind "image"):
// JPG/PNG/WEBP, up to 10MB. Enforced client-side for instant feedback; the
// server re-checks MIME + size regardless of what the client sends.
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_COVER_SIZE = 10 * 1024 * 1024;

function QuestionCard({
  question,
  index,
  onChange,
  onRemove,
  t,
}: {
  question: BuilderQuestion;
  index: number;
  onChange: (patch: Partial<BuilderQuestion>) => void;
  onRemove?: () => void;
  t: (ar: string, en: string) => string;
}) {
  const setOption = (optionIndex: number, patch: Partial<BuilderOption>) =>
    onChange({ options: question.options.map((option, i) => (i === optionIndex ? { ...option, ...patch } : option)) });
  const markCorrect = (optionIndex: number) =>
    onChange({ options: question.options.map((option, i) => ({ ...option, isCorrect: i === optionIndex })) });
  const addOption = () => onChange({ options: [...question.options, { textAr: "", textEn: "", isCorrect: false }] });
  const removeOption = (optionIndex: number) =>
    onChange({ options: question.options.filter((_, i) => i !== optionIndex) });
  const borderClass = onRemove
    ? "border-gray-200 dark:border-gray-800"
    : "border-emerald-200 dark:border-emerald-900/60";

  return (
    <div className={`rounded-2xl border ${borderClass} bg-gray-50/60 dark:bg-gray-800/40 p-4 space-y-3`}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <GraduationCap size={16} className="text-emerald-600 dark:text-emerald-400" />
          {t("السؤال", "Question")} {index + 1}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            {t("الدرجة", "Mark")}
            <input
              type="number"
              min="1"
              value={question.points}
              onChange={(event) => onChange({ points: event.target.value })}
              className="admin-input w-16 py-1 text-sm"
            />
          </label>
          {onRemove && (
            <SirajTooltip label={t("حذف هذا السؤال", "Delete this question")} side="top">
              <button type="button" onClick={onRemove} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={t("حذف السؤال", "Delete question")}>
                <Trash2 size={15} />
              </button>
            </SirajTooltip>
          )}
        </div>
      </div>

      <input
        value={question.textAr}
        onChange={(event) => onChange({ textAr: event.target.value })}
        placeholder={t("نص السؤال بالعربية", "Question text in Arabic")}
        className="admin-input"
      />
      <input
        value={question.textEn}
        onChange={(event) => onChange({ textEn: event.target.value })}
        placeholder={t("نص السؤال بالإنجليزية", "Question text in English")}
        className="admin-input"
      />

      <div className="space-y-2">
        {question.options.map((option, optionIndex) => (
          <div key={optionIndex} className="flex items-center gap-2">
            <SirajTooltip label={t("تحديد كإجابة صحيحة", "Mark as the correct answer")} side="top">
              <button
                type="button"
                onClick={() => markCorrect(optionIndex)}
                className={`shrink-0 p-1.5 rounded-full border ${option.isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-gray-300 dark:border-gray-600 text-transparent hover:border-emerald-400"}`}
                aria-label={t("إجابة صحيحة", "Correct answer")}
              >
                <Check size={13} />
              </button>
            </SirajTooltip>
            <input
              value={option.textAr}
              onChange={(event) => setOption(optionIndex, { textAr: event.target.value })}
              placeholder={t("الخيار بالعربية", "Option in Arabic")}
              className="admin-input flex-1"
            />
            <input
              value={option.textEn}
              onChange={(event) => setOption(optionIndex, { textEn: event.target.value })}
              placeholder={t("الخيار بالإنجليزية", "Option in English")}
              className="admin-input flex-1"
            />
            {question.options.length > 2 && (
              <button type="button" onClick={() => removeOption(optionIndex)} className="shrink-0 p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={t("حذف الخيار", "Delete option")}>
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        <button type="button" onClick={addOption} className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
          <Plus size={13} />{t("إضافة خيار", "Add option")}
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const { t } = useLang();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [selectedSubscriber, setSelectedSubscriber] = useState<SubscriberDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [certSearch, setCertSearch] = useState("");
  const { dialog, notify } = useSirajMessage();
  const [userSearch, setUserSearch] = useState("");
  const [courseForm, setCourseForm] = useState(EMPTY_COURSE_FORM);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editForm, setEditForm] = useState({ titleAr: "", titleEn: "", shortDescriptionAr: "", shortDescriptionEn: "", coverImageUrl: "", durationHours: "", path: "BEGINNER", instructorNameAr: "", instructorNameEn: "", libraryItemIds: [] as string[] });
  const [editCourseImage, setEditCourseImage] = useState<File | null>(null);
  const [lessonForm, setLessonForm] = useState({ courseId: "", titleAr: "", titleEn: "", videoUrl: "" });
  const [detailQuestion, setDetailQuestion] = useState<BuilderQuestion>(() => makeBuilderQuestion());
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [examForm, setExamForm] = useState({ courseId: "", lessonId: "" });
  const [builderQuestions, setBuilderQuestions] = useState<BuilderQuestion[]>(() => [makeBuilderQuestion()]);
  const [builderError, setBuilderError] = useState("");
  const [selectedExam, setSelectedExam] = useState<AdminExamDetail | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [questionDraft, setQuestionDraft] = useState({ questionTextAr: "", questionTextEn: "", points: "1" });
  const [editingOptionId, setEditingOptionId] = useState("");
  const [optionDraft, setOptionDraft] = useState("");
  const [libraryForm, setLibraryForm] = useState({ type: "book", title: "", author: "", category: "", description: "", content: "", mediaUrl: "" });
  const [courseImage, setCourseImage] = useState<File | null>(null);
  const [lessonVideo, setLessonVideo] = useState<File | null>(null);
  const [libraryCoverFile, setLibraryCoverFile] = useState<File | null>(null);
  const [libraryCoverPreview, setLibraryCoverPreview] = useState<string | null>(null);
  const [libraryFile, setLibraryFile] = useState<File | null>(null);
  const [editingLibraryId, setEditingLibraryId] = useState("");
  const [libraryDraft, setLibraryDraft] = useState({ titleAr: "", authorName: "", type: "book", contentUrl: "", coverImageUrl: null as string | null });
  const [editCover, setEditCover] = useState<{ file: File | null; preview: string | null; removeCover: boolean }>({ file: null, preview: null, removeCover: false });
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState({ nameAr: "", nameEn: "", slug: "" });
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [categoryDraft, setCategoryDraft] = useState({ nameAr: "", nameEn: "" });
  const [faqs, setFaqs] = useState<AdminFaq[]>([]);
  const [faqForm, setFaqForm] = useState({ questionAr: "", questionEn: "", answerAr: "", answerEn: "", orderIndex: "0" });
  const [editingFaqId, setEditingFaqId] = useState("");
  const [faqDraft, setFaqDraft] = useState({ questionAr: "", answerAr: "", orderIndex: "0" });
  const [contactMessages, setContactMessages] = useState<AdminContact[]>([]);
  const [newsletterSubs, setNewsletterSubs] = useState<AdminSubscriber[]>([]);
  const [subscriberTotal, setSubscriberTotal] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/auth/login?admin=1");
    if (session?.user?.role !== "ADMIN") router.replace("/");
  }, [status, session, router]);

  const loadCourses = async () => {
    const response = await fetch("/api/admin/courses");
    if (response.ok) {
      const data = await response.json();
      const list: Course[] = Array.isArray(data) ? data : data.courses;
      setCourses(list);
      // Keep the open edit panel in sync after a lesson add/reorder/delete so
      // it always reflects the database order, never a stale snapshot.
      setEditingCourse((current) => (current ? list.find((course) => course.id === current.id) ?? null : current));
    }
  };

  const loadSubscribers = async (query = "") => {
    const response = await fetch(`/api/admin/users${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
    if (response.ok) setSubscribers(await response.json());
  };

  const loadLibrary = async () => {
    const response = await fetch("/api/admin/library");
    if (response.ok) setLibraryItems(await response.json());
  };

  const loadCertificates = async (query = "") => {
    const response = await fetch(`/api/admin/certificates${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
    if (response.ok) setCertificates(await response.json());
  };

  const loadCategories = async () => {
    const response = await fetch("/api/categories");
    if (response.ok) setCategories(await response.json());
  };

  const loadFaqsAdmin = async () => {
    const response = await fetch("/api/faqs");
    if (response.ok) setFaqs(await response.json());
  };

  const loadContactMessages = async () => {
    const response = await fetch("/api/admin/contact");
    if (response.ok) setContactMessages(await response.json());
  };

  const loadNewsletterSubs = async () => {
    const response = await fetch("/api/admin/newsletter");
    if (response.ok) {
      const data = await response.json();
      setNewsletterSubs(Array.isArray(data.subscribers) ? data.subscribers : []);
      setSubscriberTotal(typeof data.total === "number" ? data.total : 0);
    }
  };

  const refreshReferenceData = async () => {
    await loadCategories();
    await loadFaqsAdmin();
    await loadContactMessages();
    await loadNewsletterSubs();
  };

  const deleteLibraryItem = async (itemId: string) => {
    if (!window.confirm(t("هل تريد حذف هذا العنصر؟", "Delete this item?"))) return;
    const response = await fetch(`/api/admin/library/${itemId}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حذف العنصر", "Item deleted") : (result?.error ?? t("تعذر الحذف", "Could not delete")), response.ok ? "success" : "error");
    if (response.ok) await loadLibrary();
  };

  const saveLibraryEdit = async (itemId: string) => {
    try {
      let coverImageUrl: string | null | undefined;
      if (editCover.file) {
        coverImageUrl = await uploadFile(editCover.file, "image");
        notify(t("تم رفع الغلاف بنجاح", "Cover uploaded successfully"), "success");
      } else if (editCover.removeCover) {
        coverImageUrl = "";
      } else {
        coverImageUrl = libraryDraft.coverImageUrl ?? undefined;
      }
      const response = await fetch(`/api/admin/library/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleAr: libraryDraft.titleAr, authorName: libraryDraft.authorName || null, type: libraryDraft.type, contentUrl: libraryDraft.contentUrl, coverImageUrl }),
      });
      const result = await response.json().catch(() => null);
      notify(response.ok ? t("تم حفظ العنصر", "Item saved") : (result?.error ?? t("تعذر الحفظ", "Could not save")), response.ok ? "success" : "error");
      if (response.ok) {
        setEditingLibraryId("");
        setEditCover({ file: null, preview: null, removeCover: false });
        await loadLibrary();
      }
    } catch (error) { notify(error instanceof Error ? error.message : t("تعذر رفع الصورة", "Could not upload image"), "error"); }
  };

  const pickLibraryCover = (file: File | null) => {
    setLibraryCoverPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setLibraryCoverFile(null);
    if (!file) return;
    if (!COVER_TYPES.includes(file.type)) {
      notify(t("نوع الملف غير مدعوم", "File type not supported"), "error");
      return;
    }
    if (file.size > MAX_COVER_SIZE) {
      notify(t("حجم الملف غير صالح (بحد أقصى 10 ميجابايت)", "Invalid file size (max 10MB)"), "error");
      return;
    }
    setLibraryCoverFile(file);
    setLibraryCoverPreview(URL.createObjectURL(file));
  };

  const pickEditCover = (file: File | null) => {
    setEditCover((prev) => {
      if (prev.preview) URL.revokeObjectURL(prev.preview);
      return { file: null, preview: null, removeCover: false };
    });
    if (!file) return;
    if (!COVER_TYPES.includes(file.type)) {
      notify(t("نوع الملف غير مدعوم", "File type not supported"), "error");
      return;
    }
    if (file.size > MAX_COVER_SIZE) {
      notify(t("حجم الملف غير صالح (بحد أقصى 10 ميجابايت)", "Invalid file size (max 10MB)"), "error");
      return;
    }
    setEditCover({ file, preview: URL.createObjectURL(file), removeCover: false });
  };

  const submitCategory = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryForm),
    });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تمت إضافة التصنيف", "Category added") : (result?.error ?? t("تعذر تنفيذ العملية", "Operation failed")), response.ok ? "success" : "error");
    if (response.ok) {
      setCategoryForm({ nameAr: "", nameEn: "", slug: "" });
      await loadCategories();
    }
  };

  const saveCategoryEdit = async (categoryId: string) => {
    const response = await fetch(`/api/admin/categories/${categoryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(categoryDraft),
    });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حفظ التصنيف", "Category saved") : (result?.error ?? t("تعذر الحفظ", "Could not save")), response.ok ? "success" : "error");
    if (response.ok) {
      setEditingCategoryId("");
      await loadCategories();
    }
  };

  const deleteCategory = async (category: AdminCategory) => {
    if (!window.confirm(`${t("هل تريد حذف تصنيف", "Delete category")} "${category.nameAr}"؟`)) return;
    const response = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حذف التصنيف", "Category deleted") : (result?.error ?? t("تعذر الحذف", "Could not delete")), response.ok ? "success" : "error");
    if (response.ok) {
      await loadCategories();
      await loadCourses();
      await loadLibrary();
    }
  };

  const submitFaq = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/admin/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...faqForm, orderIndex: Number(faqForm.orderIndex) }),
    });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تمت إضافة السؤال", "Question added") : (result?.error ?? t("تعذر تنفيذ العملية", "Operation failed")), response.ok ? "success" : "error");
    if (response.ok) {
      setFaqForm({ questionAr: "", questionEn: "", answerAr: "", answerEn: "", orderIndex: "0" });
      await loadFaqsAdmin();
    }
  };

  const saveFaqEdit = async (faqId: string) => {
    const response = await fetch(`/api/admin/faqs/${faqId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...faqDraft, orderIndex: Number(faqDraft.orderIndex) }),
    });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حفظ السؤال", "Question saved") : (result?.error ?? t("تعذر الحفظ", "Could not save")), response.ok ? "success" : "error");
    if (response.ok) {
      setEditingFaqId("");
      await loadFaqsAdmin();
    }
  };

  const deleteFaq = async (faqId: string) => {
    if (!window.confirm(t("هل تريد حذف هذا السؤال؟", "Delete this question?"))) return;
    const response = await fetch(`/api/admin/faqs/${faqId}`, { method: "DELETE" });
    notify(response.ok ? t("تم حذف السؤال", "Question deleted") : t("تعذر الحذف", "Could not delete"), response.ok ? "success" : "error");
    if (response.ok) await loadFaqsAdmin();
  };

  const markMessage = async (messageId: string, status: string) => {
    const response = await fetch(`/api/admin/contact/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (response.ok) await loadContactMessages();
    else notify(t("تعذر تحديث الرسالة", "Could not update message"), "error");
  };

  const loadExams = async () => {
    const response = await fetch("/api/admin/exams");
    if (response.ok) setExams(await response.json());
  };

  const loadExamDetail = async (examId: string) => {
    const response = await fetch(`/api/admin/exams/${examId}`);
    if (response.ok) setSelectedExam(await response.json());
  };

  const deleteExam = async (exam: AdminExam) => {
    if (!window.confirm(`${t("هل تريد حذف اختبار", "Delete exam")} "${exam.titleAr}"؟`)) return;
    const response = await fetch(`/api/admin/exams/${exam.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حذف الاختبار", "Exam deleted") : (result?.error ?? t("تعذر حذف الاختبار", "Could not delete exam")), response.ok ? "success" : "error");
    if (response.ok) {
      if (selectedExam?.id === exam.id) setSelectedExam(null);
      await loadExams();
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!window.confirm(t("هل تريد حذف هذا السؤال؟", "Delete this question?"))) return;
    const response = await fetch(`/api/admin/questions/${questionId}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حذف السؤال", "Question deleted") : (result?.error ?? t("تعذر حذف السؤال", "Could not delete question")), response.ok ? "success" : "error");
    if (response.ok && selectedExam) {
      await loadExamDetail(selectedExam.id);
      await loadExams();
    }
  };

  const saveQuestionEdit = async (questionId: string) => {
    if (
      !questionDraft.questionTextAr.trim() ||
      !questionDraft.questionTextEn.trim() ||
      !Number.isInteger(Number(questionDraft.points)) ||
      Number(questionDraft.points) < 1
    ) {
      notify(t("نص السؤال بالعربية والإنجليزية ودرجة صحيحة مطلوبة", "Arabic and English question text and a valid mark are required"), "error");
      return;
    }
    const response = await fetch(`/api/admin/questions/${questionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionTextAr: questionDraft.questionTextAr,
        questionTextEn: questionDraft.questionTextEn,
        points: Number(questionDraft.points),
      }),
    });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حفظ السؤال", "Question saved") : (result?.error ?? t("تعذر حفظ السؤال", "Could not save question")), response.ok ? "success" : "error");
    if (response.ok) {
      setEditingQuestionId("");
      if (selectedExam) {
        await loadExamDetail(selectedExam.id);
        await loadExams();
      }
    }
  };

  const deleteOption = async (optionId: string) => {
    if (!window.confirm(t("هل تريد حذف هذا الخيار؟", "Delete this option?"))) return;
    const response = await fetch(`/api/admin/options/${optionId}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حذف الخيار", "Option deleted") : (result?.error ?? t("تعذر حذف الخيار", "Could not delete option")), response.ok ? "success" : "error");
    if (response.ok && selectedExam) await loadExamDetail(selectedExam.id);
  };

  const saveOptionEdit = async (optionId: string) => {
    const response = await fetch(`/api/admin/options/${optionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionTextAr: optionDraft }),
    });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حفظ الخيار", "Option saved") : (result?.error ?? t("تعذر حفظ الخيار", "Could not save option")), response.ok ? "success" : "error");
    if (response.ok) {
      setEditingOptionId("");
      if (selectedExam) await loadExamDetail(selectedExam.id);
    }
  };

  useEffect(() => { if (session?.user?.role === "ADMIN") { loadCourses(); loadSubscribers(); loadLibrary(); loadExams(); loadCertificates(); refreshReferenceData(); } }, [session]);

  const builderLessons = courses.find((course) => course.id === examForm.courseId)?.lessons ?? [];
  const builderTotalPoints = builderQuestions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);

  const updateBuilderQuestion = (id: string, patch: Partial<BuilderQuestion>) => {
    setBuilderQuestions((current) => current.map((question) => (question.id === id ? { ...question, ...patch } : question)));
  };

  const addBuilderQuestion = () => setBuilderQuestions((current) => [...current, makeBuilderQuestion()]);

  const removeBuilderQuestion = (id: string) =>
    setBuilderQuestions((current) => current.filter((question) => question.id !== id));

  const resetExamBuilder = () => {
    setExamForm({ courseId: "", lessonId: "" });
    setBuilderQuestions([makeBuilderQuestion()]);
    setBuilderError("");
  };

  const submitExam = async (event: FormEvent) => {
    event.preventDefault();
    if (!examForm.courseId) return setBuilderError(t("اختر الدورة", "Select the course"));
    if (builderQuestions.length === 0) return setBuilderError(t("أضف سؤالًا واحدًا على الأقل", "Add at least one question"));
    for (const [index, question] of builderQuestions.entries()) {
      const label = `${t("السؤال", "Question")} ${index + 1}`;
      if (!question.textAr.trim() || !question.textEn.trim()) return setBuilderError(`${label}: ${t("نص السؤال بالعربية والإنجليزية مطلوب", "Arabic and English question text are required")}`);
      if (!Number.isInteger(Number(question.points)) || Number(question.points) < 1) return setBuilderError(`${label}: ${t("الدرجة يجب أن تكون رقمًا صحيحًا أكبر من صفر", "The mark must be a whole number greater than zero")}`);
      if (question.options.length < 2) return setBuilderError(`${label}: ${t("خياران على الأقل", "At least two options are required")}`);
      if (question.options.some((option) => !option.textAr.trim() || !option.textEn.trim())) return setBuilderError(`${label}: ${t("نص كل خيار بالعربية والإنجليزية مطلوب", "Each option needs Arabic and English text")}`);
      if (question.options.filter((option) => option.isCorrect).length !== 1) return setBuilderError(`${label}: ${t("حدد إجابة صحيحة واحدة", "Select exactly one correct answer")}`);
    }
    setBuilderError("");
    const response = await fetch("/api/admin/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: examForm.courseId,
        lessonId: examForm.lessonId || undefined,
        questions: builderQuestions.map((question) => ({
          questionTextAr: question.textAr,
          questionTextEn: question.textEn,
          points: Number(question.points),
          options: question.options.map((option) => ({ optionTextAr: option.textAr, optionTextEn: option.textEn, isCorrect: option.isCorrect })),
        })),
      }),
    });
    const result = await response.json().catch(() => null);
    if (response.ok) {
      notify(t("تمت إضافة الاختبار", "Exam added"), "success");
      resetExamBuilder();
      await loadExams();
    } else {
      notify(result?.error ?? t("تعذر تنفيذ العملية", "Operation failed"), "error");
    }
  };

  const submitQuestion = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedExam) {
      notify(t("اختر اختبارًا أولًا", "Select an exam first"), "warning");
      return;
    }
    if (
      !detailQuestion.textAr.trim() ||
      !detailQuestion.textEn.trim() ||
      detailQuestion.options.length < 2 ||
      detailQuestion.options.some((option) => !option.textAr.trim() || !option.textEn.trim()) ||
      detailQuestion.options.filter((option) => option.isCorrect).length !== 1 ||
      !Number.isInteger(Number(detailQuestion.points)) ||
      Number(detailQuestion.points) < 1
    ) {
      notify(t("أكمل بيانات السؤال والخيارات وحدد إجابة صحيحة واحدة", "Complete the question and options and select exactly one correct answer"), "error");
      return;
    }
    const response = await fetch("/api/admin/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        examId: selectedExam.id,
        questionAr: detailQuestion.textAr,
        questionEn: detailQuestion.textEn,
        points: Number(detailQuestion.points),
        options: detailQuestion.options.map((option) => ({ optionTextAr: option.textAr, optionTextEn: option.textEn, isCorrect: option.isCorrect })),
      }),
    });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تمت إضافة السؤال", "Question added") : (result?.error ?? t("تعذر تنفيذ العملية", "Operation failed")), response.ok ? "success" : "error");
    if (response.ok) {
      setDetailQuestion(makeBuilderQuestion());
      await loadExamDetail(selectedExam.id);
      await loadExams();
    }
  };

  const deleteCourse = async (course: Course) => {
    if (!window.confirm(`${t("هل تريد حذف دورة", "Delete course")} "${course.titleAr}"؟`)) return;
    const response = await fetch(`/api/admin/courses/${course.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم حذف الدورة", "Course deleted") : (result?.error ?? t("تعذر حذف الدورة", "Could not delete course")), response.ok ? "success" : "error");
    if (response.ok) {
      // The cascade removes the course's exams, lessons and certificates too —
      // refresh everything affected so no stale item stays visible (and a
      // stale exam can never be clicked to "الاختبار غير موجود").
      if (selectedExam?.course.id === course.id) setSelectedExam(null);
      await loadCourses();
      await loadExams();
      await loadCertificates();
    }
  };

  const showSubscriberDetails = async (subscriberId: string) => {
    setDetailsLoading(true);
    const response = await fetch(`/api/admin/users/${subscriberId}`);
    if (response.ok) setSelectedSubscriber(await response.json());
    setDetailsLoading(false);
  };

  const updateSubscriber = async (subscriberId: string, patch: { role?: string; status?: string }, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    const response = await fetch(`/api/admin/users/${subscriberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const result = await response.json().catch(() => null);
    notify(response.ok ? t("تم تحديث المشترك", "Subscriber updated") : (result?.error ?? t("تعذر تنفيذ العملية", "Operation failed")), response.ok ? "success" : "error");
    if (response.ok) {
      await loadSubscribers(userSearch);
      if (selectedSubscriber?.id === subscriberId) await showSubscriberDetails(subscriberId);
    }
  };

  const uploadFile = async (file: File, kind: "image" | "video" | "document") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
    if (!response.ok) {
      const result = await response.json().catch(() => null);
      throw new Error(result?.error ?? "upload failed");
    }
    return (await response.json()).url as string;
  };

  const submitCourse = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const coverImageUrl = courseImage ? await uploadFile(courseImage, "image") : courseForm.coverImageUrl;
      const payload = { titleAr: courseForm.titleAr, titleEn: courseForm.titleEn, shortDescriptionAr: courseForm.shortDescriptionAr, shortDescriptionEn: courseForm.shortDescriptionEn, coverImageUrl, durationHours: courseForm.durationHours === "" ? null : Math.max(0, Math.floor(Number(courseForm.durationHours) || 0)), path: courseForm.path, instructorNameAr: courseForm.instructorNameAr, instructorNameEn: courseForm.instructorNameEn, libraryItemIds: courseForm.libraryItemIds };
      await submit(event, "/api/admin/courses", payload, t("تمت إضافة الدورة", "Course added"));
      setCourseImage(null);
      setCourseForm(EMPTY_COURSE_FORM);
    } catch (error) { notify(error instanceof Error ? error.message : t("تعذر رفع الصورة", "Could not upload image"), "error"); }
  };

  const startEditCourse = (course: Course) => {
    setEditingCourse(course);
    setEditForm({
      titleAr: course.titleAr,
      titleEn: course.titleEn,
      shortDescriptionAr: course.shortDescriptionAr ?? "",
      shortDescriptionEn: course.shortDescriptionEn ?? "",
      coverImageUrl: course.coverImageUrl ?? "",
      durationHours: course.durationHours === null || course.durationHours === undefined ? "" : String(course.durationHours),
      path: course.path,
      instructorNameAr: course.instructorNameAr ?? "",
      instructorNameEn: course.instructorNameEn ?? "",
      libraryItemIds: course.libraryReferences?.map((ref) => ref.libraryItemId) ?? [],
    });
    setEditCourseImage(null);
  };

  const submitEditCourse = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingCourse) return;
    try {
      const coverImageUrl = editCourseImage ? await uploadFile(editCourseImage, "image") : editForm.coverImageUrl;
      const payload = {
        titleAr: editForm.titleAr,
        titleEn: editForm.titleEn,
        shortDescriptionAr: editForm.shortDescriptionAr,
        shortDescriptionEn: editForm.shortDescriptionEn,
        coverImageUrl,
        durationHours: editForm.durationHours === "" ? null : Math.max(0, Math.floor(Number(editForm.durationHours) || 0)),
        path: editForm.path,
        instructorNameAr: editForm.instructorNameAr,
        instructorNameEn: editForm.instructorNameEn,
        libraryItemIds: editForm.libraryItemIds,
      };
      const response = await fetch(`/api/admin/courses/${editingCourse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      notify(response.ok ? t("تم تحديث الدورة", "Course updated") : (result?.error ?? t("تعذر تحديث الدورة", "Could not update course")), response.ok ? "success" : "error");
      if (response.ok) {
        setEditingCourse(null);
        setEditCourseImage(null);
        await loadCourses();
      }
    } catch (error) { notify(error instanceof Error ? error.message : t("تعذر رفع الصورة", "Could not upload image"), "error"); }
  };

  const submitLesson = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const videoUrl = lessonVideo ? await uploadFile(lessonVideo, "video") : lessonForm.videoUrl;
      await submit(event, "/api/admin/lessons", { ...lessonForm, videoUrl }, t("تمت إضافة الدرس", "Lesson added"));
      setLessonVideo(null);
    } catch (error) { notify(error instanceof Error ? error.message : t("تعذر رفع الفيديو", "Could not upload video"), "error"); }
  };

  const submitLibrary = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const fileKind = libraryFile?.type.startsWith("image/") ? "image" : libraryFile?.type.startsWith("video/") ? "video" : "document";
      const mediaUrl = libraryFile ? await uploadFile(libraryFile, fileKind) : libraryForm.mediaUrl;
      const coverImageUrl = libraryCoverFile ? await uploadFile(libraryCoverFile, "image") : null;
      if (libraryCoverFile) notify(t("تم رفع الغلاف بنجاح", "Cover uploaded successfully"), "success");
      await submit(event, "/api/admin/library", { ...libraryForm, mediaUrl, coverImageUrl }, t("تمت إضافة عنصر المكتبة", "Library item added"));
      setLibraryFile(null);
      setLibraryCoverFile(null);
      setLibraryCoverPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    } catch (error) { notify(error instanceof Error ? error.message : t("تعذر رفع الملف", "Could not upload file"), "error"); }
  };

  const submit = async (event: FormEvent, url: string, body: object, success: string) => {
    event.preventDefault();
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    notify(response.ok ? success : t("تعذر تنفيذ العملية", "Operation failed"), response.ok ? "success" : "error");
    if (response.ok) { await loadCourses(); await loadLibrary(); }
  };

  if (status === "loading") return <SirajLoading />;
  if (session?.user?.role !== "ADMIN") return null;

  return (
    <div className="py-10 sm:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-8">
          <ShieldCheck className="text-emerald-600" />
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("لوحة إدارة الأكاديمية", "Academy Administration")}</h1><p className="text-sm text-gray-500 dark:text-gray-400">{t("إدارة المحتوى من الخادم بشكل آمن", "Secure server-side content management")}</p></div>
        </div>
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <form onSubmit={submitCourse} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><BookPlus size={18} />{t("إضافة دورة", "Add course")}</h2>
            <input required placeholder={t("العنوان بالعربية", "Arabic title")} value={courseForm.titleAr} onChange={(e) => setCourseForm({ ...courseForm, titleAr: e.target.value })} className="admin-input" />
            <input placeholder={t("العنوان بالإنجليزية", "English title")} value={courseForm.titleEn} onChange={(e) => setCourseForm({ ...courseForm, titleEn: e.target.value })} className="admin-input" />
            <textarea placeholder={t("الوصف بالعربية", "Arabic description")} value={courseForm.shortDescriptionAr} onChange={(e) => setCourseForm({ ...courseForm, shortDescriptionAr: e.target.value })} className="admin-input min-h-20" />
            <textarea placeholder={t("الوصف بالإنجليزية", "English description")} value={courseForm.shortDescriptionEn} onChange={(e) => setCourseForm({ ...courseForm, shortDescriptionEn: e.target.value })} className="admin-input min-h-20" />
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("المسار", "Path")}</label>
            <select required value={courseForm.path} onChange={(e) => setCourseForm({ ...courseForm, path: e.target.value })} className="admin-input">
              {COURSE_PATHS.map((key) => <option key={key} value={key}>{t(COURSE_PATH_LABELS[key].ar, COURSE_PATH_LABELS[key].en)}</option>)}
            </select>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("المعلم", "Instructor")}</label>
            <input placeholder={t("اسم المعلم بالعربية", "Instructor name (Arabic)")} value={courseForm.instructorNameAr} onChange={(e) => setCourseForm({ ...courseForm, instructorNameAr: e.target.value })} className="admin-input" />
            <input placeholder={t("اسم المعلم بالإنجليزية", "Instructor name (English)")} value={courseForm.instructorNameEn} onChange={(e) => setCourseForm({ ...courseForm, instructorNameEn: e.target.value })} className="admin-input" />
            <input type="number" min="0" step="1" placeholder={t("مدة الدورة بالساعات (اختياري)", "Course duration in hours (optional)")} value={courseForm.durationHours} onChange={(e) => setCourseForm({ ...courseForm, durationHours: e.target.value })} className="admin-input" />
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><LibraryBig size={15} className="text-emerald-600 dark:text-emerald-400" />{t("المراجع والمصادر", "References & Sources")}</h3>
              <CourseReferencesPicker value={courseForm.libraryItemIds} onChange={(ids) => setCourseForm({ ...courseForm, libraryItemIds: ids })} />
            </div>
            <input placeholder={t("مسار الصورة", "Image path")} value={courseForm.coverImageUrl} onChange={(e) => setCourseForm({ ...courseForm, coverImageUrl: e.target.value })} className="admin-input" />
            <SirajTooltip label={t("اختر صورة الغلاف للدورة", "Choose the course cover image")} side="top" className="w-full">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setCourseImage(e.target.files?.[0] ?? null)} className="admin-input" />
            </SirajTooltip>
            <div className="flex gap-2">
              <button className="admin-button flex-1"><ImagePlus size={16} />{t("حفظ الدورة", "Save course")}</button>
            </div>
          </form>

          <form onSubmit={submitLesson} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><Film size={18} />{t("إضافة درس وفيديو", "Add lesson and video")}</h2>
            <select required value={lessonForm.courseId} onChange={(e) => setLessonForm({ ...lessonForm, courseId: e.target.value })} className="admin-input"><option value="">{t("اختر الدورة", "Select course")}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.titleAr}</option>)}</select>
            <input required placeholder={t("عنوان الدرس", "Lesson title")} value={lessonForm.titleAr} onChange={(e) => setLessonForm({ ...lessonForm, titleAr: e.target.value })} className="admin-input" />
            <input placeholder={t("عنوان الدرس بالإنجليزية", "English lesson title")} value={lessonForm.titleEn} onChange={(e) => setLessonForm({ ...lessonForm, titleEn: e.target.value })} className="admin-input" />
            <input placeholder="YouTube أو /videos/file.mp4" value={lessonForm.videoUrl} onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })} className="admin-input" />
            <SirajTooltip label={t("اختر ملف فيديو الدرس", "Choose the lesson video file")} side="top" className="w-full">
              <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => setLessonVideo(e.target.files?.[0] ?? null)} className="admin-input" />
            </SirajTooltip>
            <button className="admin-button"><ListPlus size={16} />{t("حفظ الدرس", "Save lesson")}</button>
          </form>

          <form onSubmit={submitLibrary} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white"><LibraryBig size={18} />{t("إضافة عنصر للمكتبة", "Add library item")}</h2>
            <select value={libraryForm.type} onChange={(e) => setLibraryForm({ ...libraryForm, type: e.target.value })} className="admin-input"><option value="book">كتاب</option><option value="article">مقال</option><option value="research">بحث</option><option value="lecture">محاضرة</option></select>
            <input required placeholder={t("العنوان", "Title")} value={libraryForm.title} onChange={(e) => setLibraryForm({ ...libraryForm, title: e.target.value })} className="admin-input" />
            <input placeholder={t("المؤلف أو المحاضر", "Author or speaker")} value={libraryForm.author} onChange={(e) => setLibraryForm({ ...libraryForm, author: e.target.value })} className="admin-input" />
            <input placeholder={t("التصنيف", "Category")} value={libraryForm.category} onChange={(e) => setLibraryForm({ ...libraryForm, category: e.target.value })} className="admin-input" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t("رفع صورة الغلاف", "Upload cover image")}</p>
              {libraryCoverPreview ? (
                <div className="flex items-start gap-3">
                  <div className="w-20 aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                    <img src={libraryCoverPreview} alt={t("معاينة الغلاف", "Cover preview")} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs px-2.5 py-1.5 rounded-lg cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 w-fit">
                      {t("استبدال الصورة", "Replace image")}
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickLibraryCover(e.target.files?.[0] ?? null)} />
                    </label>
                    <button type="button" onClick={() => pickLibraryCover(null)} className="text-xs px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 w-fit">{t("حذف الصورة", "Remove image")}</button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  <ImagePlus size={22} />
                  <span className="text-sm text-center">{t("اختر صورة للغلاف (JPG، PNG، WEBP)", "Choose a cover image (JPG, PNG, WEBP)")}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickLibraryCover(e.target.files?.[0] ?? null)} />
                </label>
              )}
            </div>
            <input placeholder={t("رابط الملف أو المحتوى", "Content or media URL")} value={libraryForm.mediaUrl} onChange={(e) => setLibraryForm({ ...libraryForm, mediaUrl: e.target.value })} className="admin-input" />
            <SirajTooltip label={t("اختر الملف النصي أو الفيديو أو PDF للعنصر", "Choose the item's text, video, or PDF file")} side="top" className="w-full">
              <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf,text/plain" onChange={(e) => setLibraryFile(e.target.files?.[0] ?? null)} className="admin-input" />
            </SirajTooltip>
            <textarea placeholder={t("الوصف أو المحتوى", "Description or content")} value={libraryForm.content} onChange={(e) => setLibraryForm({ ...libraryForm, content: e.target.value })} className="admin-input min-h-24" />
            <button className="admin-button"><LibraryBig size={16} />{t("حفظ عنصر المكتبة", "Save library item")}</button>
          </form>
        </div>

        <form onSubmit={submitExam} className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"><GraduationCap size={20} /></span>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{t("إضافة اختبار جديد", "Create a new exam")}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t("املأ بيانات الاختبار ثم أضف الأسئلة والخيارات وحدد الإجابة الصحيحة لكل سؤال.", "Fill in the exam data, then add questions and options and mark the correct answer for each question.")}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-xs">1</span>
              {t("بيانات الاختبار", "Exam details")}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <select required value={examForm.courseId} onChange={(e) => setExamForm({ ...examForm, courseId: e.target.value, lessonId: "" })} className="admin-input">
                <option value="">{t("اختر الدورة", "Select course")}</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.titleAr}</option>)}
              </select>
              <select value={examForm.lessonId} disabled={!examForm.courseId} onChange={(e) => setExamForm({ ...examForm, lessonId: e.target.value })} className="admin-input disabled:opacity-60">
                <option value="">{t("بدون فيديو مرتبط", "No linked video")}</option>
                {builderLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.titleAr}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-xs">2</span>
              {t("الأسئلة والخيارات", "Questions and options")}
            </h3>
            <div className="space-y-3">
              {builderQuestions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  t={t}
                  onChange={(patch) => updateBuilderQuestion(question.id, patch)}
                  onRemove={builderQuestions.length > 1 ? () => removeBuilderQuestion(question.id) : undefined}
                />
              ))}
            </div>
            <button type="button" onClick={addBuilderQuestion} className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
              <Plus size={15} />{t("إضافة سؤال آخر", "Add another question")}
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-600 text-white text-xs">3</span>
              {t("الملخص والحفظ", "Summary and save")}
            </h3>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {builderQuestions.length} {t("سؤال", "questions")} · {t("العلامة الكاملة", "Total mark")}
              </span>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{builderTotalPoints}</span>
            </div>
            {builderError && <p className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-sm">{builderError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="admin-button"><ListPlus size={16} />{t("حفظ الاختبار", "Save exam")}</button>
              <button type="button" onClick={resetExamBuilder} className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">{t("إلغاء", "Cancel")}</button>
            </div>
          </div>
        </form>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("الاختبارات", "Exams")}</h2>
          {exams.length > 0 ? (
            <div className="space-y-2 mb-6">
              {exams.map((exam) => (
                <div key={exam.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <SirajTooltip label={t("فتح بيانات الاختبار وأسئلته", "Open the exam data and its questions")} side="top" className="flex-1">
                    <button type="button" onClick={() => loadExamDetail(exam.id)} className="min-w-0 text-start w-full">
                      <span className="block text-sm text-gray-900 dark:text-white truncate">{exam.titleAr}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {exam.courseTitleAr}
                        {exam.lesson ? ` · ${exam.lesson.titleAr}` : ""} · {exam.questionCount} {t("أسئلة", "questions")} ·{" "}
                        {t("العلامة الكاملة", "Total mark")}: {exam.totalPoints} ·{" "}
                        {exam.available ? t("متاح", "Available") : t("غير مكتمل", "Incomplete")} · {exam.attemptCount} {t("محاولات", "attempts")}
                      </span>
                    </button>
                  </SirajTooltip>
                  <SirajTooltip label={t("حذف الاختبار وجميع نتائجه", "Delete the exam and all its results")} side="top">
                    <button type="button" onClick={() => deleteExam(exam)} className="shrink-0 p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`${t("حذف", "Delete")} ${exam.titleAr}`}><Trash2 size={16} /></button>
                  </SirajTooltip>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t("لا توجد اختبارات بعد.", "No exams yet.")}</p>
          )}

          {selectedExam && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{selectedExam.titleAr}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedExam.course.titleAr}
                    {selectedExam.lesson ? ` · ${selectedExam.lesson.titleAr}` : ""}
                    {" · "}{t("العلامة الكاملة", "Total mark")}: {selectedExam.questions.reduce((sum, question) => sum + question.points, 0)}
                  </p>
                </div>
                <SirajTooltip label={t("إغلاق تفاصيل الاختبار", "Close exam details")} side="bottom">
                  <button type="button" onClick={() => setSelectedExam(null)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t("إغلاق", "Close")}><X size={18} /></button>
                </SirajTooltip>
              </div>

              <form onSubmit={submitQuestion} className="space-y-3 mb-6">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{t("إضافة سؤال", "Add question")}</h4>
                <QuestionCard
                  question={detailQuestion}
                  index={selectedExam.questions.length}
                  t={t}
                  onChange={(patch) => setDetailQuestion((current) => ({ ...current, ...patch }))}
                />
                <button className="admin-button"><ListPlus size={16} />{t("حفظ السؤال", "Save question")}</button>
              </form>

              <div className="space-y-3">
                {selectedExam.questions.map((question) => (
                  <div key={question.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    {editingQuestionId === question.id ? (
                      <div className="space-y-2">
                        <input value={questionDraft.questionTextAr} onChange={(e) => setQuestionDraft({ ...questionDraft, questionTextAr: e.target.value })} placeholder={t("نص السؤال بالعربية", "Question text in Arabic")} className="admin-input" />
                        <input value={questionDraft.questionTextEn} onChange={(e) => setQuestionDraft({ ...questionDraft, questionTextEn: e.target.value })} placeholder={t("نص السؤال بالإنجليزية", "Question text in English")} className="admin-input" />
                        <div className="flex gap-2">
                          <input type="number" min="1" value={questionDraft.points} onChange={(e) => setQuestionDraft({ ...questionDraft, points: e.target.value })} placeholder={t("الدرجة", "Mark")} className="admin-input w-24" />
                          <button type="button" onClick={() => saveQuestionEdit(question.id)} className="admin-button">{t("حفظ", "Save")}</button>
                          <button type="button" onClick={() => setEditingQuestionId("")} className="px-3 py-2 text-sm text-gray-500">{t("إلغاء", "Cancel")}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {question.orderIndex + 1}. {question.questionTextAr}
                          <span className="ms-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">({question.points} {t("نقطة", "pt")})</span>
                        </p>
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={() => { setEditingQuestionId(question.id); setQuestionDraft({ questionTextAr: question.questionTextAr, questionTextEn: question.questionTextEn, points: String(question.points) }); }} className="px-2 py-1 text-xs rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">{t("تعديل", "Edit")}</button>
                          <SirajTooltip label={t("حذف هذا السؤال مع خياراته", "Delete this question and its options")} side="top">
                            <button type="button" onClick={() => deleteQuestion(question.id)} className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={t("حذف السؤال", "Delete question")}><Trash2 size={14} /></button>
                          </SirajTooltip>
                        </div>
                      </div>
                    )}
                    <div className="mt-2 space-y-1">
                      {question.options.map((option) => (
                        <div key={option.id} className="flex items-center gap-2 text-sm">
                          {editingOptionId === option.id ? (
                            <>
                              <input value={optionDraft} onChange={(e) => setOptionDraft(e.target.value)} className="admin-input flex-1" />
                              <button type="button" onClick={() => saveOptionEdit(option.id)} className="text-xs px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">{t("حفظ", "Save")}</button>
                              <button type="button" onClick={() => setEditingOptionId("")} className="text-xs px-2 py-1 text-gray-500">{t("إلغاء", "Cancel")}</button>
                            </>
                          ) : (
                            <>
                              <span className={option.isCorrect ? "text-emerald-600 font-medium" : "text-gray-600 dark:text-gray-400"}>
                                {option.isCorrect ? "★ " : ""}{option.optionTextAr}
                              </span>
                              <span className="flex-1" />
                              <button type="button" onClick={() => { setEditingOptionId(option.id); setOptionDraft(option.optionTextAr); }} className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">{t("تعديل", "Edit")}</button>
                              <SirajTooltip label={t("حذف هذا الخيار", "Delete this option")} side="top">
                              <button type="button" onClick={() => deleteOption(option.id)} className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={t("حذف الخيار", "Delete option")}><X size={13} /></button>
                            </SirajTooltip>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("الشهادات الصادرة", "Issued certificates")}</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              loadCertificates(certSearch);
            }}
            className="flex gap-2 mb-4"
          >
            <input
              value={certSearch}
              onChange={(e) => setCertSearch(e.target.value)}
              placeholder={t("بحث برقم الشهادة أو الاسم...", "Search by code or name...")}
              className="admin-input flex-1"
            />
            <button type="submit" className="admin-button">{t("بحث", "Search")}</button>
          </form>
          {certificates.length > 0 ? (
            <div className="space-y-2">
              {certificates.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                  <div className="min-w-0">
                    <span className="block text-gray-900 dark:text-white truncate">{cert.student.fullName} · {cert.course.titleAr}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{cert.certificateCode} · {new Date(cert.issueDate).toLocaleDateString("ar")}</span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{cert.student.email}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد شهادات صادرة بعد.", "No certificates issued yet.")}</p>
          )}
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-2">{t("المسارات التعليمية", "Learning paths")}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t("المسارات الثلاثة ثابتة ولا يمكن تعديلها أو إضافتها.", "The three paths are fixed and can't be edited or extended.")}</p>
          <div className="space-y-2">
            {COURSE_PATHS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                <span className="flex-1 text-gray-900 dark:text-white">{t(COURSE_PATH_LABELS[key].ar, COURSE_PATH_LABELS[key].en)} <span className="text-xs text-gray-400" dir="ltr">{key}</span></span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{courses.filter((course) => course.path === key).length} {t("دورات", "courses")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-2">{t("تصنيفات المكتبة", "Library categories")}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{t("تُستخدم هذه التصنيفات لعناصر المكتبة فقط (ليست مسارات للدورات).", "These categories are used for library items only (not course paths).")}</p>
          <form onSubmit={submitCategory} className="admin-category-form flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
            <input required placeholder={t("الاسم بالعربية", "Arabic name")} value={categoryForm.nameAr} onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })} className="admin-input flex-1 min-w-0" />
            <input required placeholder={t("الاسم بالإنجليزية", "English name")} value={categoryForm.nameEn} onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })} className="admin-input flex-1 min-w-0" />
            <input placeholder="slug (optional)" value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} className="admin-input flex-1 min-w-0" dir="ltr" />
            <button className="admin-button shrink-0">{t("إضافة", "Add")}</button>
          </form>
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                {editingCategoryId === category.id ? (
                  <>
                    <input value={categoryDraft.nameAr} onChange={(e) => setCategoryDraft({ ...categoryDraft, nameAr: e.target.value })} className="admin-input flex-1" />
                    <input value={categoryDraft.nameEn} onChange={(e) => setCategoryDraft({ ...categoryDraft, nameEn: e.target.value })} className="admin-input flex-1" />
                    <button type="button" onClick={() => saveCategoryEdit(category.id)} className="text-xs px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">{t("حفظ", "Save")}</button>
                    <button type="button" onClick={() => setEditingCategoryId("")} className="text-xs px-2 py-1 text-gray-500">{t("إلغاء", "Cancel")}</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-gray-900 dark:text-white">{t(category.nameAr, category.nameEn)} <span className="text-xs text-gray-400" dir="ltr">{category.slug}</span></span>
                    <button type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryDraft({ nameAr: category.nameAr, nameEn: category.nameEn }); }} className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">{t("تعديل", "Edit")}</button>
                    <button type="button" onClick={() => deleteCategory(category)} className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">{t("حذف", "Delete")}</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("الأسئلة الشائعة", "FAQs")}</h2>
          <form onSubmit={submitFaq} className="grid sm:grid-cols-2 gap-2 mb-4">
            <input required placeholder={t("السؤال بالعربية", "Arabic question")} value={faqForm.questionAr} onChange={(e) => setFaqForm({ ...faqForm, questionAr: e.target.value })} className="admin-input" />
            <input required placeholder={t("السؤال بالإنجليزية", "English question")} value={faqForm.questionEn} onChange={(e) => setFaqForm({ ...faqForm, questionEn: e.target.value })} className="admin-input" />
            <textarea required placeholder={t("الإجابة بالعربية", "Arabic answer")} value={faqForm.answerAr} onChange={(e) => setFaqForm({ ...faqForm, answerAr: e.target.value })} className="admin-input" />
            <textarea required placeholder={t("الإجابة بالإنجليزية", "English answer")} value={faqForm.answerEn} onChange={(e) => setFaqForm({ ...faqForm, answerEn: e.target.value })} className="admin-input" />
            <input type="number" min="0" placeholder="order" value={faqForm.orderIndex} onChange={(e) => setFaqForm({ ...faqForm, orderIndex: e.target.value })} className="admin-input" />
            <button className="admin-button">{t("إضافة سؤال", "Add question")}</button>
          </form>
          <div className="space-y-2">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                {editingFaqId === faq.id ? (
                  <div className="space-y-2">
                    <input value={faqDraft.questionAr} onChange={(e) => setFaqDraft({ ...faqDraft, questionAr: e.target.value })} className="admin-input" />
                    <textarea value={faqDraft.answerAr} onChange={(e) => setFaqDraft({ ...faqDraft, answerAr: e.target.value })} className="admin-input" />
                    <input type="number" min="0" value={faqDraft.orderIndex} onChange={(e) => setFaqDraft({ ...faqDraft, orderIndex: e.target.value })} className="admin-input" />
                    <div className="flex gap-1">
                      <button type="button" onClick={() => saveFaqEdit(faq.id)} className="text-xs px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">{t("حفظ", "Save")}</button>
                      <button type="button" onClick={() => setEditingFaqId("")} className="text-xs px-2 py-1 text-gray-500">{t("إلغاء", "Cancel")}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-900 dark:text-white truncate">{t(faq.questionAr, faq.questionEn)}</span>
                    <span className="flex gap-1 shrink-0">
                      <button type="button" onClick={() => { setEditingFaqId(faq.id); setFaqDraft({ questionAr: faq.questionAr, answerAr: faq.answerAr, orderIndex: String(faq.orderIndex) }); }} className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">{t("تعديل", "Edit")}</button>
                      <button type="button" onClick={() => deleteFaq(faq.id)} className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">{t("حذف", "Delete")}</button>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("رسائل التواصل", "Contact messages")}</h2>
          {contactMessages.length > 0 ? (
            <div className="space-y-2">
              {contactMessages.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white truncate">{item.subject} · {item.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">{item.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.email}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{item.message}</p>
                  <div className="flex gap-1 mt-2">
                    {(["new", "read", "replied"] as const).map((status) => (
                      <SirajTooltip
                        key={status}
                        label={
                          status === "new"
                            ? t("رسالة جديدة لم تُفتح بعد", "New message, not yet opened")
                            : status === "read"
                              ? t("تم مشاهدة محتوى الرسالة", "Message content was viewed")
                              : t("تم ردّ المشرف على الرسالة", "The admin replied to the message")
                        }
                        side="bottom"
                      >
                        <button
                          type="button"
                          disabled={item.status === status}
                          onClick={() => markMessage(item.id, status)}
                          className="text-xs px-2 py-1 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40"
                        >
                          {status}
                        </button>
                      </SirajTooltip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد رسائل.", "No messages.")}</p>
          )}
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("مشتركو النشرة", "Newsletter subscribers")} ({subscriberTotal})</h2>
          {newsletterSubs.length > 0 ? (
            <div className="space-y-2">
              {newsletterSubs.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                  <span className="text-gray-900 dark:text-white truncate" dir="ltr">{sub.email}</span>
                  <span className="text-xs text-gray-400 shrink-0">{new Date(sub.subscribedAt).toLocaleDateString("ar")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا يوجد مشتركون بعد.", "No subscribers yet.")}</p>
          )}
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("عناصر المكتبة المضافة", "Added library items")}</h2>
          {libraryItems.length > 0 ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{libraryItems.map((item) => (
            <div key={item.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              {editingLibraryId === item.id ? (
                <div className="space-y-2">
                  <input value={libraryDraft.titleAr} onChange={(e) => setLibraryDraft({ ...libraryDraft, titleAr: e.target.value })} className="admin-input" />
                  <input value={libraryDraft.authorName} onChange={(e) => setLibraryDraft({ ...libraryDraft, authorName: e.target.value })} placeholder={t("المؤلف", "Author")} className="admin-input" />
                  <select value={libraryDraft.type} onChange={(e) => setLibraryDraft({ ...libraryDraft, type: e.target.value })} className="admin-input"><option value="book">كتاب</option><option value="article">مقال</option><option value="research">بحث</option><option value="lecture">محاضرة</option></select>
                  <div className="flex items-center gap-2">
                    {(editCover.preview || (libraryDraft.coverImageUrl && !editCover.removeCover)) ? (
                      <div className="w-14 aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                        <img src={editCover.preview ?? libraryDraft.coverImageUrl ?? ""} alt={t("الغلاف الحالي", "Current cover")} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-14 aspect-[3/4] rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 shrink-0"><ImagePlus size={16} /></div>
                    )}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs px-2 py-1 rounded-lg cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 w-fit">
                        {t(editCover.preview ? "استبدال الصورة" : "اختر صورة", editCover.preview ? "Replace image" : "Choose image")}
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickEditCover(e.target.files?.[0] ?? null)} />
                      </label>
                      {(libraryDraft.coverImageUrl || editCover.preview) && (
                        <button type="button" onClick={() => setEditCover((prev) => { if (prev.preview) URL.revokeObjectURL(prev.preview); return { file: null, preview: null, removeCover: true }; })} className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 w-fit">{t("حذف الصورة", "Remove image")}</button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => saveLibraryEdit(item.id)} className="text-xs px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">{t("حفظ", "Save")}</button>
                    <button type="button" onClick={() => { setEditingLibraryId(""); setEditCover({ file: null, preview: null, removeCover: false }); }} className="text-xs px-2 py-1 text-gray-500">{t("إلغاء", "Cancel")}</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.titleAr}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.type} {item.authorName ? `· ${item.authorName}` : ""}</p>
                  <div className="flex gap-1 mt-2">
                    <button type="button" onClick={() => { setEditingLibraryId(item.id); setEditCover({ file: null, preview: null, removeCover: false }); setLibraryDraft({ titleAr: item.titleAr, authorName: item.authorName ?? "", type: item.type, contentUrl: item.contentUrl, coverImageUrl: item.coverImageUrl ?? null }); }} className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">{t("تعديل", "Edit")}</button>
                    <button type="button" onClick={() => deleteLibraryItem(item.id)} className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">{t("حذف", "Delete")}</button>
                  </div>
                </>
              )}
            </div>
          ))}</div> : <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد عناصر مضافة بعد.", "No library items added yet.")}</p>}
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("الدورات الحالية", "Current courses")}</h2>

          {editingCourse && (
            <>
            <form onSubmit={submitEditCourse} className="mb-4 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><BookPlus size={16} />{t("تعديل الدورة", "Edit course")}: {editingCourse.titleAr}</h3>
              <input required placeholder={t("العنوان بالعربية", "Arabic title")} value={editForm.titleAr} onChange={(e) => setEditForm({ ...editForm, titleAr: e.target.value })} className="admin-input" />
              <input placeholder={t("العنوان بالإنجليزية", "English title")} value={editForm.titleEn} onChange={(e) => setEditForm({ ...editForm, titleEn: e.target.value })} className="admin-input" />
              <textarea placeholder={t("الوصف بالعربية", "Arabic description")} value={editForm.shortDescriptionAr} onChange={(e) => setEditForm({ ...editForm, shortDescriptionAr: e.target.value })} className="admin-input min-h-20" />
              <textarea placeholder={t("الوصف بالإنجليزية", "English description")} value={editForm.shortDescriptionEn} onChange={(e) => setEditForm({ ...editForm, shortDescriptionEn: e.target.value })} className="admin-input min-h-20" />
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("المسار", "Path")}</label>
              <select required value={editForm.path} onChange={(e) => setEditForm({ ...editForm, path: e.target.value })} className="admin-input">
                {COURSE_PATHS.map((key) => <option key={key} value={key}>{t(COURSE_PATH_LABELS[key].ar, COURSE_PATH_LABELS[key].en)}</option>)}
              </select>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t("المعلم", "Instructor")}</label>
              <input placeholder={t("اسم المعلم بالعربية", "Instructor name (Arabic)")} value={editForm.instructorNameAr} onChange={(e) => setEditForm({ ...editForm, instructorNameAr: e.target.value })} className="admin-input" />
              <input placeholder={t("اسم المعلم بالإنجليزية", "Instructor name (English)")} value={editForm.instructorNameEn} onChange={(e) => setEditForm({ ...editForm, instructorNameEn: e.target.value })} className="admin-input" />
              <input type="number" min="0" step="1" placeholder={t("مدة الدورة بالساعات (اختياري)", "Course duration in hours (optional)")} value={editForm.durationHours} onChange={(e) => setEditForm({ ...editForm, durationHours: e.target.value })} className="admin-input" />
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white/60 dark:bg-gray-900/40 p-3 space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white"><LibraryBig size={15} className="text-emerald-600 dark:text-emerald-400" />{t("المراجع والمصادر", "References & Sources")}</h3>
                <CourseReferencesPicker value={editForm.libraryItemIds} onChange={(ids) => setEditForm({ ...editForm, libraryItemIds: ids })} />
              </div>
              <input placeholder={t("مسار الصورة", "Image path")} value={editForm.coverImageUrl} onChange={(e) => setEditForm({ ...editForm, coverImageUrl: e.target.value })} className="admin-input" />
              <SirajTooltip label={t("اختر صورة جديدة للدورة", "Choose a new course image")} side="top" className="w-full">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setEditCourseImage(e.target.files?.[0] ?? null)} className="admin-input" />
              </SirajTooltip>
              <div className="flex gap-2">
                <button type="submit" className="admin-button flex-1"><ImagePlus size={16} />{t("حفظ التعديلات", "Save changes")}</button>
                <button type="button" onClick={() => { setEditingCourse(null); setEditCourseImage(null); }} className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{t("إلغاء", "Cancel")}</button>
              </div>
            </form>
            <CourseLessonsManager
              key={editingCourse.id}
              courseId={editingCourse.id}
              lessons={editingCourse.lessons}
              exams={exams}
              onChanged={loadCourses}
              notify={notify}
            />
            </>
          )}

          <div className="space-y-2">{courses.map((course) => <div key={course.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><div className="min-w-0"><span className="block text-sm text-gray-900 dark:text-white truncate">{course.titleAr}</span><span className="text-xs text-gray-500 dark:text-gray-400">{course.lessons.length} {t("دروس", "lessons")} · {course.instructorNameAr || course.instructorNameEn || t("بدون مدرّس", "No instructor")}</span></div><div className="flex items-center gap-2 shrink-0"><SirajTooltip label={t("فتح بيانات الدورة لتعديلها", "Open the course data for editing")} side="top"><button type="button" onClick={() => startEditCourse(course)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/60" aria-label={`${t("تعديل", "Edit")} ${course.titleAr}`}><BookPlus size={14} />{t("تعديل", "Edit")}</button></SirajTooltip><SirajTooltip label={t("حذف الدورة مع كل محتواها ودروسها", "Delete the course and all its lessons and content")} side="top"><button type="button" onClick={() => deleteCourse(course)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-300 dark:bg-red-950/40 dark:hover:bg-red-950/60" aria-label={`${t("حذف", "Delete")} ${course.titleAr}`}><Trash2 size={14} />{t("حذف", "Delete")}</button></SirajTooltip></div></div>)}</div>
        </div>

        <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Users size={18} />{t("ملفات المشتركين", "Subscriber files")}</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              loadSubscribers(userSearch);
            }}
            className="flex gap-2 mb-4"
          >
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder={t("بحث بالبريد أو الاسم...", "Search by email or name...")}
              className="admin-input flex-1"
            />
            <button type="submit" className="admin-button">{t("بحث", "Search")}</button>
          </form>
          {subscribers.length > 0 ? (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-start text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800"><th className="p-3 text-start">{t("الاسم", "Name")}</th><th className="p-3 text-start">{t("البريد", "Email")}</th><th className="p-3 text-start">{t("التسجيل", "Joined")}</th><th className="p-3 text-start">{t("الدورات", "Courses")}</th><th className="p-3 text-start">{t("الدور", "Role")}</th><th className="p-3 text-start">{t("الحالة", "Status")}</th><th className="p-3 text-start">{t("إجراءات", "Actions")}</th></tr></thead><tbody>{subscribers.map((subscriber) => <tr key={subscriber.id} className="border-b border-gray-100 dark:border-gray-800/70 text-gray-700 dark:text-gray-300"><td className="p-3"><SirajTooltip label={t("عرض الملف الكامل للمشترك", "View the subscriber's full profile")} side="top"><button type="button" disabled={detailsLoading} onClick={() => showSubscriberDetails(subscriber.id)} className="inline-flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50" aria-label={`${t("عرض ملف", "View profile")} ${subscriber.fullName}`}><Users size={15} />{subscriber.fullName}</button></SirajTooltip></td><td className="p-3">{subscriber.email}</td><td className="p-3">{new Date(subscriber.createdAt).toLocaleDateString("ar")}</td><td className="p-3">{subscriber._count.courseProgress}</td><td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-lg ${subscriber.role === "ADMIN" ? "bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>{subscriber.role}</span></td><td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-lg ${subscriber.status === "ACTIVE" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400" : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"}`}>{subscriber.status}</span></td><td className="p-3"><div className="flex items-center gap-1">{subscriber.role === "ADMIN" ? <SirajTooltip label={t("تحويل المشترك إلى دور طالب", "Convert the subscriber to a student role")} side="top"><button type="button" onClick={() => updateSubscriber(subscriber.id, { role: "STUDENT" }, t("تحويل لطالب؟", "Convert to Student?"))} className="px-2 py-1 text-xs rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">{t("تحويل لطالب", "Convert to Student")}</button></SirajTooltip> : <SirajTooltip label={t("منح المشترك صلاحيات المشرف", "Grant the subscriber admin permissions")} side="top"><button type="button" onClick={() => updateSubscriber(subscriber.id, { role: "ADMIN" }, t("ترقية لمشرف؟", "Promote to Admin?"))} className="px-2 py-1 text-xs rounded-lg text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30">{t("ترقية لمشرف", "Promote to Admin")}</button></SirajTooltip>}{subscriber.status === "ACTIVE" ? <SirajTooltip label={t("منع هذا الحساب من تسجيل الدخول (يمكن التفعيل لاحقاً)", "Prevent this account from signing in (can re-enable later)")} side="top"><button type="button" onClick={() => updateSubscriber(subscriber.id, { status: "DISABLED" }, t("تعطيل هذا الحساب؟", "Disable this account?"))} className="px-2 py-1 text-xs rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">{t("تعطيل", "Disable")}</button></SirajTooltip> : <SirajTooltip label={t("إعادة تفعيل تسجيل الدخول لهذا الحساب", "Re-enable sign-in for this account")} side="top"><button type="button" onClick={() => updateSubscriber(subscriber.id, { status: "ACTIVE" }, t("تفعيل هذا الحساب؟", "Enable this account?"))} className="px-2 py-1 text-xs rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">{t("تفعيل", "Enable")}</button></SirajTooltip>}</div></td></tr>)}</tbody></table></div>
          ) : <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا يوجد مشتركون بعد.", "No subscribers yet.")}</p>}
        </div>

        {selectedSubscriber && (
          <div className="mt-6 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div><h2 className="font-bold text-lg text-gray-900 dark:text-white">{t("ملف المشترك", "Subscriber profile")}</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{selectedSubscriber.fullName} · {selectedSubscriber.email} · {selectedSubscriber.role} · {selectedSubscriber.status}</p></div>
              <SirajTooltip label={t("إغلاق ملف المشترك", "Close subscriber profile")} side="bottom">
              <button type="button" onClick={() => setSelectedSubscriber(null)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t("إغلاق الملف", "Close profile")}><X size={18} /></button>
            </SirajTooltip>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mb-6 text-sm"><div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><span className="block text-xs text-gray-500 mb-1">{t("تاريخ التسجيل", "Joined")}</span>{new Date(selectedSubscriber.createdAt).toLocaleDateString("ar")}</div><div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><span className="block text-xs text-gray-500 mb-1">{t("المزوّد", "Provider")}</span>{selectedSubscriber.authProvider}</div><div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800"><span className="block text-xs text-gray-500 mb-1">{t("الدروس المكتملة", "Completed lessons")}</span>{selectedSubscriber.lessonCompletions.length}</div></div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t("تقدم الدورات", "Course progress")}</h3>
            {selectedSubscriber.courseProgress.length > 0 ? <div className="space-y-2 mb-6">{selectedSubscriber.courseProgress.map((entry) => <div key={entry.course.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm"><span className="text-gray-900 dark:text-white">{entry.course.titleAr}</span><span className="text-xs text-gray-500 dark:text-gray-400">{entry.status} · {String(entry.completionPercentage)}%</span></div>)}</div> : <p className="text-sm text-gray-500 mb-6">{t("لم يسجل في دورات بعد.", "No course enrollments yet.")}</p>}
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t("تقدم الدروس", "Lesson progress")}</h3>
            {selectedSubscriber.lessonCompletions.length > 0 ? <div className="space-y-2">{selectedSubscriber.lessonCompletions.map((item, index) => <div key={`${item.lesson.course.titleAr}-${item.lesson.orderIndex}-${index}`} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm"><span className="text-gray-700 dark:text-gray-300">{item.lesson.course.titleAr}: {item.lesson.titleAr}</span><span className="text-emerald-600">{new Date(item.completedAt).toLocaleDateString("ar")}</span></div>)}</div> : <p className="text-sm text-gray-500">{t("لا يوجد تقدم مسجل بعد.", "No progress recorded yet.")}</p>}
          </div>
        )}
      </div>
      <SirajDialog {...dialog} />
    </div>
  );
}
