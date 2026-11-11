"use client";

import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import {
  Server,
  KeyRound,
  ShieldCheck,
  Save,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
  Sliders,
  HelpCircle,
  Lock,
} from "lucide-react";
import { IloConfig } from "@/types";
import { useTranslation } from "../../contexts/LanguageContext";

export default function SettingsPage() {
  const { t } = useTranslation();

  // iLO Config State
  const [config, setConfig] = useState<IloConfig>({
    host: "",
    sshPort: 22,
    httpPort: 443,
    username: "Administrator",
    password: "",
    minFanSpeed: 15,
    maxFanSpeed: 100,
    mockMode: false,
    autoRefreshInterval: 5,
  });

  const [hasPassword, setHasPassword] = useState(false);
  const [showIloPassword, setShowIloPassword] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Connection Test State
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    restOk: boolean;
    sshOk: boolean;
    restMessage: string;
    sshMessage: string;
  } | null>(null);

  // Security Credentials State
  const [adminUsername, setAdminUsername] = useState("admin");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load current config
  useEffect(() => {
    fetchConfig();
    fetchUser();
  }, []);

  const fetchConfig = async () => {
    try {
      setConfigLoading(true);
      const res = await fetch("/api/ilo/config");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        setHasPassword(data.hasPassword);
      }
    } catch (err) {
      console.error("Failed to load config:", err);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/user");
      if (res.ok) {
        const data = await res.json();
        setAdminUsername(data.username);
      }
    } catch (err) {
      console.error("Failed to load user:", err);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await fetch("/api/ilo/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("auth.setup.errorFailed"));
      }

      setSaveSuccess(t("settings.ilo.saveSuccess"));
      if (config.password) {
        setHasPassword(true);
      }
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : t("auth.setup.errorFailed"));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/ilo/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      setTestResult(data);

      // Nếu test SSH thành công và đang bật mockMode, gợi ý hoặc tự động tắt mockMode
      if (data.sshOk && config.mockMode) {
        setConfig((prev) => ({ ...prev, mockMode: false }));
      }
    } catch (err: unknown) {
      setTestResult({
        restOk: false,
        sshOk: false,
        restMessage: "Lỗi kết nối API test: " + (err instanceof Error ? err.message : String(err)),
        sshMessage: "Không thể kiểm tra SSH",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthSuccess(null);
    setAuthError(null);

    if (newPassword !== confirmPassword) {
      setAuthError(t("settings.security.errorMismatch"));
      setAuthLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          newUsername: adminUsername,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("auth.setup.errorFailed"));
      }

      setAuthSuccess(t("settings.security.success"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setAuthSuccess(null), 4000);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : t("auth.setup.errorFailed"));
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] pb-16">
      <Header isMock={config.mockMode} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <Server className="w-8 h-8 text-emerald-400" />
            <span>{t("settings.title")}</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {t("settings.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Settings: iLO Connection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-800 bg-[#0f1626]/80 backdrop-blur-xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{t("settings.ilo.cardTitle")}</h2>
                    <p className="text-xs text-gray-400">{t("settings.ilo.cardSubtitle")}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-all flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Activity className={`w-4 h-4 ${testing ? "animate-spin text-emerald-400" : ""}`} />
                  <span>{testing ? t("settings.ilo.testingButton") : t("settings.ilo.testButton")}</span>
                </button>
              </div>

              {/* Test Result Banner */}
              {testResult && (
                <div className="mb-6 space-y-2 p-4 rounded-xl bg-gray-900/90 border border-gray-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-300 mb-2">
                    <span>{t("settings.test.title")}</span>
                  </div>
                  {/* REST */}
                  <div className="flex items-center space-x-2 text-xs">
                    {testResult.restOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className={testResult.restOk ? "text-emerald-300" : "text-rose-300"}>
                      {t("settings.test.restLabel")} {testResult.restMessage}
                    </span>
                  </div>
                  {/* SSH */}
                  <div className="flex items-center space-x-2 text-xs">
                    {testResult.sshOk ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className={testResult.sshOk ? "text-emerald-300" : "text-rose-300"}>
                      {t("settings.test.sshLabel")} {testResult.sshMessage}
                    </span>
                  </div>
                </div>
              )}

              {saveSuccess && (
                <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{saveSuccess}</span>
                </div>
              )}

              {saveError && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      {t("settings.ilo.hostLabel")}
                    </label>
                    <input
                      type="text"
                      required
                      value={config.host}
                      onChange={(e) => setConfig({ ...config, host: e.target.value })}
                      placeholder="192.168.1.100"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      {t("settings.ilo.hostHint")}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      {t("settings.ilo.sshPortLabel")}
                    </label>
                    <input
                      type="number"
                      required
                      value={config.sshPort}
                      onChange={(e) => setConfig({ ...config, sshPort: Number(e.target.value) })}
                      placeholder="22"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      {t("settings.ilo.usernameLabel")}
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={config.username}
                      onChange={(e) => setConfig({ ...config, username: e.target.value })}
                      placeholder="Administrator"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>{t("settings.ilo.passwordLabel")}</span>
                      {hasPassword && !config.password && (
                        <span className="text-emerald-400 text-[10px] lowercase font-normal">
                          {t("settings.ilo.passwordSavedNote")}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type={showIloPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={config.password || ""}
                        onChange={(e) => setConfig({ ...config, password: e.target.value })}
                        placeholder={hasPassword ? t("settings.ilo.passwordKeepPlaceholder") : t("settings.ilo.passwordNewPlaceholder")}
                        className="w-full px-4 pr-10 py-2.5 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowIloPassword(!showIloPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                      >
                        {showIloPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-emerald-400" />
                    <span>{t("settings.ilo.sectionOperation")}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                        {t("settings.ilo.minFanLabel")}
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={50}
                        value={config.minFanSpeed}
                        onChange={(e) => setConfig({ ...config, minFanSpeed: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        {t("settings.ilo.minFanHint")}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                        {t("settings.ilo.autoRefreshLabel")}
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={60}
                        value={config.autoRefreshInterval}
                        onChange={(e) => setConfig({ ...config, autoRefreshInterval: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white text-sm font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        {t("settings.ilo.autoRefreshHint")}
                      </span>
                    </div>
                  </div>

                  {/* Mock Mode Switch */}
                  <div className={`mt-4 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    config.mockMode
                      ? "bg-amber-500/10 border-amber-500/30"
                      : "bg-gray-900/60 border-gray-800"
                  }`}>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-semibold text-white">{t("settings.ilo.mockModeTitle")}</h4>
                        {config.mockMode && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {t("settings.ilo.mockModeActiveBadge")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {config.mockMode
                          ? t("settings.ilo.mockModeActiveWarning")
                          : t("settings.ilo.mockModeDisabledHint")}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={config.mockMode}
                        onChange={(e) => setConfig({ ...config, mockMode: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={saveLoading}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/40 transition-all flex items-center space-x-2 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saveLoading ? t("settings.ilo.savingButton") : t("settings.ilo.saveButton")}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar: Admin Security Settings */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-800 bg-[#0f1626]/80 backdrop-blur-xl p-6 shadow-xl">
              <div className="flex items-center space-x-3 pb-4 mb-5 border-b border-gray-800">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">{t("settings.security.cardTitle")}</h2>
                  <p className="text-xs text-gray-400">{t("settings.security.cardSubtitle")}</p>
                </div>
              </div>

              {authSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  {authSuccess}
                </div>
              )}

              {authError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {authError}
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    {t("settings.security.usernameLabel")}
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    {t("settings.security.currentPasswordLabel")}
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t("settings.security.currentPasswordPlaceholder")}
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    {t("settings.security.newPasswordLabel")}
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t("settings.security.newPasswordPlaceholder")}
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    {t("settings.security.confirmPasswordLabel")}
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("settings.security.confirmPasswordPlaceholder")}
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-900/90 border border-gray-700/80 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-lg shadow-teal-900/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{authLoading ? t("settings.security.submittingButton") : t("settings.security.submitButton")}</span>
                </button>
              </form>
            </div>

            {/* Firmware & Hardware Guide Box */}
            <div className="rounded-2xl border border-gray-800 bg-[#0c1220]/70 p-5 text-xs space-y-3">
              <h3 className="font-bold text-gray-200 flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>{t("settings.firmwareNote.title")}</span>
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {t("settings.firmwareNote.description")}
              </p>
              <div className="bg-gray-900/90 p-2.5 rounded-lg border border-gray-800 font-mono text-[11px] text-emerald-300 space-y-1">
                <div>fan p &lt;bay_id&gt; max &lt;0-255&gt;</div>
                <div>fan p &lt;bay_id&gt; min 255</div>
              </div>
              <p className="text-gray-400 leading-relaxed">
                {t("settings.firmwareNote.note")}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
