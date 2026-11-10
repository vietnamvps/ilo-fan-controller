"use client";

import React, { useRef, useEffect } from "react";
import { Terminal, Trash2 } from "lucide-react";
import { LogEntry } from "@/types";

interface ActionLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export default function ActionLogs({ logs, onClearLogs }: ActionLogsProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="rounded-2xl border border-gray-800 bg-[#090d16] p-4 shadow-xl font-mono text-xs">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-gray-200">Nhật ký iLO Terminal (SSH & Redfish)</span>
          <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded bg-gray-800">
            {logs.length} dòng
          </span>
        </div>

        <button
          onClick={onClearLogs}
          title="Xóa nhật ký log"
          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-800 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2 select-text">
        {logs.length === 0 ? (
          <div className="text-gray-400 italic py-2 text-center">
            Chưa có lệnh nào được thực thi. Hãy chọn preset hoặc thay đổi tốc độ quạt để bắt đầu.
          </div>
        ) : (
          logs.map((log) => {
            let textColor = "text-gray-300";
            if (log.type === "success") textColor = "text-emerald-400";
            if (log.type === "warn") textColor = "text-amber-400";
            if (log.type === "error") textColor = "text-rose-400";

            return (
              <div key={log.id} className="flex items-start space-x-2 leading-relaxed">
                <span className="text-gray-400 shrink-0">[{log.timestamp}]</span>
                <span className={`break-all ${textColor}`}>{log.message}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
