"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, CircleAlert, TriangleAlert, Info, X } from "lucide-react";
import { useLang } from "@/lib/lang-context";

export type SirajDialogType = "success" | "error" | "warning" | "info";

export type SirajDialogProps = {
  open: boolean;
  type?: SirajDialogType;
  title?: string;
  message: string;
  confirmLabel?: string;
  onClose: () => void;
};

const TYPE_META: Record<
  SirajDialogType,
  { icon: typeof CircleCheck; iconClass: string; titleAr: string; titleEn: string }
> = {
  success: {
    icon: CircleCheck,
    iconClass: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
    titleAr: "تمت العملية بنجاح",
    titleEn: "Successful",
  },
  error: {
    icon: CircleAlert,
    iconClass: "bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400",
    titleAr: "حدث خطأ",
    titleEn: "Error",
  },
  warning: {
    icon: TriangleAlert,
    iconClass: "bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    titleAr: "تنبيه",
    titleEn: "Warning",
  },
  info: {
    icon: Info,
    iconClass: "bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400",
    titleAr: "معلومة",
    titleEn: "Info",
  },
};

export default function SirajDialog({
  open,
  type = "success",
  title,
  message,
  confirmLabel,
  onClose,
}: SirajDialogProps) {
  const { t } = useLang();
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-gray-900/40 dark:bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="siraj-dialog-title"
        aria-describedby="siraj-dialog-message"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "Enter") {
            event.preventDefault();
            onClose();
          }
        }}
        className="relative w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t("إغلاق", "Close")}
          className="absolute end-3 top-3 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        >
          <X size={16} />
        </button>
        <div className="flex flex-col items-center gap-3 text-center">
          <span className={`flex h-14 w-14 items-center justify-center rounded-full ${meta.iconClass}`}>
            <Icon size={28} />
          </span>
          <div>
            <h3 id="siraj-dialog-title" className="text-lg font-bold text-gray-900 dark:text-white">
              {title ?? t(meta.titleAr, meta.titleEn)}
            </h3>
            <p id="siraj-dialog-message" className="mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {message}
            </p>
          </div>
          <button
            ref={confirmRef}
            type="button"
            onClick={onClose}
            className="admin-button mt-1 w-full"
          >
            {confirmLabel ?? t("حسنًا", "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useSirajMessage() {
  const [state, setState] = useState<{
    open: boolean;
    type: SirajDialogType;
    title?: string;
    message: string;
  }>({ open: false, type: "info", message: "" });

  const notify = useCallback(
    (message: string, type: SirajDialogType = "success", title?: string) => {
      setState({ open: true, type, message, title });
    },
    []
  );

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  const dialog: SirajDialogProps = {
    open: state.open,
    type: state.type,
    title: state.title,
    message: state.message,
    onClose: close,
  };

  return { dialog, notify };
}