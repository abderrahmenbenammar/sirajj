"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLang } from "@/lib/lang-context";
import PageHeader from "@/components/admin/PageHeader";
import { ListSkeleton } from "@/components/admin/AdminSkeleton";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import type { AdminFaq } from "@/components/admin/types";

export default function AdminFaqsPage() {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [faqs, setFaqs] = useState<AdminFaq[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [faqForm, setFaqForm] = useState({ questionAr: "", questionEn: "", answerAr: "", answerEn: "", orderIndex: "0" });
  const [editingFaqId, setEditingFaqId] = useState("");
  const [faqDraft, setFaqDraft] = useState({ questionAr: "", answerAr: "", orderIndex: "0" });

  const loadFaqsAdmin = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/faqs");
      if (!response.ok) throw new Error("load failed");
      setFaqs(await response.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFaqsAdmin();
  }, [loadFaqsAdmin]);

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

  return (
    <div>
      <PageHeader title={t("الأسئلة الشائعة", "FAQs")} subtitle={t("إدارة الأسئلة الشائعة", "Manage frequently asked questions")} />

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <form onSubmit={(e) => void submitFaq(e)} className="grid sm:grid-cols-2 gap-2 mb-4">
          <input required placeholder={t("السؤال بالعربية", "Arabic question")} aria-label={t("السؤال بالعربية", "Arabic question")} value={faqForm.questionAr} onChange={(e) => setFaqForm({ ...faqForm, questionAr: e.target.value })} className="admin-input" />
          <input required placeholder={t("السؤال بالإنجليزية", "English question")} aria-label={t("السؤال بالإنجليزية", "English question")} value={faqForm.questionEn} onChange={(e) => setFaqForm({ ...faqForm, questionEn: e.target.value })} className="admin-input" />
          <textarea required placeholder={t("الإجابة بالعربية", "Arabic answer")} aria-label={t("الإجابة بالعربية", "Arabic answer")} value={faqForm.answerAr} onChange={(e) => setFaqForm({ ...faqForm, answerAr: e.target.value })} className="admin-input" />
          <textarea required placeholder={t("الإجابة بالإنجليزية", "English answer")} aria-label={t("الإجابة بالإنجليزية", "English answer")} value={faqForm.answerEn} onChange={(e) => setFaqForm({ ...faqForm, answerEn: e.target.value })} className="admin-input" />
          <input type="number" min="0" placeholder="order" aria-label="order" value={faqForm.orderIndex} onChange={(e) => setFaqForm({ ...faqForm, orderIndex: e.target.value })} className="admin-input" />
          <button className="admin-button">{t("إضافة سؤال", "Add question")}</button>
        </form>
        {loading ? (
          <ListSkeleton rows={4} />
        ) : loadError ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل الأسئلة.", "Could not load questions.")}</p>
            <button type="button" onClick={() => void loadFaqsAdmin()} className="admin-button w-auto px-6">
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq) => (
              <div key={faq.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                {editingFaqId === faq.id ? (
                  <div className="space-y-2">
                    <input aria-label={t("السؤال بالعربية", "Arabic question")} value={faqDraft.questionAr} onChange={(e) => setFaqDraft({ ...faqDraft, questionAr: e.target.value })} className="admin-input" />
                    <textarea aria-label={t("الإجابة بالعربية", "Arabic answer")} value={faqDraft.answerAr} onChange={(e) => setFaqDraft({ ...faqDraft, answerAr: e.target.value })} className="admin-input" />
                    <input aria-label={t("الترتيب", "Order")} type="number" min="0" value={faqDraft.orderIndex} onChange={(e) => setFaqDraft({ ...faqDraft, orderIndex: e.target.value })} className="admin-input" />
                    <div className="flex gap-1">
                      <button type="button" onClick={() => void saveFaqEdit(faq.id)} className="text-xs px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                        {t("حفظ", "Save")}
                      </button>
                      <button type="button" onClick={() => setEditingFaqId("")} className="text-xs px-2 py-1 text-gray-500">
                        {t("إلغاء", "Cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-900 dark:text-white truncate">{t(faq.questionAr, faq.questionEn)}</span>
                    <span className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFaqId(faq.id);
                          setFaqDraft({ questionAr: faq.questionAr, answerAr: faq.answerAr, orderIndex: String(faq.orderIndex) });
                        }}
                        className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t("تعديل", "Edit")}
                      </button>
                      <button type="button" onClick={() => void deleteFaq(faq.id)} className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                        {t("حذف", "Delete")}
                      </button>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <SirajDialog {...dialog} />
    </div>
  );
}
