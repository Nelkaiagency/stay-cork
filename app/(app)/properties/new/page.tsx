import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentBusiness } from "@/lib/getCurrentBusiness";
import { NewPropertyForm } from "@/components/properties/new-property-form";

interface NewPropertyPageProps {
  searchParams: { error?: string };
}

export default async function NewPropertyPage({ searchParams }: NewPropertyPageProps) {
  const { role } = await getCurrentBusiness();
  if (role !== "admin") notFound();

  return (
    <div className="flex flex-col max-w-2xl mx-auto">
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/properties" className="text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-bold text-slate-900">New Property</h1>
        </div>
      </div>

      <div className="p-4">
        <NewPropertyForm hasError={!!searchParams.error} />
      </div>
    </div>
  );
}
