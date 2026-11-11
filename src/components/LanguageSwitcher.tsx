"use client";

import React from "react";
import { useTranslation } from "../contexts/LanguageContext";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslation();

  return (
    <div
      className={`inline-flex items-center rounded-lg bg-gray-900/80 border border-gray-800 p-0.5 text-xs font-semibold backdrop-blur-md shrink-0 ${className}`}
    >
      <div className="hidden sm:flex items-center px-1.5 text-gray-400">
        <Globe className="w-3.5 h-3.5 mr-1 text-emerald-400" />
      </div>

      <button
        type="button"
        onClick={() => setLocale("vi")}
        className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs transition-all ${
          locale === "vi"
            ? "bg-emerald-500 text-gray-950 font-bold shadow-sm"
            : "text-gray-400 hover:text-white"
        }`}
        title="Tiếng Việt"
      >
        VI
      </button>

      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs transition-all ${
          locale === "en"
            ? "bg-emerald-500 text-gray-950 font-bold shadow-sm"
            : "text-gray-400 hover:text-white"
        }`}
        title="English"
      >
        EN
      </button>
    </div>
  );
}
