"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  Database,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "../../contexts/LanguageContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";

export default function SetupPage() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(true);

  // Form states
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Optional iLO Config
  const [iloHost, setIloHost] = useState("");
  const [iloPort, setIloPort] = useState(22);
  const [iloUsername, setIloUsername] = useState("Administrator");
  const [iloPassword, setIloPassword] = useState("");
  const [minFanSpeed, setMinFanSpeed] = useState(15);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if system already has an admin
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/auth/status");
        if (res.ok) {
          const data = await res.json();
          if (!data.needsSetup) {
            window.location.href = "/login";
            return;
          }
        }
      } catch (err) {
        console.error("Status check error:", err);
      } finally {
        setChecking(false);
      }
    }
    checkStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (username.trim().length < 3) {
      setError(t("auth.setup.errorUsernameLength"));
      return;
    }

    if (password.length < 6) {
      setError(t("auth.setup.errorPasswordLength"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.setup.errorPasswordMismatch"));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          confirmPassword,
          iloHost,
          iloPort,
          iloUsername,
          iloPassword,
          minFanSpeed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("auth.setup.errorFailed"));
      }

      // Success -> Redirect to dashboard
      window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.setup.errorFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="flex items-center space-x-3 text-emerald-400">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">{t("auth.setup.checkingStatus")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen server-grid-bg bg-[#080c14] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative">
      {/* Language Switcher in top right corner */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-950/60 mb-4 border border-emerald-400/30">
            <Server className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("auth.setup.brandBadge")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t("auth.setup.title")}{" "}
            <span className="text-emerald-400">{t("auth.setup.model")}</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {t("auth.setup.description")}
          </p>
        </div>

        {/* Setup Card */}
        <div className="bg-[#0f1626]/90 border border-gray-800 rounded-2xl shadow-2xl backdrop-blur-xl p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-300 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phần 1: Tài khoản Admin */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-base font-semibold text-white">{t("auth.setup.step1Title")}</h2>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                  {t("auth.setup.stepRequired")}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  {t("auth.setup.usernameLabel")}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("auth.setup.usernamePlaceholder")}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    {t("auth.setup.passwordLabel")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    {t("auth.setup.confirmPasswordLabel")}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Phần 2: Cấu hình iLO máy chủ (Tùy chọn) */}
            <div className="space-y-4 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-teal-400" />
                  <h2 className="text-base font-semibold text-white">{t("auth.setup.step2Title")}</h2>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                  {t("auth.setup.stepOptional")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    {t("auth.setup.iloHostLabel")}
                  </label>
                  <input
                    type="text"
                    value={iloHost}
                    onChange={(e) => setIloHost(e.target.value)}
                    placeholder={t("auth.setup.iloHostPlaceholder")}
                    className="w-full px-3.5 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    {t("auth.setup.sshPortLabel")}
                  </label>
                  <input
                    type="number"
                    value={iloPort}
                    onChange={(e) => setIloPort(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    {t("auth.setup.iloUsernameLabel")}
                  </label>
                  <input
                    type="text"
                    autoComplete="username"
                    value={iloUsername}
                    onChange={(e) => setIloUsername(e.target.value)}
                    placeholder={t("auth.setup.iloUsernamePlaceholder")}
                    className="w-full px-3.5 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    {t("auth.setup.iloPasswordLabel")}
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={iloPassword}
                    onChange={(e) => setIloPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-300">
                    {t("auth.setup.minFanSpeedLabel", { speed: minFanSpeed })}
                  </label>
                </div>
                <input
                  type="range"
                  min="10"
                  max="40"
                  value={minFanSpeed}
                  onChange={(e) => setMinFanSpeed(Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* SQLite Info Box */}
            <div className="p-3.5 rounded-xl bg-gray-900/70 border border-gray-800 flex items-center space-x-3 text-xs text-gray-400">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {t("auth.setup.databaseNotice")}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-black bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>{t("auth.setup.submitting")}</span>
                </>
              ) : (
                <>
                  <span>🚀 {t("auth.setup.submitButton")}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
