import type { Metadata } from "next";
import { Suspense } from "react";
import SearchResults from "./SearchResults";

// Dynamic per-query result pages are not standalone content: never indexed,
// never in the sitemap.
export const metadata: Metadata = {
  title: "نتائج البحث",
  description: "ابحث في دورات ومكتبة منصة سراج.",
  robots: { index: false, follow: false },
};

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}
