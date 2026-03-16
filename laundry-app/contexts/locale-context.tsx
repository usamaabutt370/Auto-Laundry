import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { LocaleCode } from "@/locales";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/locales";

const LOCALE_STORAGE_KEY = "@laundry_app_locale";

interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (code: LocaleCode) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(DEFAULT_LOCALE);

  useEffect(() => {
    AsyncStorage.getItem(LOCALE_STORAGE_KEY).then((stored) => {
      if (stored && SUPPORTED_LOCALES.includes(stored as LocaleCode)) {
        setLocaleState(stored as LocaleCode);
      }
    });
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
    AsyncStorage.setItem(LOCALE_STORAGE_KEY, code);
  }, []);

  const value = useMemo(
    () => ({ locale, setLocale }),
    [locale, setLocale]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

/** Display label for each locale (e.g. for dropdown). Urdu in Urdu script. */
export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: "English",
  ur: "اردو",
};
