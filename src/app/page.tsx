"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import FanCard from "@/components/FanCard";
import ThermalGrid from "@/components/ThermalGrid";
import ActionLogs from "@/components/ActionLogs";
import {
  Server,
  Zap,
  Sliders,
  Flame,
  VolumeX,
  Volume2,
  BookmarkPlus,
  Trash2,
  Cpu,
  Thermometer,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Plus,
  Play,
} from "lucide-react";
import { ServerThermalData, FanPreset, LogEntry } from "@/types";

export default function DashboardPage() {
  const [thermalData, setThermalData] = useState<ServerThermalData | null>(null);
  const [presets, setPresets] = useState<FanPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [minFanSpeed, setMinFanSpeed] = useState(15);
  const [maxFanSpeed, setMaxFanSpeed] = useState(100);

  // Pending fan speed edits (local state before applying)
  const [pendingSpeeds, setPendingSpeeds] = useState<{ [index: number]: number }>({});
  const [masterSpeed, setMasterSpeed] = useState<number>(20);
  const [isApplying, setIsApplying] = useState(false);

  // Terminal Action Logs
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Preset Modal
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetDesc, setNewPresetDesc] = useState("");

  const addLog = useCallback((message: string, type: "info" | "success" | "warn" | "error" = "info") => {
    const entry: LogEntry = {
      id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
    };
    setLogs((prev) => [...prev.slice(-49), entry]);
  }, []);

  // Fetch thermal data from server
  const fetchThermal = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsRefreshing(true);
      const res = await fetch("/api/ilo/thermal");
      if (!res.ok) throw new Error("Không thể kết nối API Thermal");
      const data: ServerThermalData = await res.json();
      setThermalData(data);
    } catch (err: unknown) {
      console.error("Fetch thermal failed:", err);
      addLog("Lỗi lấy dữ liệu từ iLO: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addLog]);

  // Fetch presets and config
  const fetchPresetsAndConfig = useCallback(async () => {
    try {
      const [presetsRes, configRes] = await Promise.all([
        fetch("/api/ilo/presets"),
        fetch("/api/ilo/config"),
      ]);

      if (presetsRes.ok) {
        const presetsData = await presetsRes.json();
        setPresets(presetsData);
      }
      if (configRes.ok) {
        const configData = await configRes.json();
        setMinFanSpeed(configData.minFanSpeed || 15);
        setMaxFanSpeed(configData.maxFanSpeed || 100);
      }
    } catch (err) {
      console.error("Failed to load presets or config:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchThermal();
    fetchPresetsAndConfig();
    addLog("Hệ thống khởi chạy - Đang giám sát HPE ProLiant DL380 Gen9 qua iLO 4", "info");
  }, [fetchThermal, fetchPresetsAndConfig, addLog]);

  // Auto-refresh interval (5s)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchThermal(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchThermal]);

  // Handle individual fan speed slider change
  const handleFanSpeedChange = (index: number, speed: number) => {
    setPendingSpeeds((prev) => ({
      ...prev,
      [index]: speed,
    }));
  };

  // Apply speed to a single fan
  const handleApplySingleFan = async (index: number, speed: number) => {
    setIsApplying(true);
    addLog(`Đang gửi lệnh thay đổi Quạt #${index + 1} sang ${speed}%...`, "info");

    try {
      const res = await fetch("/api/ilo/fans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fans: [{ index, speed }],
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Lỗi khi áp dụng tốc độ quạt");
      }

      if (Array.isArray(result.logs)) {
        result.logs.forEach((msg: string) => addLog(msg, "info"));
      }

      addLog(`Thành công! Đã thiết lập Quạt #${index + 1} thành ${speed}%`, "success");

      // Clear pending state for this fan
      setPendingSpeeds((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });

      // Refresh thermal data
      fetchThermal();
    } catch (err: unknown) {
      addLog("Lỗi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setIsApplying(false);
    }
  };

  // Apply master speed to all fans
  const handleApplyMasterSpeed = async () => {
    setIsApplying(true);
    addLog(`Đang gửi lệnh đồng bộ tất cả 6 quạt sang ${masterSpeed}%...`, "info");

    try {
      const res = await fetch("/api/ilo/fans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          allSpeed: masterSpeed,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Lỗi khi đồng bộ quạt");
      }

      if (Array.isArray(result.logs)) {
        result.logs.forEach((msg: string) => addLog(msg, "info"));
      }

      addLog(`Thành công! Tất cả 6 quạt đã được thiết lập ở mức ${masterSpeed}%`, "success");
      setPendingSpeeds({});
      fetchThermal();
    } catch (err: unknown) {
      addLog("Lỗi: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setIsApplying(false);
    }
  };

  // Apply preset
  const handleApplyPreset = async (preset: FanPreset) => {
    setIsApplying(true);
    addLog(`Đang kích hoạt Preset: "${preset.name}"...`, "info");

    try {
      let fansPayload: { index: number; speed: number }[] = [];
      if (Array.isArray(preset.speeds) && preset.speeds.length > 0) {
        fansPayload = preset.speeds.map((spd, idx) => ({
          index: idx,
          speed: spd,
        }));
      }

      const res = await fetch("/api/ilo/fans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fans: fansPayload,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Lỗi kích hoạt preset");
      }

      if (Array.isArray(result.logs)) {
        result.logs.forEach((msg: string) => addLog(msg, "info"));
      }

      addLog(`Đã kích hoạt thành công chế độ "${preset.name}"`, "success");
      setPendingSpeeds({});
      fetchThermal();
    } catch (err: unknown) {
      addLog("Lỗi kích hoạt preset: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setIsApplying(false);
    }
  };

  // Save current speeds as a new preset
  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim() || !thermalData) return;

    const currentSpeeds = thermalData.fans.map((f, i) => pendingSpeeds[i] !== undefined ? pendingSpeeds[i] : f.speed);

    try {
      const res = await fetch("/api/ilo/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          preset: {
            name: newPresetName.trim(),
            description: newPresetDesc.trim() || `Cấu hình quạt: ${currentSpeeds.join("%, ")}%`,
            speeds: currentSpeeds,
            icon: "Sliders",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets);
        setShowPresetModal(false);
        setNewPresetName("");
        setNewPresetDesc("");
        addLog(`Đã lưu Preset mới: "${newPresetName}"`, "success");
      }
    } catch (err) {
      console.error("Failed to add preset:", err);
    }
  };

  // Delete custom preset
  const handleDeletePreset = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa Preset "${name}" không?`)) return;

    try {
      const res = await fetch("/api/ilo/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets);
        addLog(`Đã xóa Preset: "${name}"`, "info");
      }
    } catch (err) {
      console.error("Failed to delete preset:", err);
    }
  };

  // Calculate Average Speed
  const avgSpeed = thermalData?.fans
    ? Math.round(thermalData.fans.reduce((acc, f) => acc + f.speed, 0) / thermalData.fans.length)
    : 0;

  // Max CPU Temperature
  const cpuSensors = thermalData?.temperatures.filter((t) => t.name.toLowerCase().includes("cpu")) || [];
  const maxCpuTemp = cpuSensors.length > 0 ? Math.max(...cpuSensors.map((t) => t.temperature)) : 0;

  // Ambient Temperature
  const ambientSensor = thermalData?.temperatures.find(
    (t) => t.name.toLowerCase().includes("ambient") || t.name.toLowerCase().includes("inlet")
  );

  return (
    <div className="min-h-screen bg-[#080c14] pb-16">
      <Header
        isMock={thermalData?.isMock}
        onRefresh={() => fetchThermal(false)}
        isRefreshing={isRefreshing}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        lastUpdated={thermalData?.lastUpdated}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Top Summary Banner: Server Chassis Status & Quick Stats */}
        <div className="rounded-2xl border border-gray-800 bg-[#0f1626]/90 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                  {thermalData?.serverModel || "HPE ProLiant DL380 Gen9"}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                  2U Rack Server
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Firmware: <span className="text-gray-300 font-mono">{thermalData?.iloFirmware || "iLO 4 v2.77"}</span> • Hệ thống làm mát:{" "}
                <span className="text-emerald-400 font-semibold">6 Quạt tản nhiệt kép (Hot-plug Redundant)</span>
              </p>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800">
                <span className="text-[11px] text-gray-400 block mb-1">Tốc độ Quạt TB</span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xl font-bold font-mono text-emerald-400">{avgSpeed}%</span>
                  <span className="text-[10px] text-gray-400">PWM</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800">
                <span className="text-[11px] text-gray-400 block mb-1">Nhiệt độ CPU Max</span>
                <div className="flex items-baseline space-x-1.5">
                  <span className={`text-xl font-bold font-mono ${maxCpuTemp > 70 ? "text-rose-400" : "text-emerald-400"}`}>
                    {maxCpuTemp > 0 ? `${maxCpuTemp}°C` : "N/A"}
                  </span>
                  <span className="text-[10px] text-gray-400">Xeon E5</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800">
                <span className="text-[11px] text-gray-400 block mb-1">Nhiệt độ Phòng máy</span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xl font-bold font-mono text-cyan-400">
                    {ambientSensor ? `${ambientSensor.temperature}°C` : "24°C"}
                  </span>
                  <span className="text-[10px] text-gray-400">Ambient</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800">
                <span className="text-[11px] text-gray-400 block mb-1">Cụm Quạt Chassis</span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xl font-bold font-mono text-white">6 / 6</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Master Controller & Presets Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Master Fan Sync Slider */}
          <div className="rounded-2xl border border-gray-800 bg-[#0f1626]/80 p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">Đồng bộ Cả 6 Quạt (Master)</h2>
                    <p className="text-xs text-gray-400">Điều chỉnh tất cả quạt DL380 G9 cùng lúc</p>
                  </div>
                </div>
                <span className="text-lg font-mono font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30">
                  {masterSpeed}%
                </span>
              </div>

              <div className="space-y-4 my-4">
                <input
                  type="range"
                  min={minFanSpeed}
                  max={maxFanSpeed}
                  value={masterSpeed}
                  onChange={(e) => setMasterSpeed(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs font-mono text-gray-400">
                  <span>An toàn: {minFanSpeed}%</span>
                  <span>Cân bằng: 35%</span>
                  <span>Max: {maxFanSpeed}%</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleApplyMasterSpeed}
              disabled={isApplying}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isApplying ? "Đang gửi SSH tới iLO..." : "Áp dụng cho Cả 6 Quạt"}</span>
            </button>
          </div>

          {/* Quick Presets Grid */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-800 bg-[#0f1626]/80 p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-base">Chế độ Cài đặt sẵn (Fan Presets)</h2>
                    <p className="text-xs text-gray-400">Chuyển đổi profile âm lượng và làm mát chỉ với 1 cú nhấp chuột</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPresetModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-emerald-400 border border-emerald-500/30 flex items-center space-x-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Lưu Preset mới</span>
                </button>
              </div>

              {/* Preset Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {presets.map((preset) => {
                  const targetSpeed = Array.isArray(preset.speeds) ? preset.speeds[0] : 20;

                  return (
                    <div
                      key={preset.id}
                      className="p-3.5 rounded-xl bg-gray-900/70 border border-gray-800 hover:border-emerald-500/40 transition-all group relative flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                            {preset.name}
                          </h3>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {targetSpeed}%
                          </span>
                        </div>
                        {preset.description && (
                          <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                            {preset.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800/80">
                        <button
                          onClick={() => handleApplyPreset(preset)}
                          disabled={isApplying}
                          className="px-3 py-1 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium transition-all flex items-center space-x-1 disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Kích hoạt</span>
                        </button>

                        {/* Allow deleting custom presets (not default ones) */}
                        {!["silent", "balanced", "performance", "turbine"].includes(preset.id) && (
                          <button
                            onClick={() => handleDeletePreset(preset.id, preset.name)}
                            title="Xóa preset này"
                            className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-gray-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <p className="text-[11px] text-gray-400 italic">
              * Mẹo: Các quạt sẽ được gửi lệnh SSH tuần tự để tránh sốc dòng điện khởi động của hệ thống nguồn 500W/800W.
            </p>
          </div>
        </div>

        {/* 6 Fan Bays of HP ProLiant DL380 G9 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
                <Server className="w-5 h-5 text-emerald-400" />
                <span>Sơ đồ 6 Module Quạt Chassis (DL380 Gen9 Fan Bays)</span>
              </h2>
              <p className="text-xs text-gray-400">
                Thứ tự bố trí từ Fan 1 (trái) đến Fan 6 (phải) phía trước mainboard máy chủ
              </p>
            </div>
            {Object.keys(pendingSpeeds).length > 0 && (
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                Có {Object.keys(pendingSpeeds).length} quạt đang chờ áp dụng
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {thermalData?.fans && thermalData.fans.length > 0 ? (
              thermalData.fans.map((fan) => (
                <FanCard
                  key={fan.index}
                  fan={fan}
                  minSpeed={minFanSpeed}
                  maxSpeed={maxFanSpeed}
                  pendingSpeed={pendingSpeeds[fan.index]}
                  onSpeedChange={(speed) => handleFanSpeedChange(fan.index, speed)}
                  onApplySpeed={(speed) => handleApplySingleFan(fan.index, speed)}
                  isLoading={isApplying}
                />
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-400 italic">
                Đang nạp thông tin quạt từ iLO...
              </div>
            )}
          </div>
        </div>

        {/* Real-time Hardware Thermal Sensors */}
        <ThermalGrid temperatures={thermalData?.temperatures || []} />

        {/* Real-time SSH Action Terminal Log */}
        <ActionLogs logs={logs} onClearLogs={() => setLogs([])} />
      </main>

      {/* Modal: Save New Preset */}
      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#0f172a] p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2">
              <BookmarkPlus className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Lưu cấu hình hiện tại thành Preset</h3>
            </div>

            <p className="text-xs text-gray-400">
              Tạo chế độ tùy chỉnh với tốc độ của 6 quạt hiện tại để dễ dàng kích hoạt lại sau này.
            </p>

            <form onSubmit={handleSavePreset} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Tên Preset
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chế độ Xem Phim Ban Đêm"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Mô tả ghi chú (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Tốc độ quạt êm ái khi không chạy tải nặng..."
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPresetModal(false)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-900/40"
                >
                  Lưu Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
