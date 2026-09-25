import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "المكتبة",
  description: "المكتبة الرقمية لمنصة سراج: كتب ومقالات وأبحاث ومحاضرات في العلوم الشرعية.",
  alternates: { canonical: "/library" },
  openGraph: {
    title: "المكتبة | سراج",
    description: "المكتبة الرقمية لمنصة سراج: كتب ومقالات وأبحاث ومحاضرات في العلوم الشرعية.",
    url: "/library",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "المكتبة | سراج",
    description: "المكتبة الرقمية لمنصة سراج: كتب ومقالات وأبحاث ومحاضرات في العلوم الشرعية.",
  },
};

export default function LibraryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
