"use client";

import { Check, GraduationCap, Plus, Trash2, X } from "lucide-react";
import SirajTooltip from "@/components/ui/SirajTooltip";
import type { BuilderQuestion } from "./types";

export default function QuestionCard({
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
  const setOption = (optionIndex: number, patch: Partial<BuilderQuestion["options"][number]>) =>
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
