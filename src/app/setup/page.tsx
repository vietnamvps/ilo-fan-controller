"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Server,
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
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
            router.replace("/login");
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
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (username.trim().length < 3) {
      setError("Tên tài khoản quản trị phải có ít nhất 3 ký tự.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu quản trị phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
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
        throw new Error(data.error || "Khởi tạo thất bại.");
      }

      // Success -> Redirect to dashboard
      window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra trong quá trình thiết lập.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="flex items-center space-x-3 text-emerald-400">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Đang kiểm tra trạng thái hệ thống...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen server-grid-bg bg-[#080c14] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-950/60 mb-4 border border-emerald-400/30">
            <Server className="w-8 h-8 text-white" />
          </div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Khởi tạo hệ thống lần đầu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            HP ProLiant <span className="text-emerald-400">DL380 Gen9</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Thiết lập tài khoản quản trị và lưu trữ cơ sở dữ liệu SQLite
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
                  <h2 className="text-base font-semibold text-white">1. Tạo tài khoản Quản trị viên (Admin)</h2>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">Bắt buộc</span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                  Tên tài khoản
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="VD: admin"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
                    Mật khẩu quản trị
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ít nhất 6 ký tự"
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
                    Xác nhận mật khẩu
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
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
                  <h2 className="text-base font-semibold text-white">2. Kết nối iLO 4 Máy chủ (Tùy chọn)</h2>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">Có thể điền sau</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Địa chỉ IP / Host iLO
                  </label>
                  <input
                    type="text"
                    value={iloHost}
                    onChange={(e) => setIloHost(e.target.value)}
                    placeholder="VD: 192.168.1.100"
                    className="w-full px-3.5 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Cổng SSH
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
                    Tài khoản iLO
                  </label>
                  <input
                    type="text"
                    value={iloUsername}
                    onChange={(e) => setIloUsername(e.target.value)}
                    placeholder="Administrator"
                    className="w-full px-3.5 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Mật khẩu iLO
                  </label>
                  <input
                    type="password"
                    value={iloPassword}
                    onChange={(e) => setIloPassword(e.target.value)}
                    placeholder="Mật khẩu card iLO"
                    className="w-full px-3.5 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-300">
                    Tốc độ quạt tối thiểu an toàn: <span className="text-emerald-400 font-bold">{minFanSpeed}%</span>
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
                Dữ liệu tài khoản, cấu hình iLO và profile quạt sẽ được lưu trữ an toàn trong tệp SQLite <code className="text-emerald-400 font-mono">/app/data/app.db</code>.
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
                  <span>Đang lưu và khởi tạo hệ thống...</span>
                </>
              ) : (
                <>
                  <span>🚀 Hoàn tất cài đặt & Vào Dashboard</span>
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
