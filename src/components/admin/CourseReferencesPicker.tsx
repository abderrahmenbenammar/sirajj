"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { libraryTypeLabel } from "@/lib/library-types";

type ReferenceItem = { id: string; type: string; titleAr: string; titleEn: string; authorName: string | null };

interface CourseReferencesPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
}

const TYPE_BADGE: Record<string, string> = {
  book: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
  article: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400",
  research: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400",
  lecture: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400",
};

export default function CourseReferencesPicker({ value, onChange }: CourseReferencesPickerProps) {
  const { t } = useLang();
  const [items, setItems] = useState<ReferenceItem[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/library")
      .then((response) => (response.ok ? response.json() : []))
      .then((data: unknown) => {
        if (active) setItems(Array.isArray(data) ? (data as ReferenceItem[]) : []);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.titleAr.toLowerCase().includes(q) ||
        item.titleEn.toLowerCase().includes(q) ||
        (item.authorName ?? "").toLowerCase().includes(q)
    );
  }, [items, query]);

  const selected = useMemo(() => {
    if (!items) return [];
    return value
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is ReferenceItem => Boolean(item));
  }, [items, value]);

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((existing) => existing !== id));
    else onChange([...value, id]);
  };

  if (items === null) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t("جارٍ تحميل المكتبة...", "Loading library...")}</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{t("لا توجد عناصر في المكتبة لإضافتها كمراجع", "No library items available as references")}</p>;
  }

  return (
    <div className="space-y-3">
      {/* Selected references */}
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          {t(`المراجع المختارة (${selected.length})`, `Selected references (${selected.length})`)}
        </p>
        {selected.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("لا توجد مراجع مختارة بعد.", "No references selected yet.")}</p>
        ) : (
          <ul className="space-y-1.5">
            {selected.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2">
                <div className="min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded-lg inline-block mb-1 ${TYPE_BADGE[item.type] ?? TYPE_BADGE.book}`}>
                    {t(libraryTypeLabel(item.type).ar, libraryTypeLabel(item.type).en)}
                  </span>
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {item.titleAr}
                    {item.titleEn && <span className="text-gray-400"> · {item.titleEn}</span>}
                  </p>
                  {item.authorName && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.authorName}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  className="shrink-0 p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  aria-label={t("إزالة المرجع", "Remove reference")}
                >
                  <X size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Search + results */}
      <div>
        <div className="relative">
          <Search size={15} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("ابحث في عناصر المكتبة...", "Search library items...")}
            className="admin-input pl-9"
          />
        </div>
        <ul className="mt-2 max-h-52 overflow-y-auto space-y-1 pr-1">
          {filtered.length === 0 ? (
            <li className="text-sm text-gray-500 dark:text-gray-400 py-2">{t("لا توجد عناصر مطابقة للبحث.", "No items match your search.")}</li>
          ) : (
            filtered.map((item) => {
              const isSelected = value.includes(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => toggle(item.id)}
                    className={`w-full text-start flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${isSelected ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/30" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60"}`}
                  >
                    <span className={`shrink-0 p-1 rounded-md ${isSelected ? "bg-emerald-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                      {isSelected ? <Plus size={13} className="rotate-45" /> : <Plus size={13} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-gray-900 dark:text-white truncate">{item.titleAr}{item.titleEn && <span className="text-gray-400"> · {item.titleEn}</span>}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">
                        {t(libraryTypeLabel(item.type).ar, libraryTypeLabel(item.type).en)}
                        {item.authorName ? ` · ${item.authorName}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}