"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useLang } from "@/lib/lang-context";
import PageHeader from "@/components/admin/PageHeader";
import { ListSkeleton } from "@/components/admin/AdminSkeleton";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import type { AdminCategory } from "@/components/admin/types";

export default function AdminCategoriesPage() {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ nameAr: "", nameEn: "", slug: "" });
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [categoryDraft, setCategoryDraft] = useState({ nameAr: "", nameEn: "" });

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("load failed");
      setCategories(await response.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

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
    if (response.ok) await loadCategories();
  };

  return (
    <div>
      <PageHeader
        title={t("التصنيفات", "Categories")}
        subtitle={t("تُستخدم هذه التصنيفات لعناصر المكتبة فقط (ليست مسارات للدورات).", "These categories are used for library items only (not course paths).")}
      />

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <form onSubmit={(e) => void submitCategory(e)} className="admin-category-form flex flex-col sm:flex-row flex-wrap gap-2 mb-4">
          <input required placeholder={t("الاسم بالعربية", "Arabic name")} aria-label={t("الاسم بالعربية", "Arabic name")} value={categoryForm.nameAr} onChange={(e) => setCategoryForm({ ...categoryForm, nameAr: e.target.value })} className="admin-input flex-1 min-w-0" />
          <input required placeholder={t("الاسم بالإنجليزية", "English name")} aria-label={t("الاسم بالإنجليزية", "English name")} value={categoryForm.nameEn} onChange={(e) => setCategoryForm({ ...categoryForm, nameEn: e.target.value })} className="admin-input flex-1 min-w-0" />
          <input placeholder="slug (optional)" aria-label="slug (optional)" value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} className="admin-input flex-1 min-w-0" dir="ltr" />
          <button className="admin-button shrink-0">{t("إضافة", "Add")}</button>
        </form>
        {loading ? (
          <ListSkeleton rows={4} />
        ) : loadError ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل التصنيفات.", "Could not load categories.")}</p>
            <button type="button" onClick={() => void loadCategories()} className="admin-button w-auto px-6">
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                {editingCategoryId === category.id ? (
                  <>
                    <input aria-label={t("الاسم بالعربية", "Arabic name")} value={categoryDraft.nameAr} onChange={(e) => setCategoryDraft({ ...categoryDraft, nameAr: e.target.value })} className="admin-input flex-1" />
                    <input aria-label={t("الاسم بالإنجليزية", "English name")} value={categoryDraft.nameEn} onChange={(e) => setCategoryDraft({ ...categoryDraft, nameEn: e.target.value })} className="admin-input flex-1" />
                    <button type="button" onClick={() => void saveCategoryEdit(category.id)} className="text-xs px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                      {t("حفظ", "Save")}
                    </button>
                    <button type="button" onClick={() => setEditingCategoryId("")} className="text-xs px-2 py-1 text-gray-500">
                      {t("إلغاء", "Cancel")}
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-gray-900 dark:text-white">
                      {t(category.nameAr, category.nameEn)} <span className="text-xs text-gray-400" dir="ltr">{category.slug}</span>
                    </span>
                    <button type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryDraft({ nameAr: category.nameAr, nameEn: category.nameEn }); }} className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
                      {t("تعديل", "Edit")}
                    </button>
                    <button type="button" onClick={() => void deleteCategory(category)} className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                      {t("حذف", "Delete")}
                    </button>
                  </>
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
