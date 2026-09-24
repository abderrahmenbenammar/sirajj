import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";

// Every /admin/* route renders inside the admin shell (sidebar + topbar).
// Access stays ADMIN-only: the shell redirects anyone else away, the
// proxy middleware guards /admin/*, and each API route re-checks via
// requireAdmin().
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
