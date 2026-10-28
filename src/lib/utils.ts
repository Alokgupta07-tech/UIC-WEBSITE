import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Resolve the public origin without ever leaking a local development URL into production links. */
export function getSiteUrl(): string {
  const configured = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/$/, "");
  const isLocalHost = (host: string) => host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  if (typeof window === "undefined") return configured || "";
  let configuredIsLocal = false;
  try { configuredIsLocal = Boolean(configured && isLocalHost(new URL(configured).hostname)); } catch { /* ignore invalid build-time URL */ }
  if (!configured || (configuredIsLocal && !isLocalHost(window.location.hostname))) {
    return window.location.origin;
  }
  return configured;
}
