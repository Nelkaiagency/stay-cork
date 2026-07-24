import type { CSSProperties } from "react";
import { type Business } from "@/lib/types/database";

export interface BrandConfig {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
}

const DEFAULTS: BrandConfig = {
  name: "Property Tracker",
  logoUrl: null,
  primaryColor: "#0f172a",
  secondaryColor: "#3b82f6",
};

export function buildBrandConfig(business: Business | null): BrandConfig {
  if (!business) return DEFAULTS;
  return {
    name: business.name ?? DEFAULTS.name,
    logoUrl: business.logo_url,
    primaryColor: business.primary_color ?? DEFAULTS.primaryColor,
    secondaryColor: business.secondary_color ?? DEFAULTS.secondaryColor,
  };
}

// Injects CSS custom properties so Tailwind arbitrary values can reference them
export function brandCssVars(config: BrandConfig): CSSProperties {
  return {
    "--brand-primary": config.primaryColor,
    "--brand-secondary": config.secondaryColor,
  } as CSSProperties;
}
