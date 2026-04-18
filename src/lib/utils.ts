import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if an email belongs to internal LightPxl organization
 */
export function isInternalEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith('@lightpxl.com');
}
