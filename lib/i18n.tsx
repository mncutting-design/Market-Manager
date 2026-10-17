"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import enMessages from "@/messages/en.json";
import bnMessages from "@/messages/bn.json";
import { Locale, toBanglaDigits } from "@/lib/format";

type Messages = typeof enMessages;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const dictionaries: Record<Locale, any> = {
  en: enMessages,
  bn: bnMessages,
};

function getNestedValue(obj: any, path: string): string | undefined {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({
  children,
  initialLocale = "bn",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    // Check saved cookie or localStorage
    const savedLocale = localStorage.getItem("market_manager_locale") as Locale;
    if (savedLocale === "en" || savedLocale === "bn") {
      setLocaleState(savedLocale);
    } else {
      // Check browser language
      const browserLang = navigator.language || (navigator as any).userLanguage || "";
      if (browserLang.toLowerCase().startsWith("bn")) {
        setLocaleState("bn");
      }
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem("market_manager_locale", newLocale);
      document.cookie = `market_manager_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      document.documentElement.lang = newLocale;
      if (newLocale === "bn") {
        document.documentElement.classList.add("lang-bn");
      } else {
        document.documentElement.classList.remove("lang-bn");
      }
    } catch (e) {
      // ignore in environments without localStorage
    }
  };

  const toggleLocale = () => {
    setLocale(locale === "bn" ? "en" : "bn");
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    if (locale === "bn") {
      document.documentElement.classList.add("lang-bn");
    } else {
      document.documentElement.classList.remove("lang-bn");
    }
  }, [locale]);

  const t = useMemo(() => {
    return (key: string, params?: Record<string, any>): string => {
      const dict = dictionaries[locale] || dictionaries.en;
      let template = getNestedValue(dict, key);

      // Fallback to English if missing in target
      if (!template && locale !== "en") {
        template = getNestedValue(dictionaries.en, key);
      }

      if (!template) {
        return key;
      }

      if (!params) return template;

      return template.replace(/\{(\w+)\}/g, (_, placeholder) => {
        if (params[placeholder] !== undefined && params[placeholder] !== null) {
          const val = params[placeholder];
          if (typeof val === "number" && locale === "bn") {
            return toBanglaDigits(val);
          }
          return String(val);
        }
        return `{${placeholder}}`;
      });
    };
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
