"use client";

import React, { useRef, useEffect } from "react";
import { Terminal, Trash2 } from "lucide-react";
import { LogEntry } from "@/types";
import { useTranslation } from "../contexts/LanguageContext";

interface ActionLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export default function ActionLogs({ logs, onClearLogs }: ActionLogsProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#090d16] p-4 shadow-xl font-mono text-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-gray-200">{t("dashboard.logs.title")}</span>
          <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded bg-gray-800">
            {t("dashboard.logs.linesCount", { count: logs.length })}
          </span>
        </div>

        <button
          onClick={onClearLogs}
          title={t("dashboard.logs.clearTitle")}
          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-800 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 select-text">
        {logs.length === 0 ? (
          <div className="text-gray-400 italic py-2 text-center">
            {t("dashboard.logs.empty")}
          </div>
        ) : (
          logs.map((log) => {
            let textColor = "text-gray-300";
            if (log.type === "success") textColor = "text-emerald-400";
            if (log.type === "warn") textColor = "text-amber-400";
            if (log.type === "error") textColor = "text-rose-400";

            const content = log.key ? t(log.key, log.params) : (log.message || "");

            return (
              <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                <span className="text-gray-400 shrink-0">[{log.timestamp}]</span>
                <span className={`break-all ${textColor}`}>{content}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
