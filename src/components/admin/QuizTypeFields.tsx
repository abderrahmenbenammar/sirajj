"use client";

import { useLang } from "@/lib/lang-context";
import type { MatnQuizType } from "@/actions/matn-actions";

export const MATN_QUIZ_TYPES: readonly MatnQuizType[] = [
  "write",
  "reorder",
  "fill_blank",
  "mcq",
];

export function isMatnQuizType(value: unknown): value is MatnQuizType {
  return typeof value === "string" && (MATN_QUIZ_TYPES as readonly string[]).includes(value);
}

/** "line1\nline2" -> ["line1", "line2"] (trimmed, empty lines dropped). */
export function parseOptionsText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Stored JSON options -> textarea text. */
export function optionsToText(options: unknown): string {
  if (!Array.isArray(options)) return "";
  return options.filter((option): option is string => typeof option === "string").join("\n");
}

type Props = {
  idPrefix: string;
  type: MatnQuizType;
  onTypeChange: (type: MatnQuizType) => void;
  optionsText: string;
  onOptionsTextChange: (text: string) => void;
  disabled?: boolean;
};

/**
 * Question-type selector shared by the create/edit quiz forms.
 * The mcq option list is edited as one option per line; the other
 * structured types derive everything from the correct text.
 */
export default function QuizTypeFields({
  idPrefix,
  type,
  onTypeChange,
  optionsText,
  onOptionsTextChange,
  disabled = false,
}: Props) {
  const { t } = useLang();

  return (
    <div>
      <label
        htmlFor={`${idPrefix}-type`}
        className="mb-1 mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300"
      >
        {t("نوع السؤال", "Question type")}
      </label>
      <select
        id={`${idPrefix}-type`}
        value={type}
        disabled={disabled}
        onChange={(event) => onTypeChange(event.target.value as MatnQuizType)}
        className="admin-input"
      >
        <option value="write">{t("كتابة حرية (إجابة نصية)", "Free writing (text answer)")}</option>
        <option value="reorder">{t("رتّب الكلمات", "Reorder the words")}</option>
        <option value="fill_blank">{t("كلمات ناقصة", "Fill in the blanks")}</option>
        <option value="mcq">{t("اختيار من متعدد", "Multiple choice")}</option>
      </select>

      {type === "mcq" && (
        <>
          <label
            htmlFor={`${idPrefix}-options`}
            className="mb-1 mt-2 block text-xs font-medium text-gray-700 dark:text-gray-300"
          >
            {t("الخيارات — خيار واحد في كل سطر", "Options — one per line")}
          </label>
          <textarea
            id={`${idPrefix}-options`}
            rows={4}
            maxLength={4000}
            value={optionsText}
            disabled={disabled}
            onChange={(event) => onOptionsTextChange(event.target.value)}
            placeholder={t(
              "الخيار الأول\nالخيار الثاني\nالخيار الثالث\nالخيار الرابع",
              "First option\nSecond option\nThird option\nFourth option",
            )}
            className="admin-input"
          />
          <p className="mt-1 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
            {t(
              "يفضَّل أن تكون الإجابة الصحيحة واحدة من الخيارات؛ إن غابت تُضاف تلقائيًا.",
              "The correct answer should be one of the options; it is added automatically if missing.",
            )}
          </p>
        </>
      )}

      {type === "reorder" && (
        <p className="mt-1 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
          {t(
            "ستُعرض كلمات النص الصحيح مبعثرة، والطالب يرتّبها بنقر.",
            "The words of the correct text will be shown scrambled; students tap them in order.",
          )}
        </p>
      )}

      {type === "fill_blank" && (
        <p className="mt-1 text-[11px] leading-5 text-gray-500 dark:text-gray-400">
          {t(
            "ستُحذف كلمات مفتاحية من النص تلقائيًا ليكملها الطالب.",
            "Key words will be automatically removed from the text for students to complete.",
          )}
        </p>
      )}
    </div>
  );
}
