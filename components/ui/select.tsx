"use client";

import { cn } from "@/lib/utils";
import { type SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, className, children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-slate-600">{label}</label>}
      <select
        className={cn(
          "rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 shadow-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
