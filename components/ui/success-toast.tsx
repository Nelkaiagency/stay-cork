"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessToastProps {
  message: string | null;
  onDismiss: () => void;
}

export function SuccessToast({ message, onDismiss }: SuccessToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3",
      "bg-emerald-600 text-white rounded-xl px-4 py-3 shadow-lg max-w-sm w-full text-sm"
    )}>
      <CheckCircle2 className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 hover:opacity-75">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
