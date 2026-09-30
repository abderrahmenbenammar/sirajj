import Link from "next/link";

export const metadata = {
  title: "غير متصل | سراج",
  description: "أنت غير متصل بالإنترنت. تحقق من الاتصال وحاول مجددًا.",
};

export default function OfflinePage() {
  return (
    <main
      dir="rtl"
      className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-3xl text-white">
        <span role="img" aria-label="مصباح">
          🏮
        </span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        أنت غير متصل بالإنترنت
      </h1>
      <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-400">
        تعذّر تحميل الصفحة بسبب انقطاع الاتصال. الصفحات المحفوظة مسبقًا ستعمل
        دون إنترنت. تحقق من الاتصال وحاول مجددًا.
      </p>
      <div className="mt-8 flex items-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          العودة للرئيسية
        </Link>
        <a
          href="/offline"
          className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          إعادة المحاولة
        </a>
      </div>
    </main>
  );
}
