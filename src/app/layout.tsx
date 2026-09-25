import type { Metadata, Viewport } from "next";
import { Noto_Naskh_Arabic, Inter } from "next/font/google";
import Providers from "@/components/layout/Providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ServiceWorkerRegister from "@/components/pwa/ServiceWorkerRegister";
import { siteUrl } from "@/lib/seo";
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

const SITE_NAME = "سراج";
const SITE_DESCRIPTION =
  "أكاديمية تعليمية إسلامية حديثة تجعل العلم الشرعي في متناول الجميع. دورات، كتب، أبحاث، ومحاضرات.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "سراج | أكاديمية التعليم الإسلامي",
    template: "%s | سراج",
  },
  description: SITE_DESCRIPTION,
  keywords: ["Islamic learning", "education", "courses", "Quran", "Hadith", "Fiqh", "Aqeedah"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ar",
    title: "سراج | أكاديمية التعليم الإسلامي",
    description: SITE_DESCRIPTION,
    images: [{ url: "/siraj-logo.png", alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#074142",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html
      suppressHydrationWarning
      className={`${notoNaskhArabic.variable} ${inter.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased font-[var(--font-noto-naskh),var(--font-inter),sans-serif]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:start-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-emerald-700 focus:text-white focus:text-sm focus:font-semibold"
        >
          تخطَّ إلى المحتوى
        </a>
        <Providers>
          <Navbar />
          <main id="main-content" className="flex-1 pt-16 lg:pt-18">{children}</main>
          <Footer />
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
