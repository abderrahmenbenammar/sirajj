import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "المسارات التعليمية",
  description: "المسارات التعليمية في منصة سراج: المبتدئ والمتوسط والمتقدم لبناء علم شرعي منهجي.",
  alternates: { canonical: "/paths" },
  openGraph: {
    title: "المسارات التعليمية | سراج",
    description: "المسارات التعليمية في منصة سراج: المبتدئ والمتوسط والمتقدم لبناء علم شرعي منهجي.",
    url: "/paths",
    type: "website",
  },
};

export default function PathsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
