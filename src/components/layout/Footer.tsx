"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang-context";
import { useState } from "react";

export default function Footer() {
  const { t } = useLang();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribeError("");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body && typeof body.error === "string" ? body.error : "subscribe-failed");
      }
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : "subscribe-failed");
    }
  };

  return (
    <footer className="theme-dark-surface bg-gray-950 text-gray-300">
      {/* Newsletter CTA */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">{t("اشترك في نشرتنا", "Subscribe to our newsletter")}</h3>
              <p className="text-sm text-gray-400">{t("احصل على آخر الأخبار والدورات", "Get the latest news and courses")}</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex w-full md:w-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("بريدك الإلكتروني", "Your email")}
                className="flex-1 md:w-72 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-s-xl text-sm text-white placeholder-gray-500 outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-e-xl transition-colors"
              >
                {subscribed ? t("تم ✓", "Done ✓") : t("اشتراك", "Subscribe")}
              </button>
            </form>
            {subscribeError && (
              <p className="text-xs text-red-400 mt-2">{subscribeError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                <span className="text-white font-bold text-sm" style={{ fontFamily: "'Noto Naskh Arabic', serif" }}>س</span>
              </div>
              <span className="text-lg font-bold text-white">{t("سراج", "SIRAJ")}</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              {t(
                "أكاديمية تعليمية إسلامية حديثة تجعل العلم الشرعي في متناول الجميع.",
                "A modern Islamic educational academy making religious knowledge accessible to all."
              )}
            </p>

          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">{t("روابط سريعة", "Quick Links")}</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/courses", label: t("الدورات", "Courses") },
                { href: "/library", label: t("المكتبة", "Library") },
                { href: "/about", label: t("عن سراج", "About") },
                { href: "/contact", label: t("اتصل بنا", "Contact") },
                { href: "/faq", label: t("الأسئلة الشائعة", "FAQ") },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Library */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">{t("المكتبة", "Library")}</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/library?type=books", label: t("الكتب", "Books") },
                { href: "/library?type=articles", label: t("المقالات", "Articles") },
                { href: "/library?type=research", label: t("الأبحاث", "Research") },
                { href: "/library?type=lectures", label: t("المحاضرات", "Lectures") },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">{t("قانوني", "Legal")}</h4>
            <ul className="space-y-2.5">
              {[
                { href: "/terms", label: t("الشروط والأحكام", "Terms of Service") },
                { href: "/privacy", label: t("سياسة الخصوصية", "Privacy Policy") },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-emerald-400 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} {t("سراج | أكاديمية التعليم الإسلامي", "SIRAJ | Islamic Learning Academy")}. {t("جميع الحقوق محفوظة.", "All rights reserved.")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
