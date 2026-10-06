import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Providers from "@/components/layout/Providers";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PushNativeBootstrap from "@/components/PushNativeBootstrap";
import "./globals.css";

const notoNaskhArabic = localFont({
  src: [
    {
      path: "../lib/certificates/fonts/NotoNaskhArabic-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../lib/certificates/fonts/NotoNaskhArabic-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-noto-naskh",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#059669",
};

export const metadata: Metadata = {
  title: {
    default: "سراج | أكاديمية التعليم الإسلامي",
    template: "%s | سراج",
  },
  description:
    "أكاديمية تعليمية إسلامية حديثة تجعل العلم الشرعي في متناول الجميع. دورات، كتب، أبحاث، ومحاضرات.",
  keywords: ["Islamic learning", "education", "courses", "Quran", "Hadith", "Fiqh", "Aqeedah"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "سراج",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      suppressHydrationWarning
      className={notoNaskhArabic.variable}
    >
      <body className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased font-[var(--font-noto-naskh),system-ui,sans-serif]">
        <ServiceWorkerRegister />
        <PwaInstallPrompt />
        <Providers>
          <PushNativeBootstrap />
          <Navbar />
          <main className="flex-1 pt-[calc(4rem_+_env(safe-area-inset-top))] lg:pt-[calc(4.5rem_+_env(safe-area-inset-top))]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
