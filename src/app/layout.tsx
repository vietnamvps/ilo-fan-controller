import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "../contexts/LanguageContext";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  SUPPORTED_LOCALES,
  Locale,
  getServerTranslation,
} from "../lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value as Locale;
  const locale: Locale = SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const { t } = getServerTranslation(locale);

  return {
    title: t("meta.title"),
    description: t("meta.description"),
    icons: {
      icon: "/favicon.ico",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value as Locale;
  const locale: Locale = SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : DEFAULT_LOCALE;

  return (
    <html lang={locale} className="dark">
      <body className="antialiased min-h-screen bg-[#080c14] text-gray-100 flex flex-col">
        <LanguageProvider initialLocale={locale}>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <footer className="w-full text-center text-xs text-slate-500 py-4">
            iLO 4 Advanced Thermal Management by TuNguyen
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
