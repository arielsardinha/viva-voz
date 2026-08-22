"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type ReaderTemplateId = "modern" | "ai-study" | "zen";
export type ReadingTheme = "light" | "sepia" | "dark";
export type ReadingFont =
  | "inter"
  | "merriweather"
  | "lora"
  | "roboto"
  | "literata"
  | "sans"
  | "serif"
  | "mono";

export interface FontOption {
  id: ReadingFont;
  name: string;
  category: string;
  description: string;
  fontClass: string;
}

export const READING_FONTS: FontOption[] = [
  {
    id: "inter",
    name: "Inter",
    category: "Sans-Serif Moderna",
    description: "Excelente nitidez e clareza para leitura em telas digitais",
    fontClass: "font-inter",
  },
  {
    id: "merriweather",
    name: "Merriweather",
    category: "Serifa Editorial",
    description: "Criada especificamente para leitura confortável de textos longos",
    fontClass: "font-merriweather",
  },
  {
    id: "lora",
    name: "Lora",
    category: "Serifa Literária",
    description: "Curvas caligráficas elegantes com estética clássica de livro",
    fontClass: "font-lora",
  },
  {
    id: "roboto",
    name: "Roboto",
    category: "Sans-Serif Neutra",
    description: "A mais popular do Google, equilibrada e com ritmo de leitura fluido",
    fontClass: "font-roboto",
  },
  {
    id: "literata",
    name: "Literata",
    category: "Serifa E-Book",
    description: "Desenvolvida para o Google Play Livros com foco em leitura contínua",
    fontClass: "font-literata",
  },
];

export function getFontFamilyClass(font: ReadingFont): string {
  switch (font) {
    case "merriweather":
    case "serif":
      return "font-merriweather font-serif";
    case "lora":
      return "font-lora font-serif";
    case "roboto":
      return "font-roboto font-sans";
    case "literata":
      return "font-literata font-serif";
    case "mono":
      return "font-mono";
    case "inter":
    case "sans":
    default:
      return "font-inter font-sans";
  }
}

export interface ReaderSettings {
  template: ReaderTemplateId;
  theme: ReadingTheme;
  font: ReadingFont;
  fontSize: number; // in px: 13 to 26
  lineHeight: number; // 1.6, 1.8, 2.0
  speed?: number;
  hasCompletedOnboarding: boolean;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  template: "modern",
  theme: "light",
  font: "inter",
  fontSize: 16,
  lineHeight: 1.8,
  speed: 1.0,
  hasCompletedOnboarding: false,
};

export const READER_SETTINGS_STORAGE = "vivavoz-reader-settings";

interface ReaderSettingsContextType {
  settings: ReaderSettings;
  isOnboardingOpen: boolean;
  isInitialized: boolean;
  openOnboarding: () => void;
  closeOnboarding: (markCompleted?: boolean) => void;
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
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
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
        if (!merged.hasCompletedOnboarding) {
          setIsOnboardingOpen(true);
        }
      } else {
        applyThemeToDocument(DEFAULT_READER_SETTINGS.theme);
        // Primeiro acesso do usuário ou sem preferências definidas
        setIsOnboardingOpen(true);
      }
    } catch {
      applyThemeToDocument(DEFAULT_READER_SETTINGS.theme);
      // Em caso de falha de leitura, abre o tutorial automaticamente
      setIsOnboardingOpen(true);
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

  const openOnboarding = useCallback(() => {
    setIsOnboardingOpen(true);
  }, []);

  const closeOnboarding = useCallback(
    (markCompleted: boolean = true) => {
      setIsOnboardingOpen(false);
      if (markCompleted) {
        patchSettings({ hasCompletedOnboarding: true });
      }
    },
    [patchSettings]
  );

  // Escuta alterações no localStorage em outras abas ou disparadas por eventos de sincronização
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

    const handleCustomSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ settings?: Partial<ReaderSettings> }>;
      if (customEvent.detail?.settings) {
        setSettings((curr) => {
          const next = { ...curr, ...customEvent.detail.settings };
          if (next.theme) {
            applyThemeToDocument(next.theme);
          }
          return next;
        });
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("vivavoz:settings-changed", handleCustomSettingsChange);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("vivavoz:settings-changed", handleCustomSettingsChange);
    };
  }, []);

  return (
    <ReaderSettingsContext.Provider
      value={{
        settings,
        isOnboardingOpen,
        isInitialized,
        openOnboarding,
        closeOnboarding,
        patchSettings,
        setTheme,
      }}
    >
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
