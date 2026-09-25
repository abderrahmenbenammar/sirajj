import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "الدورات",
  description: "تصفح دورات منصة سراج في العلوم الشرعية: دروس منهجية ومحاضرات واختبارات وشهادات إتمام.",
  alternates: { canonical: "/courses" },
  openGraph: {
    title: "الدورات | سراج",
    description: "تصفح دورات منصة سراج في العلوم الشرعية: دروس منهجية ومحاضرات واختبارات وشهادات إتمام.",
    url: "/courses",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "الدورات | سراج",
    description: "تصفح دورات منصة سراج في العلوم الشرعية: دروس منهجية ومحاضرات واختبارات وشهادات إتمام.",
  },
};

export default function CoursesLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
