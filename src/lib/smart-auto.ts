import { TempSensor, SmartAutoState } from "@/types";
import { getIloConfig, setSetting } from "./db";
import { fetchServerThermal, setFanSpeeds } from "./ilo";

interface SmartAutoRuntimeState {
  enabled: boolean;
  targetSpeed: number;
  controllingSensor: string;
  controllingTemp: number;
  lastAdjusted?: string;
  isCoolingDown?: boolean;
}

const runtimeState: SmartAutoRuntimeState = {
  enabled: false,
  targetSpeed: 20,
  controllingSensor: "CPU",
  controllingTemp: 40,
  lastAdjusted: undefined,
  isCoolingDown: false,
};

let lastAppliedSpeed = -1;
let lastAppliedTime = 0;
let isAdjusting = false;

// Đánh giá nhiệt độ kiểm soát cao nhất giữa CPU và các thành phần quan trọng
export function evaluateSystemThermal(temperatures: TempSensor[]): {
  controllingSensor: string;
  controllingTemp: number;
  cpuMax: number;
} {
  let cpuMax = 0;
  let controllingTemp = 0;
  let controllingSensor = "CPU";

  for (const t of temperatures) {
    const nameLower = t.name.toLowerCase();
    const temp = t.temperature;
    if (temp <= 0) continue; // Cảm biến offline hoặc không khả dụng

    if (nameLower.includes("cpu")) {
      if (temp > cpuMax) cpuMax = temp;
      if (temp > controllingTemp) {
        controllingTemp = temp;
        controllingSensor = t.name;
      }
    } else if (
      nameLower.includes("controller") ||
      nameLower.includes("raid") ||
      nameLower.includes("smart array")
    ) {
      // Controller lưu trữ SAS/SATA thường chạy nóng tự nhiên (~50-60°C). Trừ 8°C để cân bằng với đường cong CPU
      const normalized = Math.max(0, temp - 8);
      if (normalized > controllingTemp) {
        controllingTemp = normalized;
        controllingSensor = t.name;
      }
    } else if (nameLower.includes("pcie") || nameLower.includes("lom")) {
      // Card mạng / PCIe mở rộng
      const normalized = Math.max(0, temp - 5);
      if (normalized > controllingTemp) {
        controllingTemp = normalized;
        controllingSensor = t.name;
      }
    }
  }

  // Dự phòng nếu không tìm thấy tên cảm biến CPU
  if (controllingTemp === 0 && temperatures.length > 0) {
    const valid = temperatures.filter((t) => t.temperature > 0);
    if (valid.length > 0) {
      const maxT = valid.reduce((prev, curr) => (curr.temperature > prev.temperature ? curr : prev), valid[0]);
      controllingTemp = maxT.temperature;
      controllingSensor = maxT.name;
    }
  }

  return { controllingSensor, controllingTemp, cpuMax };
}

// Tính toán tốc độ quạt mục tiêu dựa theo đường cong nhiệt an toàn
export function calculateSmartFanSpeed(
  controllingTemp: number,
  minFanSpeed: number,
  maxFanSpeed: number
): number {
  let speed = minFanSpeed;

  if (controllingTemp <= 40) {
    speed = minFanSpeed;
  } else if (controllingTemp <= 50) {
    // 40°C -> 50°C: Tăng mượt từ minFanSpeed (vd: 15%) lên 25%
    const progress = (controllingTemp - 40) / 10;
    speed = Math.round(minFanSpeed + progress * (25 - minFanSpeed));
  } else if (controllingTemp <= 60) {
    // 50°C -> 60°C: Tăng mượt từ 25% lên 38%
    const progress = (controllingTemp - 50) / 10;
    speed = Math.round(25 + progress * (38 - 25));
  } else if (controllingTemp <= 70) {
    // 60°C -> 70°C: Tăng mượt từ 38% lên 55%
    const progress = (controllingTemp - 60) / 10;
    speed = Math.round(38 + progress * (55 - 38));
  } else if (controllingTemp <= 80) {
    // 70°C -> 80°C: Tăng mạnh từ 55% lên 80%
    const progress = (controllingTemp - 70) / 10;
    speed = Math.round(55 + progress * (80 - 55));
  } else {
    // > 80°C: Ngưỡng nhiệt nguy hiểm -> 100% quạt
    speed = 100;
  }

  return Math.max(minFanSpeed, Math.min(maxFanSpeed, speed));
}

export function getSmartAutoState(): SmartAutoState {
  const config = getIloConfig();
  return {
    enabled: config.smartAutoEnabled ?? runtimeState.enabled,
    targetSpeed: runtimeState.targetSpeed,
    controllingSensor: runtimeState.controllingSensor,
    controllingTemp: runtimeState.controllingTemp,
    lastAdjusted: runtimeState.lastAdjusted,
    isCoolingDown: runtimeState.isCoolingDown,
  };
}

export function setSmartAutoEnabled(enabled: boolean): SmartAutoState {
  runtimeState.enabled = enabled;
  setSetting("smart_auto_enabled", enabled ? "true" : "false");
  if (!enabled) {
    lastAppliedSpeed = -1;
  } else {
    // Kích hoạt ngay 1 chu kỳ kiểm tra khi người dùng bật
    setTimeout(() => {
      runSmartAutoTick().catch(console.error);
    }, 100);
  }
  return getSmartAutoState();
}

export async function runSmartAutoTick(): Promise<void> {
  if (isAdjusting) return;
  const config = getIloConfig();
  if (!config.smartAutoEnabled && !runtimeState.enabled) return;

  isAdjusting = true;
  try {
    const thermal = await fetchServerThermal();
    if (!thermal || !thermal.temperatures || thermal.temperatures.length === 0) {
      return;
    }

    const { controllingSensor, controllingTemp } = evaluateSystemThermal(thermal.temperatures);
    const rawTarget = calculateSmartFanSpeed(controllingTemp, config.minFanSpeed, config.maxFanSpeed);

    let nextSpeed = rawTarget;
    let isCoolingDown = false;

    // Cơ chế Hysteresis & Làm mượt tốc độ quạt (chống rú giật)
    if (lastAppliedSpeed > 0) {
      if (rawTarget > lastAppliedSpeed) {
        // Nhiệt độ tăng: tăng tốc độ ngay tức thì để bảo vệ máy
        nextSpeed = rawTarget;
      } else if (rawTarget < lastAppliedSpeed) {
        // Nhiệt độ giảm: hạ tốc độ từ từ (tối đa 5% mỗi chu kỳ)
        isCoolingDown = true;
        const maxDrop = 5;
        nextSpeed = Math.max(rawTarget, lastAppliedSpeed - maxDrop);
      }

      const diff = Math.abs(nextSpeed - lastAppliedSpeed);
      const elapsed = Date.now() - lastAppliedTime;

      // Bỏ qua nếu chênh lệch < 3% và chưa qua 60 giây (tránh spam lệnh SSH liên tục)
      if (diff < 3 && elapsed < 60000 && !isCoolingDown) {
        runtimeState.targetSpeed = lastAppliedSpeed;
        runtimeState.controllingSensor = controllingSensor;
        runtimeState.controllingTemp = controllingTemp;
        runtimeState.isCoolingDown = isCoolingDown;
        return;
      }
    }

    // Áp dụng tốc độ mục tiêu tới 6 quạt
    const fansToUpdate = [0, 1, 2, 3, 4, 5].map((idx) => ({ index: idx, speed: nextSpeed }));
    await setFanSpeeds(fansToUpdate);

    lastAppliedSpeed = nextSpeed;
    lastAppliedTime = Date.now();

    runtimeState.enabled = true;
    runtimeState.targetSpeed = nextSpeed;
    runtimeState.controllingSensor = controllingSensor;
    runtimeState.controllingTemp = controllingTemp;
    runtimeState.lastAdjusted = new Date().toISOString();
    runtimeState.isCoolingDown = isCoolingDown;
  } catch (err) {
    console.error("Smart Auto tick failed:", err);
  } finally {
    isAdjusting = false;
  }
}

// Background Daemon Timer (chạy ngầm trong server Node.js)
const globalForDaemon = globalThis as unknown as {
  __smartAutoTimer?: NodeJS.Timeout;
};

export function startSmartAutoDaemon(): void {
  if (globalForDaemon.__smartAutoTimer) return;

  const config = getIloConfig();
  runtimeState.enabled = config.smartAutoEnabled ?? false;

  // Chu kỳ quét ngầm định kỳ mỗi 15 giây
  globalForDaemon.__smartAutoTimer = setInterval(() => {
    runSmartAutoTick().catch((err) => {
      console.error("Smart Auto background daemon error:", err);
    });
  }, 15000);
}
