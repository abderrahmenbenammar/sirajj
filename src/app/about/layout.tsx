import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "من نحن",
  description: "تعرف على منصة سراج ورسالتها في نشر العلم الشرعي بأسلوب حديث ومنهجي.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "من نحن | سراج",
    description: "تعرف على منصة سراج ورسالتها في نشر العلم الشرعي بأسلوب حديث ومنهجي.",
    url: "/about",
    type: "website",
  },
};

export default function AboutLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
