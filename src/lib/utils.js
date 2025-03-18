import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Add polyfill for global in case it's needed
export function ensureGlobalPolyfill() {
  if (typeof window !== "undefined" && !window.global) {
    window.global = window;
  }
}
