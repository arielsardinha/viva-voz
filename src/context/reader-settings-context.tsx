"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ReaderTemplateId = "modern" | "ai-study" | "zen";
export type ReadingTheme = "light" | "sepia" | "dark";
export type ReadingFont = "sans" | "serif" | "mono";

export interface ReaderSettings {
  template: ReaderTemplateId;
  theme: ReadingTheme;
  font: ReadingFont;
  fontSize: number; // in px: 13 to 26
  lineHeight: number; // 1.6, 1.8, 2.0
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  template: "modern",
  theme: "light",
  font: "sans",
  fontSize: 16,
  lineHeight: 1.8,
};

export const READER_SETTINGS_STORAGE = "vivavoz-reader-settings";

interface ReaderSettingsContextType {
  settings: ReaderSettings;
  patchSettings: (patch: Partial<ReaderSettings>) => void;
  setTheme: (theme: ReadingTheme) => void;
}

const ReaderSettingsContext = createContext<ReaderSettingsContextType | null>(null);

function applyThemeToDocument(theme: ReadingTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-reading-theme", theme);
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function ReaderSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_READER_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Carrega configurações salvas do localStorage e sincroniza no DOM
  useEffect(() => {
    try {
      const saved = localStorage.getItem(READER_SETTINGS_STORAGE);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ReaderSettings>;
        const merged: ReaderSettings = { ...DEFAULT_READER_SETTINGS, ...parsed };
        setSettings(merged);
        applyThemeToDocument(merged.theme);
      } else {
        applyThemeToDocument(DEFAULT_READER_SETTINGS.theme);
      }
    } catch {
      applyThemeToDocument(DEFAULT_READER_SETTINGS.theme);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const patchSettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((curr) => {
      const next: ReaderSettings = { ...curr, ...patch };
      try {
        localStorage.setItem(READER_SETTINGS_STORAGE, JSON.stringify(next));
      } catch {}
      if (patch.theme) {
        applyThemeToDocument(patch.theme);
      }
      return next;
    });
  }, []);

  const setTheme = useCallback(
    (theme: ReadingTheme) => {
      patchSettings({ theme });
    },
    [patchSettings]
  );

  // Escuta alterações no localStorage em outras abas
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === READER_SETTINGS_STORAGE && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue) as Partial<ReaderSettings>;
          setSettings((curr) => {
            const next = { ...curr, ...updated };
            if (next.theme) {
              applyThemeToDocument(next.theme);
            }
            return next;
          });
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <ReaderSettingsContext.Provider value={{ settings, patchSettings, setTheme }}>
      {children}
    </ReaderSettingsContext.Provider>
  );
}

export function useReaderSettings() {
  const context = useContext(ReaderSettingsContext);
  if (!context) {
    throw new Error("useReaderSettings must be used within a ReaderSettingsProvider");
  }
  return context;
}
