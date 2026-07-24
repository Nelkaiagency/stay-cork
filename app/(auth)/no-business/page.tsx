import Link from "next/link";
import { Building2 } from "lucide-react";

export default function NoBusinessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center flex flex-col items-center gap-6">
        <div className="h-14 w-14 rounded-2xl bg-amber-100 flex items-center justify-center">
          <Building2 className="h-7 w-7 text-amber-600" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-bold text-slate-900">No workspace linked</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Your account isn&apos;t connected to a business workspace yet. Contact your
            administrator to be added to a workspace.
          </p>
        </div>

        <Link
          href="/login"
          className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
