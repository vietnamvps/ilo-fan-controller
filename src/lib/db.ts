import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AuthConfig, IloConfig, FanPreset } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  dbInstance = new Database(DB_PATH);
  dbInstance.pragma("journal_mode = WAL");

  initDb(dbInstance);
  return dbInstance;
}

function initDb(db: Database.Database) {
  // Table: users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table: settings (Key-Value)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Table: presets
  db.exec(`
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      speeds TEXT NOT NULL,
      icon TEXT
    );
  `);

  // Ensure JWT secret exists in settings
  const getSecretStmt = db.prepare("SELECT value FROM settings WHERE key = ?");
  const existingSecret = getSecretStmt.get("jwt_secret") as { value: string } | undefined;
  if (!existingSecret) {
    const newSecret = crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("jwt_secret", newSecret);
  }

  // Seed default presets if empty
  seedDefaultPresets(db);
}

// Default Presets for HP ProLiant DL380 G9
function seedDefaultPresets(db: Database.Database) {
  const countRow = db.prepare("SELECT COUNT(*) as count FROM presets").get() as { count: number };
  if (countRow.count === 0) {
    const insertStmt = db.prepare("INSERT INTO presets (id, name, description, speeds, icon) VALUES (?, ?, ?, ?, ?)");
    const defaults = [
      {
        id: "silent",
        name: "Ultra Quiet (Silent)",
        description: "Tốc độ 15% - Vô cùng êm ái, lý tưởng cho phòng làm việc hoặc gia đình.",
        speeds: JSON.stringify([15, 15, 15, 15, 15, 15]),
        icon: "VolumeX",
      },
      {
        id: "balanced",
        name: "Balanced (Cân bằng)",
        description: "Tốc độ 30% - Cân bằng nhiệt độ và tiếng ồn trong quá trình hoạt động thường ngày.",
        speeds: JSON.stringify([30, 30, 30, 30, 30, 30]),
        icon: "Volume2",
      },
      {
        id: "performance",
        name: "Performance (Hiệu năng cao)",
        description: "Tốc độ 60% - Làm mát mạnh mẽ cho các tác vụ tải nặng, render, ảo hóa cao.",
        speeds: JSON.stringify([60, 60, 60, 60, 60, 60]),
        icon: "Zap",
      },
      {
        id: "turbine",
        name: "Turbine Boost (100% Max)",
        description: "Tốc độ 100% - Giải nhiệt tối đa, âm lượng quạt phản lực cất cánh.",
        speeds: JSON.stringify([100, 100, 100, 100, 100, 100]),
        icon: "Flame",
      },
    ];

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insertStmt.run(item.id, item.name, item.description, item.speeds, item.icon);
      }
    });
    insertMany(defaults);
  }
}

// ----------------- USER & AUTH -----------------

export function hasAdminUser(): boolean {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  return row.count > 0;
}

export function getAdminUser(): { id: number; username: string; password_hash: string } | null {
  const db = getDb();
  const row = db.prepare("SELECT id, username, password_hash FROM users ORDER BY id ASC LIMIT 1").get() as
    | { id: number; username: string; password_hash: string }
    | undefined;
  return row || null;
}

export function createAdminUser(username: string, password: string): { success: boolean; error?: string } {
  const db = getDb();
  if (hasAdminUser()) {
    return { success: false, error: "Tài khoản quản trị đã tồn tại trên hệ thống!" };
  }

  const cleanUsername = username.trim();
  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: "Tên tài khoản phải có ít nhất 3 ký tự!" };
  }
  if (!password || password.length < 6) {
    return { success: false, error: "Mật khẩu phải có ít nhất 6 ký tự!" };
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  try {
    db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(cleanUsername, passwordHash);
    return { success: true };
  } catch (err) {
    return { success: false, error: "Lỗi tạo tài khoản: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export function updateAdminPassword(newPassword: string, newUsername?: string): boolean {
  const db = getDb();
  const current = getAdminUser();
  if (!current) return false;

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);
  const username = newUsername?.trim() || current.username;

  try {
    db.prepare("UPDATE users SET username = ?, password_hash = ? WHERE id = ?").run(username, hash, current.id);
    return true;
  } catch {
    return false;
  }
}

export function getAuthConfig(): AuthConfig | null {
  const user = getAdminUser();
  if (!user) return null;

  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("jwt_secret") as { value: string } | undefined;
  const jwtSecret = row?.value || "default_fallback_secret_key_change_me";

  return {
    username: user.username,
    passwordHash: user.password_hash,
    jwtSecret,
  };
}

// ----------------- SETTINGS / ILO CONFIG -----------------

export function getSetting(key: string, defaultValue = ""): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? row.value : defaultValue;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
}

export function getIloConfig(): IloConfig {
  const host = getSetting("ilo_host", process.env.ILO_HOST || "");
  const sshPort = Number(getSetting("ilo_ssh_port", String(process.env.ILO_SSH_PORT || "22"))) || 22;
  const httpPort = Number(getSetting("ilo_http_port", String(process.env.ILO_HTTP_PORT || "443"))) || 443;
  const username = getSetting("ilo_username", process.env.ILO_USERNAME || "Administrator");
  const password = getSetting("ilo_password", process.env.ILO_PASSWORD || "");
  const minFanSpeed = Number(getSetting("min_fan_speed", String(process.env.MINIMUM_FAN_SPEED || "15"))) || 15;
  const maxFanSpeed = Number(getSetting("max_fan_speed", "100")) || 100;
  const mockModeStr = getSetting("mock_mode", "");
  const mockMode = mockModeStr ? mockModeStr === "true" : Boolean(process.env.MOCK_MODE === "true" || !host);
  const autoRefreshInterval = Number(getSetting("auto_refresh_interval", "5")) || 5;

  return {
    host,
    sshPort,
    httpPort,
    username,
    password,
    minFanSpeed,
    maxFanSpeed,
    mockMode,
    autoRefreshInterval,
  };
}

export function saveIloConfig(config: IloConfig): void {
  const db = getDb();
  const insertStmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  const saveMany = db.transaction(() => {
    insertStmt.run("ilo_host", config.host || "");
    insertStmt.run("ilo_ssh_port", String(config.sshPort || 22));
    insertStmt.run("ilo_http_port", String(config.httpPort || 443));
    insertStmt.run("ilo_username", config.username || "Administrator");
    if (config.password !== undefined && config.password !== null) {
      insertStmt.run("ilo_password", config.password);
    }
    insertStmt.run("min_fan_speed", String(config.minFanSpeed || 15));
    insertStmt.run("max_fan_speed", String(config.maxFanSpeed || 100));
    insertStmt.run("mock_mode", config.mockMode ? "true" : "false");
    insertStmt.run("auto_refresh_interval", String(config.autoRefreshInterval || 5));
  });

  saveMany();
}

// ----------------- PRESETS -----------------

export function getFanPresets(): FanPreset[] {
  const db = getDb();
  const rows = db.prepare("SELECT id, name, description, speeds, icon FROM presets ORDER BY rowid ASC").all() as {
    id: string;
    name: string;
    description: string;
    speeds: string;
    icon: string;
  }[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    speeds: JSON.parse(r.speeds),
    icon: r.icon,
  }));
}

export function saveFanPreset(preset: FanPreset): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO presets (id, name, description, speeds, icon) VALUES (?, ?, ?, ?, ?)").run(
    preset.id,
    preset.name,
    preset.description || "",
    JSON.stringify(preset.speeds),
    preset.icon || "Sliders"
  );
}

export function getPresets(): FanPreset[] {
  return getFanPresets();
}

export function savePresets(presets: FanPreset[]): void {
  const db = getDb();
  const deleteStmt = db.prepare("DELETE FROM presets");
  const insertStmt = db.prepare("INSERT INTO presets (id, name, description, speeds, icon) VALUES (?, ?, ?, ?, ?)");

  const saveAll = db.transaction((items: FanPreset[]) => {
    deleteStmt.run();
    for (const item of items) {
      insertStmt.run(
        item.id,
        item.name,
        item.description || "",
        JSON.stringify(item.speeds),
        item.icon || "Sliders"
      );
    }
  });

  saveAll(presets);
}

export function deleteFanPreset(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM presets WHERE id = ?").run(id);
}
