import viDict from "../locales/vi.json";
import enDict from "../locales/en.json";

export type Locale = "vi" | "en";

export const DEFAULT_LOCALE: Locale = "vi";
export const SUPPORTED_LOCALES: Locale[] = ["vi", "en"];
export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

export const dictionaries: Record<Locale, typeof viDict> = {
  vi: viDict,
  en: enDict,
};

export type TranslationParams = Record<string, string | number>;

/**
 * Hàm tra cứu chuỗi đa ngôn ngữ hỗ trợ dot-notation ('common.save')
 * và thay thế tham số động {param}.
 * Tự động fallback về tiếng Việt nếu thiếu key ở tiếng Anh.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: TranslationParams
): string {
  const primaryDict = dictionaries[locale] || dictionaries[DEFAULT_LOCALE];
  const fallbackDict = dictionaries[DEFAULT_LOCALE];

  const value = getNestedValue(primaryDict, key) ?? getNestedValue(fallbackDict, key);

  if (typeof value !== "string") {
    return key;
  }

  if (!params) {
    return value;
  }

  // Thay thế {param}
  return value.replace(/\{(\w+)\}/g, (_, match) => {
    return params[match] !== undefined ? String(params[match]) : `{${match}}`;
  });
}

function getNestedValue(obj: unknown, path: string): string | null {
  if (!obj || typeof obj !== "object") return null;

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }

  return typeof current === "string" ? current : null;
}

/**
 * Lấy hàm dịch dành riêng cho Server Components
 */
export function getServerTranslation(locale: Locale) {
  return {
    t: (key: string, params?: TranslationParams) => translate(locale, key, params),
    locale,
  };
}
