import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "تواصل مع فريق منصة سراج للاستفسارات والاقتراحات.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "تواصل معنا | سراج",
    description: "تواصل مع فريق منصة سراج للاستفسارات والاقتراحات.",
    url: "/contact",
    type: "website",
  },
};

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
