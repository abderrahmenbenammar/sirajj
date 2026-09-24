"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { ImagePlus, LibraryBig } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import PageHeader from "@/components/admin/PageHeader";
import { ListSkeleton } from "@/components/admin/AdminSkeleton";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import { COVER_TYPES, MAX_COVER_SIZE, type LibraryItem } from "@/components/admin/types";

export default function AdminLibraryPage() {
  const { t } = useLang();
  const { dialog, notify } = useSirajMessage();
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [libraryForm, setLibraryForm] = useState({ type: "book", title: "", author: "", category: "", description: "", content: "", mediaUrl: "" });
  const [libraryCoverFile, setLibraryCoverFile] = useState<File | null>(null);
  const [libraryCoverPreview, setLibraryCoverPreview] = useState<string | null>(null);
  const [libraryFile, setLibraryFile] = useState<File | null>(null);
  const [editingLibraryId, setEditingLibraryId] = useState("");
  const [libraryDraft, setLibraryDraft] = useState({ titleAr: "", authorName: "", type: "book", contentUrl: "", coverImageUrl: null as string | null });
  const [editCover, setEditCover] = useState<{ file: File | null; preview: string | null; removeCover: boolean }>({ file: null, preview: null, removeCover: false });

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const response = await fetch("/api/admin/library");
      if (!response.ok) throw new Error("load failed");
      setLibraryItems(await response.json());
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

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

  const submitLibrary = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const fileKind = libraryFile?.type.startsWith("image/") ? "image" : libraryFile?.type.startsWith("video/") ? "video" : "document";
      const mediaUrl = libraryFile ? await uploadFile(libraryFile, fileKind) : libraryForm.mediaUrl;
      const coverImageUrl = libraryCoverFile ? await uploadFile(libraryCoverFile, "image") : null;
      if (libraryCoverFile) notify(t("تم رفع الغلاف بنجاح", "Cover uploaded successfully"), "success");
      const response = await fetch("/api/admin/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...libraryForm, mediaUrl, coverImageUrl }),
      });
      const result = await response.json().catch(() => null);
      notify(response.ok ? t("تمت إضافة عنصر المكتبة", "Library item added") : (result?.error ?? t("تعذر تنفيذ العملية", "Operation failed")), response.ok ? "success" : "error");
      if (response.ok) {
        setLibraryForm({ type: "book", title: "", author: "", category: "", description: "", content: "", mediaUrl: "" });
        setLibraryFile(null);
        setLibraryCoverFile(null);
        setLibraryCoverPreview((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        await loadLibrary();
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : t("تعذر رفع الملف", "Could not upload file"), "error");
    }
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
    } catch (error) {
      notify(error instanceof Error ? error.message : t("تعذر رفع الصورة", "Could not upload image"), "error");
    }
  };

  const pickLibraryCover = (file: File | null) => {
    setLibraryCoverPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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

  return (
    <div>
      <PageHeader title={t("المكتبة", "Library")} subtitle={t("إدارة عناصر مكتبة سراج", "Manage Siraj library items")} />

      <form onSubmit={(e) => void submitLibrary(e)} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-3 mb-6">
        <h2 className="font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <LibraryBig size={18} />
          {t("إضافة عنصر للمكتبة", "Add library item")}
        </h2>
        <select value={libraryForm.type} onChange={(e) => setLibraryForm({ ...libraryForm, type: e.target.value })} className="admin-input">
          <option value="book">كتاب</option>
          <option value="article">مقال</option>
          <option value="research">بحث</option>
          <option value="lecture">محاضرة</option>
        </select>
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
                <button type="button" onClick={() => pickLibraryCover(null)} className="text-xs px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 w-fit">
                  {t("حذف الصورة", "Remove image")}
                </button>
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
        <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,application/pdf,text/plain" onChange={(e) => setLibraryFile(e.target.files?.[0] ?? null)} className="admin-input" />
        <textarea placeholder={t("الوصف أو المحتوى", "Description or content")} value={libraryForm.content} onChange={(e) => setLibraryForm({ ...libraryForm, content: e.target.value })} className="admin-input min-h-24" />
        <button className="admin-button sm:w-auto sm:px-8">
          <LibraryBig size={16} />
          {t("حفظ عنصر المكتبة", "Save library item")}
        </button>
      </form>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
        <h2 className="font-bold text-gray-900 dark:text-white mb-4">{t("عناصر المكتبة المضافة", "Added library items")}</h2>
        {loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("جارٍ التحميل...", "Loading...")}</p>
        ) : loadError ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{t("تعذر تحميل المكتبة.", "Could not load library.")}</p>
            <button type="button" onClick={() => void loadLibrary()} className="admin-button w-auto px-6">
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        ) : libraryItems.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {libraryItems.map((item) => (
              <div key={item.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                {editingLibraryId === item.id ? (
                  <div className="space-y-2">
                    <input value={libraryDraft.titleAr} onChange={(e) => setLibraryDraft({ ...libraryDraft, titleAr: e.target.value })} className="admin-input" />
                    <input value={libraryDraft.authorName} onChange={(e) => setLibraryDraft({ ...libraryDraft, authorName: e.target.value })} placeholder={t("المؤلف", "Author")} className="admin-input" />
                    <select value={libraryDraft.type} onChange={(e) => setLibraryDraft({ ...libraryDraft, type: e.target.value })} className="admin-input">
                      <option value="book">كتاب</option>
                      <option value="article">مقال</option>
                      <option value="research">بحث</option>
                      <option value="lecture">محاضرة</option>
                    </select>
                    <div className="flex items-center gap-2">
                      {editCover.preview || (libraryDraft.coverImageUrl && !editCover.removeCover) ? (
                        <div className="w-14 aspect-[3/4] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                          <img src={editCover.preview ?? libraryDraft.coverImageUrl ?? ""} alt={t("الغلاف الحالي", "Current cover")} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-14 aspect-[3/4] rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 shrink-0">
                          <ImagePlus size={16} />
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs px-2 py-1 rounded-lg cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 w-fit">
                          {t(editCover.preview ? "استبدال الصورة" : "اختر صورة", editCover.preview ? "Replace image" : "Choose image")}
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickEditCover(e.target.files?.[0] ?? null)} />
                        </label>
                        {(libraryDraft.coverImageUrl || editCover.preview) && (
                          <button
                            type="button"
                            onClick={() => setEditCover((prev) => { if (prev.preview) URL.revokeObjectURL(prev.preview); return { file: null, preview: null, removeCover: true }; })}
                            className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 w-fit"
                          >
                            {t("حذف الصورة", "Remove image")}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => void saveLibraryEdit(item.id)} className="text-xs px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                        {t("حفظ", "Save")}
                      </button>
                      <button type="button" onClick={() => { setEditingLibraryId(""); setEditCover({ file: null, preview: null, removeCover: false }); }} className="text-xs px-2 py-1 text-gray-500">
                        {t("إلغاء", "Cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.titleAr}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {item.type} {item.authorName ? `· ${item.authorName}` : ""}
                    </p>
                    <div className="flex gap-1 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingLibraryId(item.id);
                          setEditCover({ file: null, preview: null, removeCover: false });
                          setLibraryDraft({ titleAr: item.titleAr, authorName: item.authorName ?? "", type: item.type, contentUrl: item.contentUrl, coverImageUrl: item.coverImageUrl ?? null });
                        }}
                        className="text-xs px-2 py-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        {t("تعديل", "Edit")}
                      </button>
                      <button type="button" onClick={() => void deleteLibraryItem(item.id)} className="text-xs px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                        {t("حذف", "Delete")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد عناصر مضافة بعد.", "No library items added yet.")}</p>
        )}
      </div>
      <SirajDialog {...dialog} />
    </div>
  );
}
