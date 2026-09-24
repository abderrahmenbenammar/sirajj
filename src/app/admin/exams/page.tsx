"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { GraduationCap, ListPlus, Plus, Trash2, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import PageHeader from "@/components/admin/PageHeader";
import QuestionCard from "@/components/admin/QuestionCard";
import { ListSkeleton } from "@/components/admin/AdminSkeleton";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import SirajTooltip from "@/components/ui/SirajTooltip";
import {
  makeBuilderQuestion,
  type AdminExam,
  type AdminExamDetail,
  type BuilderQuestion,
  type Course,
} from "@/components/admin/types";

export default function AdminExamsPage() {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [courses, setCourses] = useState<Course[]>([]);
  const [exams, setExams] = useState<AdminExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [examForm, setExamForm] = useState({ courseId: "", lessonId: "" });
  const [builderQuestions, setBuilderQuestions] = useState<BuilderQuestion[]>(() => [makeBuilderQuestion()]);
  const [builderError, setBuilderError] = useState("");
  const [selectedExam, setSelectedExam] = useState<AdminExamDetail | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [questionDraft, setQuestionDraft] = useState({ questionTextAr: "", questionTextEn: "", points: "1" });
  const [editingOptionId, setEditingOptionId] = useState("");
  const [optionDraft, setOptionDraft] = useState("");
  const [detailQuestion, setDetailQuestion] = useState<BuilderQuestion>(() => makeBuilderQuestion());

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [coursesRes, examsRes] = await Promise.all([fetch("/api/admin/courses"), fetch("/api/admin/exams")]);
      if (!coursesRes.ok || !examsRes.ok) throw new Error("load failed");
      const coursesData = await coursesRes.json();
      setCourses(Array.isArray(coursesData) ? coursesData : (coursesData.courses ?? []));
      setExams(await examsRes.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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

  const builderLessons = courses.find((course) => course.id === examForm.courseId)?.lessons ?? [];
  // One exam per lesson: hide lessons that already have an exam in the
  // selected course. Reuses the already-loaded exams list (no extra requests).
  const examLessonIds = new Set(
    exams.filter((exam) => exam.courseId === examForm.courseId && exam.lessonId).map((exam) => exam.lessonId as string)
  );
  const availableBuilderLessons = builderLessons.filter((lesson) => !examLessonIds.has(lesson.id));
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

  const query = search.trim().toLowerCase();
  const visibleExams = exams.filter(
    (exam) =>
      (courseFilter === "ALL" || exam.courseId === courseFilter) &&
      (!query || exam.titleAr.toLowerCase().includes(query) || exam.titleEn.toLowerCase().includes(query))
  );

  return (
    <div>
      <PageHeader title={t("الاختبارات", "Exams")} subtitle={t("إدارة اختبارات منصة سراج", "Manage Siraj platform exams")} />

      {loading ? (
        <ListSkeleton rows={6} />
      ) : loadError ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل الاختبارات.", "Could not load exams.")}</p>
          <button type="button" onClick={() => void loadAll()} className="admin-button w-auto px-6">
            {t("إعادة المحاولة", "Retry")}
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={(e) => void submitExam(e)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 sm:p-6 space-y-6">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <GraduationCap size={20} />
              </span>
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
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.titleAr}
                    </option>
                  ))}
                </select>
                <select value={examForm.lessonId} disabled={!examForm.courseId} onChange={(e) => setExamForm({ ...examForm, lessonId: e.target.value })} className="admin-input disabled:opacity-60">
                  <option value="">{t("بدون فيديو مرتبط", "No linked video")}</option>
                  {availableBuilderLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.titleAr}
                    </option>
                  ))}
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
                <Plus size={15} />
                {t("إضافة سؤال آخر", "Add another question")}
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
              <div className="flex gap-2">
                <button className="admin-button sm:w-auto sm:px-8">
                  <ListPlus size={16} />
                  {t("حفظ الاختبار", "Save exam")}
                </button>
                <button type="button" onClick={resetExamBuilder} className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  {t("إلغاء", "Cancel")}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("بحث...", "Search...")} className="admin-input sm:flex-1" />
              <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="admin-input sm:w-56">
                <option value="ALL">{t("كل الدورات", "All courses")}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.titleAr}
                  </option>
                ))}
              </select>
            </div>
            {visibleExams.length > 0 ? (
              <div className="space-y-2">
                {visibleExams.map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <button type="button" onClick={() => void loadExamDetail(exam.id)} className="min-w-0 text-start flex-1">
                      <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">{exam.titleAr}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
                        {exam.courseTitleAr}
                        {exam.lesson ? ` · ${exam.lesson.titleAr}` : ""} · {exam.questionCount} {t("أسئلة", "questions")} · {t("العلامة الكاملة", "Total mark")}: {exam.totalPoints} ·{" "}
                        {exam.available ? t("متاح", "Available") : t("غير مكتمل", "Incomplete")} · {exam.attemptCount} {t("محاولات", "attempts")}
                      </span>
                    </button>
                    <SirajTooltip label={t("حذف الاختبار وجميع نتائجه", "Delete the exam and all its results")} side="top">
                      <button type="button" onClick={() => void deleteExam(exam)} className="shrink-0 p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`${t("حذف", "Delete")} ${exam.titleAr}`}>
                        <Trash2 size={16} />
                      </button>
                    </SirajTooltip>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد اختبارات مطابقة.", "No matching exams.")}</p>
            )}

            {selectedExam && (
              <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{selectedExam.titleAr}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedExam.course.titleAr}
                      {selectedExam.lesson ? ` · ${selectedExam.lesson.titleAr}` : ""} · {t("العلامة الكاملة", "Total mark")}: {selectedExam.questions.reduce((sum, question) => sum + question.points, 0)}
                    </p>
                  </div>
                  <button type="button" onClick={() => setSelectedExam(null)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={t("إغلاق", "Close")}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={(e) => void submitQuestion(e)} className="space-y-3 mb-6">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">{t("إضافة سؤال", "Add question")}</h4>
                  <QuestionCard question={detailQuestion} index={selectedExam.questions.length} t={t} onChange={(patch) => setDetailQuestion((current) => ({ ...current, ...patch }))} />
                  <button className="admin-button sm:w-auto sm:px-8">
                    <ListPlus size={16} />
                    {t("حفظ السؤال", "Save question")}
                  </button>
                </form>

                <div className="space-y-3">
                  {selectedExam.questions.map((question) => (
                    <div key={question.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                      {editingQuestionId === question.id ? (
                        <div className="space-y-2">
                          <input value={questionDraft.questionTextAr} onChange={(e) => setQuestionDraft({ ...questionDraft, questionTextAr: e.target.value })} className="admin-input" />
                          <input value={questionDraft.questionTextEn} onChange={(e) => setQuestionDraft({ ...questionDraft, questionTextEn: e.target.value })} className="admin-input" />
                          <input type="number" min="1" value={questionDraft.points} onChange={(e) => setQuestionDraft({ ...questionDraft, points: e.target.value })} className="admin-input" />
                          <div className="flex gap-1">
                            <button type="button" onClick={() => void saveQuestionEdit(question.id)} className="text-xs px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                              {t("حفظ", "Save")}
                            </button>
                            <button type="button" onClick={() => setEditingQuestionId("")} className="text-xs px-2 py-1 text-gray-500">
                              {t("إلغاء", "Cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-gray-900 dark:text-white truncate">{t(question.questionTextAr, question.questionTextEn)}</span>
                          <span className="flex gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingQuestionId(question.id);
                                setQuestionDraft({ questionTextAr: question.questionTextAr, questionTextEn: question.questionTextEn, points: String(question.points) });
                              }}
                              className="text-xs px-2 py-1 rounded-lg text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              {t("تعديل", "Edit")}
                            </button>
                            <button type="button" onClick={() => void deleteQuestion(question.id)} className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                              {t("حذف", "Delete")}
                            </button>
                          </span>
                        </div>
                      )}
                      <div className="mt-2 space-y-1.5">
                        {question.options.map((option) => (
                          <div key={option.id} className="flex items-center gap-2 text-xs">
                            {editingOptionId === option.id ? (
                              <>
                                <input value={optionDraft} onChange={(e) => setOptionDraft(e.target.value)} className="admin-input flex-1 py-1" />
                                <button type="button" onClick={() => void saveOptionEdit(option.id)} className="text-xs px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                                  {t("حفظ", "Save")}
                                </button>
                                <button type="button" onClick={() => setEditingOptionId("")} className="text-xs px-2 py-1 text-gray-500">
                                  {t("إلغاء", "Cancel")}
                                </button>
                              </>
                            ) : (
                              <>
                                <span className={`flex-1 truncate ${option.isCorrect ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-gray-600 dark:text-gray-400"}`}>
                                  {t(option.optionTextAr, option.optionTextEn)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingOptionId(option.id);
                                    setOptionDraft(option.optionTextAr);
                                  }}
                                  className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  {t("تعديل", "Edit")}
                                </button>
                                <button type="button" onClick={() => void deleteOption(option.id)} className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                                  {t("حذف", "Delete")}
                                </button>
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
        </>
      )}
      <SirajDialog {...dialog} />
    </div>
  );
}
