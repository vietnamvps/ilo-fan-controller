"use client";

import React from "react";
import { Thermometer, Cpu, HardDrive, Zap, Server } from "lucide-react";
import { TempSensor } from "@/types";

interface ThermalGridProps {
  temperatures: TempSensor[];
}

export default function ThermalGrid({ temperatures }: ThermalGridProps) {
  if (!temperatures || temperatures.length === 0) {
    return null;
  }

  // Get icon for sensor type
  const getSensorIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("cpu")) return <Cpu className="w-4 h-4 text-emerald-400" />;
    if (lower.includes("ambient") || lower.includes("inlet")) return <Thermometer className="w-4 h-4 text-cyan-400" />;
    if (lower.includes("memory") || lower.includes("dimm")) return <Server className="w-4 h-4 text-purple-400" />;
    if (lower.includes("power") || lower.includes("supply")) return <Zap className="w-4 h-4 text-amber-400" />;
    return <HardDrive className="w-4 h-4 text-blue-400" />;
  };

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#0e1526]/80 backdrop-blur-md p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Cảm biến Nhiệt độ HP DL380 G9</h3>
            <p className="text-xs text-gray-400">Dữ liệu thời gian thực từ iLO 4 Redfish Thermal API</p>
          </div>
        </div>
        <span className="text-xs font-mono text-gray-400 bg-gray-800/80 px-2.5 py-1 rounded-full border border-gray-700">
          {temperatures.length} Cảm biến đang hoạt động
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {temperatures.map((sensor, idx) => {
          const temp = sensor.temperature;
          const crit = sensor.criticalThreshold || 85;
          const percentage = Math.min(100, Math.round((temp / crit) * 100));

          let barColor = "bg-emerald-500";
          let textColor = "text-emerald-400";
          let badgeBorder = "border-emerald-500/30 bg-emerald-500/10";

          if (temp >= 75) {
            barColor = "bg-rose-500";
            textColor = "text-rose-400";
            badgeBorder = "border-rose-500/30 bg-rose-500/10";
          } else if (temp >= 55) {
            barColor = "bg-amber-500";
            textColor = "text-amber-400";
            badgeBorder = "border-amber-500/30 bg-amber-500/10";
          } else if (temp >= 40) {
            barColor = "bg-cyan-500";
            textColor = "text-cyan-400";
            badgeBorder = "border-cyan-500/30 bg-cyan-500/10";
          }

          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-gray-900/70 border border-gray-800/90 hover:border-gray-700 transition-all flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-md bg-gray-800 border border-gray-700">
                    {getSensorIcon(sensor.name)}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-200 line-clamp-1" title={sensor.name}>
                      {sensor.name}
                    </h4>
                    <span className="text-[10px] text-gray-400">Ngưỡng: &lt;{crit}°C</span>
                  </div>
                </div>

                <div className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${badgeBorder} ${textColor}`}>
                  {temp}°C
                </div>
              </div>

              {/* Temperature Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
