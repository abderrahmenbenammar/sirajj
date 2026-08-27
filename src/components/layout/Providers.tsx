"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/lib/theme-context";
import { LangProvider } from "@/lib/lang-context";
import { AuthProvider } from "@/lib/auth-context";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>{children}</AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
