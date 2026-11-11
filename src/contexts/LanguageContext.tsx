"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  Locale,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  translate,
  TranslationParams,
} from "../lib/i18n";

interface LanguageContextType {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  t: (key: string, params?: TranslationParams) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  initialLocale?: Locale;
  children: React.ReactNode;
}

export function LanguageProvider({ initialLocale = DEFAULT_LOCALE, children }: LanguageProviderProps) {
  // KHÔNG đọc localStorage trong lần render đầu để tránh lỗi hydration mismatch!
  // initialLocale được truyền từ server qua cookie trong layout.tsx
  const [locale, setLocaleState] = useState<Locale>(() => {
    return SUPPORTED_LOCALES.includes(initialLocale) ? initialLocale : DEFAULT_LOCALE;
  });

  const setLocale = useCallback((newLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;

    setLocaleState(newLocale);

    // 1. Lưu vào Cookie làm nguồn chính (thời hạn 1 năm)
    document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // 2. Đồng bộ phụ vào localStorage
    try {
      localStorage.setItem(LOCALE_COOKIE_NAME, newLocale);
    } catch {
      // Ignore in private browsing
    }

    // 3. Cập nhật thuộc tính <html lang>
    if (typeof document !== "undefined") {
      document.documentElement.lang = newLocale;
    }
  }, []);

  // Hàm dịch gắn liền với locale hiện tại
  const t = useCallback(
    (key: string, params?: TranslationParams) => {
      return translate(locale, key, params);
    },
    [locale]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation phải được sử dụng bên trong <LanguageProvider>");
  }
  return context;
}
