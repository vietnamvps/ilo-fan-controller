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
let highTempHoldCycles = 0; // Số chu kỳ giữ tốc độ sau khi nhiệt độ đã hạ để tránh tụt sốc

/**
 * Tính toán tốc độ quạt yêu cầu cho từng loại linh kiện dựa theo đặc tính kỹ thuật phần cứng HPE:
 */
export function calculateSensorFanDemand(
  sensor: TempSensor,
  minFanSpeed: number,
  maxFanSpeed: number
): number {
  const nameLower = sensor.name.toLowerCase();
  const temp = sensor.temperature;
  if (temp <= 0) return minFanSpeed;

  let demandedSpeed = minFanSpeed;

  if (nameLower.includes("cpu")) {
    // 1. CPU (Intel Xeon E5-2600 v3/v4 - TDP 85W-145W, TJMax ~85-90°C)
    // - <= 42°C: Nhàn rỗi -> Mức quạt tối thiểu an toàn (15-20%)
    // - 43°C - 55°C: Tải nhẹ/văn phòng -> 20% - 28% (tĩnh lặng)
    // - 56°C - 65°C: Tải trung bình -> 28% - 42% (làm mát êm ái)
    // - 66°C - 75°C: Tải nặng liên tục -> 42% - 65% (tản nhiệt mạnh)
    // - 76°C - 82°C: Rất nóng -> 65% - 85%
    // - > 82°C: Khẩn cấp -> 100%
    if (temp <= 42) {
      demandedSpeed = minFanSpeed;
    } else if (temp <= 55) {
      const p = (temp - 42) / (55 - 42);
      demandedSpeed = minFanSpeed + p * (28 - minFanSpeed);
    } else if (temp <= 65) {
      const p = (temp - 55) / (65 - 55);
      demandedSpeed = 28 + p * (42 - 28);
    } else if (temp <= 75) {
      const p = (temp - 65) / (75 - 65);
      demandedSpeed = 42 + p * (65 - 42);
    } else if (temp <= 82) {
      const p = (temp - 75) / (82 - 75);
      demandedSpeed = 65 + p * (85 - 65);
    } else {
      demandedSpeed = 100;
    }
  } else if (
    nameLower.includes("controller") ||
    nameLower.includes("raid") ||
    nameLower.includes("smart array") ||
    nameLower.includes("storage")
  ) {
    // 2. SAS Storage Controller (Smart Array P440ar, chip LSI ROC)
    // Đặc thù SAS ROC tỏa nhiệt thụ động 50-65°C là hoàn toàn bình thường (ngưỡng an toàn lên tới 85°C).
    // Chỉ tăng quạt khi controller vượt ngưỡng 60°C.
    if (temp <= 60) {
      demandedSpeed = minFanSpeed;
    } else if (temp <= 72) {
      const p = (temp - 60) / (72 - 60);
      demandedSpeed = minFanSpeed + p * (35 - minFanSpeed);
    } else if (temp <= 80) {
      const p = (temp - 72) / (80 - 72);
      demandedSpeed = 35 + p * (65 - 35);
    } else {
      demandedSpeed = 100;
    }
  } else if (nameLower.includes("pcie") || nameLower.includes("lom") || nameLower.includes("slot")) {
    // 3. Cạc mạng 10GbE SFP+, NVMe adapter, cạc đồ họa PCIe
    // Thường hoạt động ở mức 45-58°C.
    if (temp <= 58) {
      demandedSpeed = minFanSpeed;
    } else if (temp <= 70) {
      const p = (temp - 58) / (70 - 58);
      demandedSpeed = minFanSpeed + p * (35 - minFanSpeed);
    } else if (temp <= 80) {
      const p = (temp - 70) / (80 - 70);
      demandedSpeed = 35 + p * (60 - 35);
    } else {
      demandedSpeed = 90;
    }
  } else if (nameLower.includes("memory") || nameLower.includes("dimm")) {
    // 4. Mảng RAM DDR4 Registered (Ngưỡng định mức JEDEC 85°C)
    if (temp <= 50) {
      demandedSpeed = minFanSpeed;
    } else if (temp <= 68) {
      const p = (temp - 50) / (68 - 50);
      demandedSpeed = minFanSpeed + p * (35 - minFanSpeed);
    } else {
      demandedSpeed = 60;
    }
  } else if (nameLower.includes("ambient") || nameLower.includes("inlet")) {
    // 5. Cảm biến cửa hút gió phòng máy (Ambient Inlet)
    // Nếu phòng mát (<= 28°C), không yêu cầu thêm tốc độ quạt.
    // Nếu phòng nóng (> 30°C), cần tăng nhẹ sàn quạt để tăng lưu thông khí.
    if (temp > 30) {
      demandedSpeed = minFanSpeed + (temp - 30) * 1.5;
    } else {
      demandedSpeed = minFanSpeed;
    }
  } else {
    // Cảm biến chung (Chipset, System Board, Power Supply)
    if (temp <= 50) {
      demandedSpeed = minFanSpeed;
    } else if (temp <= 70) {
      const p = (temp - 50) / 20;
      demandedSpeed = minFanSpeed + p * (35 - minFanSpeed);
    } else {
      demandedSpeed = 60;
    }
  }

  return Math.max(minFanSpeed, Math.min(maxFanSpeed, Math.round(demandedSpeed)));
}

/**
 * Đánh giá nhiệt độ toàn hệ thống:
 * Chọn ra cảm biến có nhu cầu làm mát cao nhất, trả về tên cảm biến VÀ nhiệt độ thực tế chính xác của cảm biến đó.
 */
export function evaluateSystemThermal(
  temperatures: TempSensor[],
  minFanSpeed: number = 15,
  maxFanSpeed: number = 100
): {
  controllingSensor: string;
  controllingTemp: number;
  highestDemandedSpeed: number;
  cpuMax: number;
} {
  let highestDemandedSpeed = minFanSpeed;
  let controllingSensor = "CPU";
  let controllingTemp = 40;
  let cpuMax = 0;

  for (const sensor of temperatures) {
    if (sensor.temperature <= 0) continue;

    const nameLower = sensor.name.toLowerCase();
    if (nameLower.includes("cpu") && sensor.temperature > cpuMax) {
      cpuMax = sensor.temperature;
    }

    const demand = calculateSensorFanDemand(sensor, minFanSpeed, maxFanSpeed);
    if (demand > highestDemandedSpeed || (demand === highestDemandedSpeed && nameLower.includes("cpu"))) {
      highestDemandedSpeed = demand;
      controllingSensor = sensor.name;
      controllingTemp = sensor.temperature;
    }
  }

  // Dự phòng nếu không có cảm biến hợp lệ
  if (controllingSensor === "CPU" && controllingTemp === 40 && temperatures.length > 0) {
    const valid = temperatures.filter((t) => t.temperature > 0);
    if (valid.length > 0) {
      const highest = valid.reduce((p, c) => (c.temperature > p.temperature ? c : p), valid[0]);
      controllingSensor = highest.name;
      controllingTemp = highest.temperature;
      highestDemandedSpeed = calculateSensorFanDemand(highest, minFanSpeed, maxFanSpeed);
    }
  }

  return { controllingSensor, controllingTemp, highestDemandedSpeed, cpuMax };
}

// Hàm tính toán tương thích ngược
export function calculateSmartFanSpeed(
  controllingTemp: number,
  minFanSpeed: number,
  maxFanSpeed: number
): number {
  return calculateSensorFanDemand(
    { name: "CPU", temperature: controllingTemp, status: "OK" },
    minFanSpeed,
    maxFanSpeed
  );
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
    highTempHoldCycles = 0;
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

    const { controllingSensor, controllingTemp, highestDemandedSpeed } = evaluateSystemThermal(
      thermal.temperatures,
      config.minFanSpeed,
      config.maxFanSpeed
    );

    let nextSpeed = highestDemandedSpeed;
    let isCoolingDown = false;

    // Cơ chế Hysteresis & Làm mượt tốc độ quạt (chống rú giật)
    if (lastAppliedSpeed > 0) {
      if (highestDemandedSpeed > lastAppliedSpeed) {
        // Nhiệt độ tăng: Tăng tốc ngay lập tức để giải nhiệt
        highTempHoldCycles = 2; // Giữ ít nhất 2 chu kỳ (~30s) trước khi cho phép hạ tốc độ
        nextSpeed = highestDemandedSpeed;
      } else if (highestDemandedSpeed < lastAppliedSpeed) {
        // Nhiệt độ giảm:
        isCoolingDown = true;
        if (highTempHoldCycles > 0) {
          // Vẫn trong thời gian giữ nhiệt (dwell time): giữ nguyên tốc độ quạt
          highTempHoldCycles--;
          nextSpeed = lastAppliedSpeed;
        } else {
          // Hạ dần từ từ: mỗi chu kỳ hạ tối đa 3% PWM để tránh rú quạt thất thường
          const maxDrop = 3;
          nextSpeed = Math.max(highestDemandedSpeed, lastAppliedSpeed - maxDrop);
        }
      } else {
        highTempHoldCycles = 0;
      }

      const diff = Math.abs(nextSpeed - lastAppliedSpeed);
      const elapsed = Date.now() - lastAppliedTime;

      // Deadband: Nếu chênh lệch <= 1% hoặc chênh lệch <= 2% trong vòng 45s (và không phải đang hạ nhiệt sâu)
      if (diff <= 1 || (diff <= 2 && elapsed < 45000 && !isCoolingDown)) {
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
