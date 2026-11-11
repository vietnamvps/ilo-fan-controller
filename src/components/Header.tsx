"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Server, Settings, LogOut, RefreshCw, Cpu } from "lucide-react";
import { useTranslation } from "../contexts/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

interface HeaderProps {
  isMock?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  autoRefresh?: boolean;
  setAutoRefresh?: (val: boolean) => void;
  lastUpdated?: string;
}

export default function Header({
  isMock = false,
  onRefresh,
  isRefreshing = false,
  autoRefresh = true,
  setAutoRefresh,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0c1220]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* Logo & Server Badge */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/40 group-hover:scale-105 transition-transform shrink-0">
                <Server className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <span className="font-bold text-sm sm:text-base md:text-lg text-white tracking-wide whitespace-nowrap">
                    HPE <span className="text-emerald-400">DL380 Gen9</span>
                  </span>
                  <span className="hidden sm:inline-flex text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                    Fan Controller
                  </span>
                </div>
                <p className="text-xs text-gray-400 hidden sm:block whitespace-nowrap">
                  {t("header.brandSubtitle")}
                </p>
              </div>
            </Link>

            {/* Status Pill: On mobile shows as compact glowing dot pill */}
            {isMock ? (
              <div
                title={t("header.badgeMockMode")}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] sm:text-xs shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <span className="font-medium hidden md:inline whitespace-nowrap">{t("header.badgeMockMode")}</span>
              </div>
            ) : (
              <div
                title={t("header.badgeOnline")}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-medium hidden md:inline whitespace-nowrap">{t("header.badgeOnline")}</span>
              </div>
            )}
          </div>

          {/* Navigation Links & Controls */}
          <nav className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            <Link
              href="/"
              title={t("header.navFansThermal")}
              className={`flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                pathname === "/"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "text-gray-300 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <Cpu className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{t("header.navFansThermal")}</span>
            </Link>

            <Link
              href="/settings"
              title={t("header.navIloConfig")}
              className={`flex items-center space-x-1.5 p-1.5 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                pathname === "/settings"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "text-gray-300 hover:text-white hover:bg-gray-800/60"
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{t("header.navIloConfig")}</span>
            </Link>

            {/* Controls & Actions */}
            {pathname === "/" && onRefresh && (
              <div className="flex items-center pl-1 sm:pl-2 space-x-1 border-l border-gray-800 shrink-0">
                {setAutoRefresh && (
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    title={autoRefresh ? t("common.autoRefresh", { seconds: 5 }) : t("common.refresh")}
                    className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1 shrink-0 ${
                      autoRefresh
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-gray-400 hover:text-gray-200 bg-gray-800/40"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                    <span className="hidden sm:inline whitespace-nowrap">{t("common.autoRefresh", { seconds: 5 })}</span>
                  </button>
                )}

                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  title={t("common.refresh")}
                  className="p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
                </button>
              </div>
            )}

            {/* Language Switcher */}
            <LanguageSwitcher className="ml-0.5 sm:ml-2" />

            {/* Logout button */}
            <button
              onClick={handleLogout}
              title={t("header.logout")}
              className="flex items-center space-x-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 sm:px-3 sm:py-2 rounded-lg text-sm transition-colors ml-0.5 sm:ml-1 shrink-0"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">{t("header.logout")}</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
