import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description: "إجابات عن الأسئلة الشائعة حول منصة سراج: الدورات والاختبارات والشهادات والمكتبة.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "الأسئلة الشائعة | سراج",
    description: "إجابات عن الأسئلة الشائعة حول منصة سراج: الدورات والاختبارات والشهادات والمكتبة.",
    url: "/faq",
    type: "website",
  },
};

export default function FaqLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
