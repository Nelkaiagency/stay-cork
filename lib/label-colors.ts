const LABEL_COLORS: Record<string, string> = {
  // Maintenance / renovation trade labels
  "Electrical":           "bg-amber-100 text-amber-700",
  "Plumbing":             "bg-blue-100 text-blue-700",
  "Painting":             "bg-purple-100 text-purple-700",
  "Carpentry":            "bg-orange-100 text-orange-700",
  "General Construction": "bg-slate-100 text-slate-600",
  "HVAC":                 "bg-teal-100 text-teal-700",
  "Pest Control":         "bg-green-100 text-green-700",
  // Housekeeping labels
  "Stained carpet or linen": "bg-rose-100 text-rose-700",
  "Broken furniture":        "bg-orange-100 text-orange-700",
  "Missing inventory":       "bg-amber-100 text-amber-700",
  "Damage report":           "bg-red-100 text-red-700",
  "Deep clean request":      "bg-cyan-100 text-cyan-700",
  // Catch-all (including explicit "Other" entries)
  "Other":                   "bg-gray-100 text-gray-500",
};

export function getLabelClasses(labelName: string): string {
  return LABEL_COLORS[labelName] ?? "bg-gray-100 text-gray-500";
}
