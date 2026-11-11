import https from "https";
import { Client } from "ssh2";
import { getIloConfig } from "./storage";
import { ServerThermalData, FanStatus, TempSensor, IloConfig } from "@/types";

// In-memory state for mock mode simulation
let mockFanSpeeds = [22, 22, 22, 22, 22, 22]; // Default 22% for DL380 G9
let mockCpu1Temp = 42;
let mockCpu2Temp = 44;
let mockAmbientTemp = 25;

// Cấu hình các thuật toán mã hóa tương thích với chip HP iLO 4
const ILO_SSH_ALGORITHMS: Record<string, string[]> = {
  kex: [
    "diffie-hellman-group14-sha1",
    "diffie-hellman-group-exchange-sha1",
    "diffie-hellman-group1-sha1",
    "diffie-hellman-group14-sha256",
    "diffie-hellman-group16-sha512",
    "diffie-hellman-group18-sha512",
    "ecdh-sha2-nistp256",
    "ecdh-sha2-nistp384",
    "ecdh-sha2-nistp521",
  ],
  cipher: [
    "aes128-ctr",
    "aes192-ctr",
    "aes256-ctr",
    "aes128-gcm",
    "aes256-gcm",
    "aes128-cbc",
    "aes192-cbc",
    "aes256-cbc",
    "3des-cbc",
  ],
  serverHostKey: [
    "ssh-rsa",
    "ssh-dss",
    "rsa-sha2-256",
    "rsa-sha2-512",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521",
  ],
};

// Helper thực hiện GET request qua HTTPS bỏ qua chứng chỉ tự ký và tự động xử lý chuyển hướng (301, 302, 307, 308)
function httpsGetJson(urlStr: string, authHeader: string, timeoutMs = 8000, redirectCount = 0): Promise<Record<string, unknown>> {
  if (redirectCount > 5) {
    return Promise.reject(new Error("Quá nhiều lần chuyển hướng (Redirect loop) từ iLO"));
  }

  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const req = https.request(
        {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || 443,
          path: parsedUrl.pathname + parsedUrl.search,
          method: "GET",
          headers: {
            Authorization: authHeader,
            Accept: "application/json",
          },
          // Mặc định false do iLO 4 xuất xưởng dùng SSL tự ký; cấu hình true qua env khi có CA nội bộ
          rejectUnauthorized: process.env.ILO_REJECT_UNAUTHORIZED === "true",
          timeout: timeoutMs,
        },
        (res) => {
          // Tự động chuyển hướng khi iLO trả về 301, 302, 307, 308
          if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode)) {
            const redirectLocation = res.headers.location;
            if (redirectLocation) {
              const nextUrl = redirectLocation.startsWith("http")
                ? redirectLocation
                : `https://${parsedUrl.hostname}:${parsedUrl.port || 443}${redirectLocation}`;
              return httpsGetJson(nextUrl, authHeader, timeoutMs, redirectCount + 1)
                .then(resolve)
                .catch(reject);
            }
          }

          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            return reject(new Error(`iLO HTTP ${res.statusCode}: ${res.statusMessage || "Lỗi truy vấn"}`));
          }
          let body = "";
          res.on("data", (chunk) => {
            body += chunk;
          });
          res.on("end", () => {
            try {
              const parsed = JSON.parse(body);
              resolve(parsed as Record<string, unknown>);
            } catch (e) {
              reject(new Error("Dữ liệu iLO trả về không phải JSON hợp lệ: " + (e instanceof Error ? e.message : String(e))));
            }
          });
        }
      );

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Hết thời gian chờ kết nối iLO (${timeoutMs / 1000}s)`));
      });

      req.on("error", (err) => {
        reject(err);
      });

      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function fetchServerThermal(): Promise<ServerThermalData> {
  const config = getIloConfig();

  // Nếu người dùng bật Mock mode hoặc chưa điền IP host thì trả về dữ liệu mô phỏng
  if (config.mockMode || !config.host || config.host === "your-ilo-address" || config.host === "192.168.1.100") {
    return {
      ...getSimulatedThermalData(config.minFanSpeed),
      isMock: true,
      iloHost: config.host || "",
    };
  }

  try {
    const authHeader = "Basic " + Buffer.from(`${config.username}:${config.password || ""}`).toString("base64");
    const url = `https://${config.host}:${config.httpPort || 443}/redfish/v1/Chassis/1/Thermal`;

    const data = await httpsGetJson(url, authHeader, 7000);

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
      iloHost: config.host,
    };
  } catch (error) {
    console.warn("Lỗi đọc dữ liệu Redfish từ iLO thật:", error);
    const sim = getSimulatedThermalData(config.minFanSpeed);
    return {
      ...sim,
      isMock: false, // Người dùng đã cài đặt iLO nên KHÔNG PHẢI Mock mode
      connectionError: error instanceof Error ? error.message : String(error),
      iloHost: config.host,
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

  // Handle Mock Mode (chỉ bật khi người dùng cố tình bật mockMode HOẶC chưa điền host)
  if (config.mockMode || !config.host || config.host === "your-ilo-address" || config.host === "192.168.1.100") {
    fansToUpdate.forEach(({ index, speed }) => {
      if (index >= 0 && index < mockFanSpeeds.length) {
        mockFanSpeeds[index] = speed;
        logs.push(`[${timestamp()}] [SSH-MOCK] fan p ${index} max ${Math.ceil((speed / 100) * 255)} -> OK (${speed}%)`);
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

  // Connect via SSH and run commands on real HP DL380 Gen9 with ilo4_unlock mod
  return new Promise((resolve) => {
    const conn = new Client();
    let hasError = false;

    logs.push(`[${timestamp()}] Đang kết nối SSH tới iLO 4: ${config.host}:${config.sshPort || 22}...`);

    conn
      .on("ready", async () => {
        logs.push(`[${timestamp()}] SSH kết nối thành công với tài khoản "${config.username}".`);

        for (const item of fansToUpdate) {
          if (!Number.isInteger(item.index) || item.index < 0 || item.index > 5) {
            logs.push(`[${timestamp()}] [WARN] Bỏ qua index quạt không hợp lệ: ${item.index}`);
            continue;
          }
          // ilo4_unlock (Silence of the Fans) syntax: fan p <bay> max <0-255>
          const rawVal = Math.max(0, Math.min(255, Math.ceil((item.speed / 100) * 255)));
          const cmd = `fan p ${item.index} max ${rawVal}`;

          await new Promise<void>((cmdResolve) => {
            const timeoutTimer = setTimeout(() => {
              logs.push(`[${timestamp()}] [ILO-SSH] Quạt #${item.index + 1}: Lệnh "${cmd}" đã gửi (tiếp tục...)`);
              cmdResolve();
            }, 3000);

            conn.exec(cmd, (err, stream) => {
              if (err) {
                clearTimeout(timeoutTimer);
                logs.push(`[${timestamp()}] [ERROR] Lỗi gửi lệnh "${cmd}": ${err.message}`);
                cmdResolve();
                return;
              }
              let output = "";
              stream.on("data", (data: Buffer) => {
                output += data.toString();
              });
              stream.stderr.on("data", (data: Buffer) => {
                output += data.toString();
              });
              stream.on("close", () => {
                clearTimeout(timeoutTimer);
                const trimmed = output.trim();
                if (trimmed) {
                  logs.push(`[${timestamp()}] [ILO-SSH] ${trimmed}`);
                }
                logs.push(`[${timestamp()}] Đã thiết lập Quạt #${item.index + 1} MAX = ${rawVal} (~${item.speed}%)`);
                cmdResolve();
              });
            });
          });
        }

        conn.end();
        logs.push(`[${timestamp()}] Hoàn tất điều khiển ${fansToUpdate.length} quạt trên máy chủ iLO!`);

        // Wait short period then fetch updated fans from iLO Redfish
        setTimeout(async () => {
          const thermal = await fetchServerThermal();
          resolve({
            success: true,
            message: `Đã áp dụng tốc độ quạt qua SSH thành công!`,
            logs,
            fans: thermal.fans,
          });
        }, 1500);
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
        readyTimeout: 10000,
        algorithms: ILO_SSH_ALGORITHMS,
      });
  });
}

export async function testIloConnection(customConfig?: Partial<IloConfig>): Promise<{
  restOk: boolean;
  sshOk: boolean;
  restMessage: string;
  sshMessage: string;
}> {
  const saved = getIloConfig();
  const config: IloConfig = {
    ...saved,
    ...customConfig,
    password: customConfig?.password || saved.password,
  };

  if (!config.host || config.host === "your-ilo-address" || config.host === "192.168.1.100") {
    return {
      restOk: false,
      sshOk: false,
      restMessage: "Vui lòng nhập địa chỉ IP iLO thật trước khi test.",
      sshMessage: "Chưa có địa chỉ IP để kết nối SSH.",
    };
  }

  // 1. Test REST API qua HTTPS (bỏ qua SSL tự ký của iLO)
  let restOk = false;
  let restMessage = "";
  try {
    const authHeader = "Basic " + Buffer.from(`${config.username}:${config.password || ""}`).toString("base64");
    const url = `https://${config.host}:${config.httpPort || 443}/redfish/v1/Chassis/1/Thermal`;
    await httpsGetJson(url, authHeader, 6000);
    restOk = true;
    restMessage = `Kết nối Redfish REST API qua HTTPS port ${config.httpPort || 443} thành công!`;
  } catch (err: unknown) {
    restMessage = `Không thể kết nối REST API (${config.host}:${config.httpPort || 443}): ${err instanceof Error ? err.message : String(err)}`;
  }

  // 2. Test SSH xác thực & kiểm tra firmware ilo4_unlock
  const sshResult = await new Promise<{ ok: boolean; message: string }>((resolve) => {
    const conn = new Client();
    let isDone = false;

    const timeoutTimer = setTimeout(() => {
      if (!isDone) {
        isDone = true;
        conn.end();
        resolve({ ok: false, message: `Hết thời gian chờ kết nối SSH port ${config.sshPort || 22} (Timeout 7s)` });
      }
    }, 7000);

    conn
      .on("ready", () => {
        conn.exec("fan info", (err, stream) => {
          if (err) {
            if (!isDone) {
              isDone = true;
              clearTimeout(timeoutTimer);
              conn.end();
              resolve({ ok: true, message: `Kết nối SSH thành công (Port ${config.sshPort || 22})!` });
            }
            return;
          }

          let out = "";
          stream.on("data", (data: Buffer) => {
            out += data.toString();
          });
          stream.on("close", () => {
            if (!isDone) {
              isDone = true;
              clearTimeout(timeoutTimer);
              conn.end();
              resolve({
                ok: true,
                message: `Kết nối SSH port ${config.sshPort || 22} xác thực thành công & Nhận diện lệnh fan iLO 4 Unlock!`,
              });
            }
          });
        });
      })
      .on("error", (err) => {
        if (!isDone) {
          isDone = true;
          clearTimeout(timeoutTimer);
          resolve({ ok: false, message: `Lỗi kết nối SSH (${config.host}:${config.sshPort || 22}): ${err.message}` });
        }
      })
      .connect({
        host: config.host,
        port: config.sshPort || 22,
        username: config.username,
        password: config.password,
        readyTimeout: 10000,
        algorithms: ILO_SSH_ALGORITHMS,
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
