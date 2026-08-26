"use client";

import { useLang } from "@/lib/lang-context";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Mail, Phone, MapPin, Send, MessageCircle, HelpCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function ContactPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setForm({ ...form, subject: "", message: "" });
  };

  return (
    <div className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t("اتصل بنا", "Contact Us")}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-xl mx-auto">
            {t(
              "نسعد بتواصلكم معنا لأي استفسار أو اقتراح أو ملاحظة",
              "We look forward to hearing from you with any inquiries, suggestions, or feedback"
            )}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <Mail size={18} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t("البريد الإلكتروني", "Email")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">support@siraj.edu</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <Phone size={18} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t("الهاتف", "Phone")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">+966 50 123 4567</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                <MapPin size={18} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{t("الموقع", "Location")}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("الرياض، المملكة العربية السعودية", "Riyadh, Saudi Arabia")}</p>
            </div>

            <Link
              href="/faq"
              className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
            >
              <HelpCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("الأسئلة الشائعة", "FAQ")}</span>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{t("اطلع على إجابات الأسئلة الأكثر شيوعاً", "Check answers to the most common questions")}</p>
              </div>
              <ExternalLink size={14} className="text-emerald-400 me-auto" />
            </Link>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 sm:p-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {t("أرسل لنا رسالة", "Send Us a Message")}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("الاسم", "Name")}</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
                      placeholder={t("اسمك الكامل", "Your full name")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("البريد الإلكتروني", "Email")}</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
                      placeholder={t("بريدك الإلكتروني", "Your email address")}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("الموضوع", "Subject")}</label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors"
                    placeholder={t("موضوع الرسالة", "Message subject")}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t("الرسالة", "Message")}</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-emerald-500 transition-colors resize-none"
                    placeholder={t("اكتب رسالتك هنا...", "Write your message here...")}
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-emerald-500/20"
                >
                  <Send size={16} />
                  {sent ? t("تم الإرسال ✓", "Sent ✓") : t("إرسال الرسالة", "Send Message")}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Social */}
        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t("تابعنا", "Follow Us")}</h3>
          <div className="flex items-center justify-center gap-3">
            {["Facebook", "Instagram", "YouTube", "Twitter"].map((name) => (
              <a
                key={name}
                href={`https://${name.toLowerCase()}.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
              >
                {name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
