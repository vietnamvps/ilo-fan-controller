"use client";

import React from "react";
import { FanStatus } from "@/types";
import { useTranslation } from "../contexts/LanguageContext";

interface FanCardProps {
  fan: FanStatus;
  minSpeed: number;
  maxSpeed: number;
  onSpeedChange: (speed: number) => void;
  onApplySpeed: (speed: number) => void;
  pendingSpeed?: number;
  isLoading?: boolean;
}

export default function FanCard({
  fan,
  minSpeed,
  maxSpeed,
  onSpeedChange,
  onApplySpeed,
  pendingSpeed,
  isLoading = false,
}: FanCardProps) {
  const { t } = useTranslation();
  const currentSpeed = pendingSpeed !== undefined ? pendingSpeed : fan.speed;

  // Calculate fan animation speed (100% => 0.2s, 15% => 1.8s)
  const spinDuration = Math.max(0.15, 2.5 - (currentSpeed / 100) * 2.3);

  // Speed level styling
  let badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  let speedText = t("dashboard.fans.fanCard.levels.silent");
  let bladeColor = "#10b981"; // Emerald
  if (currentSpeed > 75) {
    badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/30";
    speedText = t("dashboard.fans.fanCard.levels.turbine");
    bladeColor = "#f43f5e";
  } else if (currentSpeed > 45) {
    badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    speedText = t("dashboard.fans.fanCard.levels.high");
    bladeColor = "#f59e0b";
  } else if (currentSpeed > 25) {
    badgeColor = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    speedText = t("dashboard.fans.fanCard.levels.balanced");
    bladeColor = "#06b6d4";
  }

  return (
    <div className="relative rounded-2xl p-5 border border-gray-800 bg-gradient-to-b from-[#131c31] to-[#0d1424] shadow-xl hover:border-gray-700 transition-all flex flex-col justify-between">
      {/* Top Bar: Fan index, Name & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gray-800/80 border border-gray-700 flex items-center justify-center font-mono text-xs font-bold text-gray-300">
            #{fan.index + 1}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm tracking-wide">{fan.name}</h3>
            <span className="text-[11px] text-gray-400">
              {t("dashboard.fans.fanCard.bayLabel", { index: fan.index + 1 })}
            </span>
          </div>
        </div>

        <div className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${badgeColor}`}>
          <span>{speedText}</span>
          <span>•</span>
          <span className="font-bold">{fan.speed}%</span>
        </div>
      </div>

      {/* Center Fan Graphic & Live Rotation */}
      <div className="my-5 flex flex-col items-center justify-center">
        <div className="relative w-32 h-32 flex items-center justify-center">
          {/* Fan Housing Outer Ring */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-800/90 shadow-inner" />
          <div className="absolute inset-2 rounded-full border border-gray-700/50 bg-[#090d16]" />

          {/* Rotating Blades SVG */}
          <svg
            className="w-24 h-24 fan-spinning z-10"
            style={{
              "--spin-duration": `${spinDuration}s`,
            } as React.CSSProperties}
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle cx="50" cy="50" r="14" fill="#1f2937" stroke="#374151" strokeWidth="2" />
            {/* Blade 1 */}
            <path
              d="M50 36 C45 20, 30 10, 50 2 C65 10, 55 25, 50 36 Z"
              fill={bladeColor}
              fillOpacity="0.8"
            />
            {/* Blade 2 */}
            <path
              d="M50 36 C45 20, 30 10, 50 2 C65 10, 55 25, 50 36 Z"
              fill={bladeColor}
              fillOpacity="0.8"
              transform="rotate(60 50 50)"
            />
            {/* Blade 3 */}
            <path
              d="M50 36 C45 20, 30 10, 50 2 C65 10, 55 25, 50 36 Z"
              fill={bladeColor}
              fillOpacity="0.8"
              transform="rotate(120 50 50)"
            />
            {/* Blade 4 */}
            <path
              d="M50 36 C45 20, 30 10, 50 2 C65 10, 55 25, 50 36 Z"
              fill={bladeColor}
              fillOpacity="0.8"
              transform="rotate(180 50 50)"
            />
            {/* Blade 5 */}
            <path
              d="M50 36 C45 20, 30 10, 50 2 C65 10, 55 25, 50 36 Z"
              fill={bladeColor}
              fillOpacity="0.8"
              transform="rotate(240 50 50)"
            />
            {/* Blade 6 */}
            <path
              d="M50 36 C45 20, 30 10, 50 2 C65 10, 55 25, 50 36 Z"
              fill={bladeColor}
              fillOpacity="0.8"
              transform="rotate(300 50 50)"
            />
          </svg>

          {/* Center Hub Indicator */}
          <div className="absolute z-20 w-8 h-8 rounded-full bg-gray-900 border-2 border-gray-600 flex items-center justify-center shadow-lg">
            <span className="text-[10px] font-mono font-bold text-gray-300">
              {currentSpeed}%
            </span>
          </div>
        </div>

        {/* Speed Label */}
        <div className="mt-3 flex items-center space-x-2 text-xs text-gray-400">
          <span>
            {t("dashboard.fans.fanCard.currentReading")}{" "}
            <strong className="text-white font-mono">{fan.speed}%</strong>
          </span>
          {pendingSpeed !== undefined && pendingSpeed !== fan.speed && (
            <span className="text-amber-400 font-mono font-medium">
              {t("dashboard.fans.fanCard.newSpeed", { speed: pendingSpeed })}
            </span>
          )}
        </div>
      </div>

      {/* Control Slider & Action buttons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-gray-400 font-mono">
          <span>Min: {minSpeed}%</span>
          <span className="text-white font-bold text-sm">{currentSpeed}%</span>
          <span>Max: {maxSpeed}%</span>
        </div>

        <input
          type="range"
          min={minSpeed}
          max={maxSpeed}
          value={currentSpeed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="w-full accent-emerald-500 cursor-pointer"
        />

        {/* Quick step buttons */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <button
            onClick={() => onSpeedChange(Math.max(minSpeed, currentSpeed - 5))}
            className="py-1 px-1.5 text-[11px] rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 font-mono"
            title={t("dashboard.fans.fanCard.stepDown")}
          >
            -5%
          </button>
          <button
            onClick={() => onSpeedChange(Math.min(maxSpeed, currentSpeed + 5))}
            className="py-1 px-1.5 text-[11px] rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 font-mono"
            title={t("dashboard.fans.fanCard.stepUp")}
          >
            +5%
          </button>
          <button
            onClick={() => onSpeedChange(minSpeed)}
            className="py-1 px-1.5 text-[11px] rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 font-mono"
            title={t("dashboard.fans.fanCard.toMin")}
          >
            {t("dashboard.fans.fanCard.min")}
          </button>
          <button
            onClick={() => onApplySpeed(currentSpeed)}
            disabled={isLoading || currentSpeed === fan.speed}
            className={`py-1 px-1.5 text-[11px] rounded font-semibold transition-all ${
              currentSpeed !== fan.speed
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/40"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isLoading ? "..." : t("dashboard.fans.fanCard.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
