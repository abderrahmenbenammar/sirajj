"use client";

import { useEffect } from "react";
import Link from "next/link";

// Route-level error boundary: calm, non-technical, mobile-friendly.
// Technical details stay in the server console — never shown to users.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="py-20 sm:py-28">
      <div className="max-w-md mx-auto px-4 sm:px-6 text-center">
        <p className="text-5xl mb-4" aria-hidden="true">
          🔧
        </p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">حدث خطأ غير متوقع</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          نعتذر منك. حدث خلل أثناء تحميل هذه الصفحة — يمكنك المحاولة مجددًا أو العودة للرئيسية.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors duration-150"
          >
            إعادة المحاولة
          </button>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
          >
            العودة للرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
