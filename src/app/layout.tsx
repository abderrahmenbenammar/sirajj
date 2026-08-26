import type { Metadata } from "next";
import { Noto_Naskh_Arabic, Inter } from "next/font/google";
import Providers from "@/components/layout/Providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import "./globals.css";

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-noto-naskh",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "سراج | أكاديمية التعليم الإسلامي",
    template: "%s | سراج",
  },
  description:
    "أكاديمية تعليمية إسلامية حديثة تجعل العلم الشرعي في متناول الجميع. دورات، كتب، أبحاث، ومحاضرات.",
  keywords: ["Islamic learning", "education", "courses", "Quran", "Hadith", "Fiqh", "Aqeedah"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      className={`${notoNaskhArabic.variable} ${inter.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased font-[var(--font-noto-naskh),var(--font-inter),sans-serif]">
        <Providers>
          <Navbar />
          <main className="flex-1 pt-16 lg:pt-18">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
