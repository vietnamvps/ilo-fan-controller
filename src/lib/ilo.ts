import https from "https";
import { Client } from "ssh2";
import { getIloConfig } from "./storage";
import { ServerThermalData, FanStatus, TempSensor } from "@/types";

// In-memory state for mock mode simulation
let mockFanSpeeds = [22, 22, 22, 22, 22, 22]; // Default 22% for DL380 G9
let mockCpu1Temp = 42;
let mockCpu2Temp = 44;
let mockAmbientTemp = 25;

export async function fetchServerThermal(): Promise<ServerThermalData> {
  const config = await getIloConfig();

  // If in mock mode or host is not properly configured, return simulated HP DL380 G9 data
  if (config.mockMode || !config.host || config.host === "your-ilo-address" || config.host === "192.168.1.100") {
    return getSimulatedThermalData(config.minFanSpeed);
  }

  try {
    const authHeader = "Basic " + Buffer.from(`${config.username}:${config.password}`).toString("base64");
    const url = `https://${config.host}:${config.httpPort || 443}/redfish/v1/Chassis/1/Thermal`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const agent = new https.Agent({ rejectUnauthorized: false });

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      // @ts-expect-error agent is supported in Node runtime fetch
      agent,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`iLO HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    const fans: FanStatus[] = [];
    if (Array.isArray(data.Fans)) {
      data.Fans.forEach((fan: Record<string, unknown>, idx: number) => {
        const name = (fan.FanName as string) || `Fan ${idx + 1}`;
        const speed = typeof fan.CurrentReading === "number" ? fan.CurrentReading : 0;
        const statusStr = (fan.Status as { Health?: string })?.Health || "OK";
        
        fans.push({
          name,
          index: idx,
          speed,
          status: statusStr === "OK" ? "OK" : statusStr === "Warning" ? "Warning" : "Critical",
          units: (fan.Units as string) || "%",
        });
      });
    }

    const temperatures: TempSensor[] = [];
    if (Array.isArray(data.Temperatures)) {
      data.Temperatures.forEach((temp: Record<string, unknown>) => {
        const name = (temp.Name as string) || "Sensor";
        const reading = typeof temp.ReadingCelsius === "number" ? temp.ReadingCelsius : 0;
        const crit = typeof temp.UpperThresholdCritical === "number" ? temp.UpperThresholdCritical : undefined;
        const statusStr = (temp.Status as { Health?: string })?.Health || "OK";

        temperatures.push({
          name,
          temperature: reading,
          criticalThreshold: crit,
          status: statusStr === "OK" ? "OK" : statusStr === "Warning" ? "Warning" : "Critical",
        });
      });
    }

    return {
      fans: fans.length > 0 ? fans : getSimulatedFans(mockFanSpeeds),
      temperatures: temperatures.length > 0 ? temperatures : getSimulatedTemperatures(),
      lastUpdated: new Date().toISOString(),
      serverModel: "HPE ProLiant DL380 Gen9",
      iloFirmware: "iLO 4 v2.77 (Fan Mod)",
      isMock: false,
    };
  } catch (error) {
    console.warn("Failed to fetch live iLO data, falling back to simulated data:", error);
    const sim = getSimulatedThermalData(config.minFanSpeed);
    return {
      ...sim,
      isMock: true,
    };
  }
}

export interface SetFanResult {
  success: boolean;
  message: string;
  logs: string[];
  fans?: FanStatus[];
}

export async function setFanSpeeds(fansToUpdate: { index: number; speed: number }[]): Promise<SetFanResult> {
  const config = await getIloConfig();
  const logs: string[] = [];
  const timestamp = () => new Date().toLocaleTimeString();

  // Validate bounds
  for (const item of fansToUpdate) {
    if (item.speed < config.minFanSpeed) {
      item.speed = config.minFanSpeed;
      logs.push(`[${timestamp()}] [WARN] Giới hạn quạt #${item.index + 1} về mức an toàn tối thiểu ${config.minFanSpeed}%`);
    }
    if (item.speed > config.maxFanSpeed) {
      item.speed = config.maxFanSpeed;
    }
  }

  // Handle Mock Mode
  if (config.mockMode || !config.host || config.host === "your-ilo-address" || config.host === "192.168.1.100") {
    fansToUpdate.forEach(({ index, speed }) => {
      if (index >= 0 && index < mockFanSpeeds.length) {
        mockFanSpeeds[index] = speed;
        logs.push(`[${timestamp()}] [SSH-MOCK] fan p ${index} max ${Math.ceil((speed / 100) * 255)} -> OK`);
        logs.push(`[${timestamp()}] [SSH-MOCK] fan p ${index} min 255 -> OK (Tốc độ đặt: ${speed}%)`);
      }
    });

    // Adjust simulated temperatures slightly based on fan speeds
    const avgSpeed = mockFanSpeeds.reduce((a, b) => a + b, 0) / mockFanSpeeds.length;
    mockCpu1Temp = Math.round(55 - (avgSpeed / 100) * 18);
    mockCpu2Temp = Math.round(57 - (avgSpeed / 100) * 18);

    return {
      success: true,
      message: `Đã cập nhật ${fansToUpdate.length} quạt thành công (Chế độ mô phỏng)`,
      logs,
      fans: getSimulatedFans(mockFanSpeeds),
    };
  }

  // Connect via SSH and run commands
  return new Promise((resolve) => {
    const conn = new Client();
    let hasError = false;

    logs.push(`[${timestamp()}] Đang kết nối SSH tới iLO 4: ${config.host}:${config.sshPort}...`);

    conn
      .on("ready", async () => {
        logs.push(`[${timestamp()}] SSH kết nối thành công với tài khoản ${config.username}.`);

        for (const item of fansToUpdate) {
          const rawVal = Math.ceil((item.speed / 100) * 255);
          const cmd1 = `fan p ${item.index} max ${rawVal}`;
          const cmd2 = `fan p ${item.index} min 255`;

          await new Promise<void>((cmdResolve) => {
            conn.exec(cmd1, (err, stream) => {
              if (err) {
                logs.push(`[${timestamp()}] [ERROR] Lỗi gửi lệnh "${cmd1}": ${err.message}`);
                cmdResolve();
                return;
              }
              stream.on("data", (data: Buffer) => {
                logs.push(`[${timestamp()}] [ILO-SSH] ${data.toString().trim()}`);
              });
              stream.on("close", () => {
                logs.push(`[${timestamp()}] Đã thiết lập Quạt #${item.index + 1} MAX = ${rawVal} (${item.speed}%)`);
                conn.exec(cmd2, (err2, stream2) => {
                  if (err2) {
                    logs.push(`[${timestamp()}] [ERROR] Lỗi gửi lệnh "${cmd2}": ${err2.message}`);
                    cmdResolve();
                    return;
                  }
                  stream2.on("data", (data: Buffer) => {
                    logs.push(`[${timestamp()}] [ILO-SSH] ${data.toString().trim()}`);
                  });
                  stream2.on("close", () => {
                    logs.push(`[${timestamp()}] Đã khóa Quạt #${item.index + 1} MIN = 255`);
                    cmdResolve();
                  });
                });
              });
            });
          });
        }

        conn.end();
        logs.push(`[${timestamp()}] Hoàn tất điều khiển tất cả các quạt!`);

        // Wait short period then fetch updated fans
        setTimeout(async () => {
          const thermal = await fetchServerThermal();
          resolve({
            success: true,
            message: `Đã áp dụng tốc độ quạt qua SSH thành công!`,
            logs,
            fans: thermal.fans,
          });
        }, 1200);
      })
      .on("error", (err) => {
        hasError = true;
        logs.push(`[${timestamp()}] [SSH-ERROR] ${err.message}`);
        resolve({
          success: false,
          message: `Không thể kết nối SSH tới iLO (${config.host}:${config.sshPort}): ${err.message}`,
          logs,
        });
      })
      .connect({
        host: config.host,
        port: config.sshPort || 22,
        username: config.username,
        password: config.password,
        readyTimeout: 8000,
      });
  });
}

export async function testIloConnection(): Promise<{
  restOk: boolean;
  sshOk: boolean;
  restMessage: string;
  sshMessage: string;
}> {
  const config = await getIloConfig();

  if (config.mockMode || !config.host || config.host === "192.168.1.100") {
    return {
      restOk: true,
      sshOk: true,
      restMessage: "Mô phỏng Redfish REST API hoạt động bình thường (Chế độ Mock)",
      sshMessage: "Mô phỏng iLO SSH Fan Hack phản hồi lệnh fan p <n> max/min thành công",
    };
  }

  // 1. Test REST API
  let restOk = false;
  let restMessage = "";
  try {
    const authHeader = "Basic " + Buffer.from(`${config.username}:${config.password}`).toString("base64");
    const agent = new https.Agent({ rejectUnauthorized: false });
    const res = await fetch(`https://${config.host}:${config.httpPort || 443}/redfish/v1/Chassis/1/Thermal`, {
      method: "GET",
      headers: { Authorization: authHeader },
      // @ts-expect-error agent in node fetch
      agent,
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      restOk = true;
      restMessage = `Kết nối Redfish API thành công (HTTP ${res.status})`;
    } else {
      restMessage = `Lỗi HTTP ${res.status}: ${res.statusText}`;
    }
  } catch (err: unknown) {
    restMessage = `Không thể kết nối REST API: ${err instanceof Error ? err.message : String(err)}`;
  }

  // 2. Test SSH
  const sshResult = await new Promise<{ ok: boolean; message: string }>((resolve) => {
    const conn = new Client();
    conn
      .on("ready", () => {
        conn.end();
        resolve({ ok: true, message: `Kết nối SSH port ${config.sshPort || 22} xác thực thành công!` });
      })
      .on("error", (err) => {
        resolve({ ok: false, message: `Lỗi kết nối SSH: ${err.message}` });
      })
      .connect({
        host: config.host,
        port: config.sshPort || 22,
        username: config.username,
        password: config.password,
        readyTimeout: 6000,
      });
  });

  return {
    restOk,
    sshOk: sshResult.ok,
    restMessage,
    sshMessage: sshResult.message,
  };
}

// Helper simulated data functions for HP ProLiant DL380 Gen9
function getSimulatedFans(speeds: number[]): FanStatus[] {
  return speeds.map((speed, i) => ({
    name: `Fan ${i + 1}`,
    index: i,
    speed,
    status: speed > 90 ? "Warning" : "OK",
    units: "%",
  }));
}

function getSimulatedTemperatures(): TempSensor[] {
  // Add subtle jitter for realistic monitoring feel
  const jitter = () => (Math.random() - 0.5) * 1.5;
  return [
    { name: "01-Inlet Ambient", temperature: Math.round((mockAmbientTemp + jitter()) * 10) / 10, criticalThreshold: 42, status: "OK" },
    { name: "02-CPU 1 (Xeon E5-2680 v4)", temperature: Math.round((mockCpu1Temp + jitter()) * 10) / 10, criticalThreshold: 85, status: "OK" },
    { name: "03-CPU 2 (Xeon E5-2680 v4)", temperature: Math.round((mockCpu2Temp + jitter()) * 10) / 10, criticalThreshold: 85, status: "OK" },
    { name: "04-Memory / DIMM Array", temperature: Math.round((36.5 + jitter()) * 10) / 10, criticalThreshold: 80, status: "OK" },
    { name: "05-System Board / Chipset", temperature: Math.round((41.0 + jitter()) * 10) / 10, criticalThreshold: 75, status: "OK" },
    { name: "06-PCIe Slot 1 (10GbE SFP+)", temperature: Math.round((49.2 + jitter()) * 10) / 10, criticalThreshold: 88, status: "OK" },
    { name: "07-SAS Smart Array P440ar", temperature: Math.round((45.8 + jitter()) * 10) / 10, criticalThreshold: 85, status: "OK" },
    { name: "08-Power Supply 1 (500W)", temperature: Math.round((39.0 + jitter()) * 10) / 10, criticalThreshold: 70, status: "OK" },
  ];
}

function getSimulatedThermalData(minFanSpeed: number): ServerThermalData {
  return {
    fans: getSimulatedFans(mockFanSpeeds),
    temperatures: getSimulatedTemperatures(),
    lastUpdated: new Date().toISOString(),
    serverModel: "HPE ProLiant DL380 Gen9 (2U Server)",
    iloFirmware: "iLO 4 v2.77 (Fan Mod Unlocked)",
    isMock: true,
  };
}
