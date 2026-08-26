"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "ar" | "en";

interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
  dir: "rtl" | "ltr";
  t: (ar: string, en: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "ar",
  toggleLang: () => {},
  dir: "rtl",
  t: (ar) => ar,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("siraj-lang") as Lang | null;
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang === "ar" ? "ar" : "en";
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      localStorage.setItem("siraj-lang", lang);
    }
  }, [lang, mounted]);

  const toggleLang = () => setLang((l) => (l === "ar" ? "en" : "ar"));
  const dir = lang === "ar" ? "rtl" : "ltr";
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  if (!mounted) return <>{children}</>;

  return (
    <LangContext.Provider value={{ lang, toggleLang, dir, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
