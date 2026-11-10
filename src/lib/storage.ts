import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AuthConfig, IloConfig, FanPreset } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");
const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const PRESETS_FILE = path.join(DATA_DIR, "presets.json");

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Default Configuration
const DEFAULT_CONFIG: IloConfig = {
  host: process.env.ILO_HOST || "192.168.1.100",
  sshPort: Number(process.env.ILO_SSH_PORT) || 22,
  httpPort: Number(process.env.ILO_HTTP_PORT) || 443,
  username: process.env.ILO_USERNAME || "Administrator",
  password: process.env.ILO_PASSWORD || "",
  minFanSpeed: Number(process.env.MINIMUM_FAN_SPEED) || 15,
  maxFanSpeed: 100,
  mockMode: process.env.MOCK_MODE === "true" || !process.env.ILO_HOST,
  autoRefreshInterval: 5,
};

// Default Presets for HP DL380 G9 (6 Fan Bays)
const DEFAULT_PRESETS: FanPreset[] = [
  {
    id: "silent",
    name: "Ultra Quiet (Silent)",
    description: "Tốc độ 15% - Vô cùng êm ái, lý tưởng cho phòng làm việc hoặc gia đình.",
    speeds: [15, 15, 15, 15, 15, 15],
    icon: "VolumeX",
  },
  {
    id: "balanced",
    name: "Balanced (Cân bằng)",
    description: "Tốc độ 30% - Cân bằng nhiệt độ và tiếng ồn trong quá trình hoạt động thường ngày.",
    speeds: [30, 30, 30, 30, 30, 30],
    icon: "Volume2",
  },
  {
    id: "performance",
    name: "Performance (Hiệu năng cao)",
    description: "Tốc độ 60% - Làm mát mạnh mẽ cho các tác vụ tải nặng, render, ảo hóa cao.",
    speeds: [60, 60, 60, 60, 60, 60],
    icon: "Zap",
  },
  {
    id: "turbine",
    name: "Turbine Boost (100% Max)",
    description: "Tốc độ 100% - Giải nhiệt tối đa, âm lượng quạt phản lực cất cánh.",
    speeds: [100, 100, 100, 100, 100, 100],
    icon: "Flame",
  },
];

export function getIloConfig(): IloConfig {
  ensureDataDir();
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Error reading config.json:", err);
  }
  // If not exists, save default
  saveIloConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

export function saveIloConfig(config: IloConfig): void {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

export function getAuthConfig(): AuthConfig {
  ensureDataDir();
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = fs.readFileSync(AUTH_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading auth.json:", err);
  }

  // Create default credentials if none exists
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync("admin123", salt);
  const jwtSecret = crypto.randomBytes(32).toString("hex");

  const defaultAuth: AuthConfig = {
    username: "admin",
    passwordHash: defaultPasswordHash,
    jwtSecret,
  };

  fs.writeFileSync(AUTH_FILE, JSON.stringify(defaultAuth, null, 2), "utf-8");
  return defaultAuth;
}

export function saveAuthConfig(auth: AuthConfig): void {
  ensureDataDir();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2), "utf-8");
}

export function getPresets(): FanPreset[] {
  ensureDataDir();
  try {
    if (fs.existsSync(PRESETS_FILE)) {
      const data = fs.readFileSync(PRESETS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Error reading presets.json:", err);
  }

  savePresets(DEFAULT_PRESETS);
  return DEFAULT_PRESETS;
}

export function savePresets(presets: FanPreset[]): void {
  ensureDataDir();
  fs.writeFileSync(PRESETS_FILE, JSON.stringify(presets, null, 2), "utf-8");
}
