import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import PageHeader from "@/components/admin/PageHeader";
import NewMatnForm from "@/components/admin/NewMatnForm";

export const dynamic = "force-dynamic";

export default async function NewMatnPage() {
  const { response } = await requireAdmin();
  if (response) redirect("/");

  return (
    <div>
      <PageHeader
        title="إضافة متن جديد"
        subtitle="أنشئ نصًا جديدًا للحفظ ثم أضف أسئلته من صفحة المتون"
        actions={
          <Link
            href="/admin/mutoon"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400"
          >
            <ArrowRight size={16} />
            رجوع إلى المتون
          </Link>
        }
      />
      <NewMatnForm />
    </div>
  );
}
