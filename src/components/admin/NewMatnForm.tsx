"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang-context";
import SirajDialog, { useSirajMessage } from "@/components/ui/SirajDialog";
import { createMatn } from "@/actions/matn-actions";

export default function NewMatnForm() {
  const { t } = useLang();
  const router = useRouter();
  const { dialog, notify } = useSirajMessage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await createMatn({ title, description });
      if (result.ok) {
        notify(t("تمت إضافة المتن", "Matn added"), "success");
        router.push("/admin/mutoon");
      } else {
        notify(result.error, "error");
      }
    });
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
      <form onSubmit={submit} className="space-y-3 max-w-xl">
        <div>
          <label htmlFor="matn-title" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("عنوان المتن", "Matn title")}
          </label>
          <input
            id="matn-title"
            required
            minLength={3}
            maxLength={200}
            value={title}
            disabled={isPending}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("مثال: متن الآجرومية", "e.g. Al-Ajurrumiyyah")}
            className="admin-input"
          />
        </div>
        <div>
          <label htmlFor="matn-description" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("الوصف (اختياري)", "Description (optional)")}
          </label>
          <textarea
            id="matn-description"
            rows={3}
            maxLength={2000}
            value={description}
            disabled={isPending}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("نبذة مختصرة عن المتن", "A short summary of the matn")}
            className="admin-input"
          />
        </div>
        <button type="submit" disabled={isPending} className="admin-button disabled:opacity-50">
          {isPending ? t("جارٍ الحفظ...", "Saving...") : t("حفظ المتن", "Save matn")}
        </button>
      </form>
      <SirajDialog {...dialog} />
    </div>
  );
}
