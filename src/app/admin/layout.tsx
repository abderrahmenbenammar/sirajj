import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";

// Private area: never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// Every /admin/* route renders inside the admin shell (sidebar + topbar).
// Access stays ADMIN-only: the shell redirects anyone else away, the
// proxy middleware guards /admin/*, and each API route re-checks via
// requireAdmin().
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
