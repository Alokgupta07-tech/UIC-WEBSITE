import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings, DEFAULT_SETTINGS } from "@/services/settings";
import type { SiteSettings } from "@/types";

interface SettingsContextValue {
  settings: SiteSettings;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

/**
 * Loads the site-wide settings (community member count + social links) once
 * and exposes them to every consumer (Navbar, Footer, Hero, Seo, Contact).
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  return (
    <SettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    // Allow usage outside the provider by returning defaults — useful during
    // early render before the provider mounts (e.g. in tests).
    return { settings: DEFAULT_SETTINGS, isLoading: true };
  }
  return ctx;
}
