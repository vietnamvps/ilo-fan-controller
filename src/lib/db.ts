import path from "path";
import fs from "fs";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { AuthConfig, IloConfig, FanPreset } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

async function getSQL(): Promise<SqlJsStatic> {
  if (SQL) return SQL;
  SQL = await initSqlJs();
  return SQL;
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const sql = await getSQL();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      dbInstance = new sql.Database(fileBuffer);
    } catch (err) {
      console.error("Corrupt db file, creating new:", err);
      dbInstance = new sql.Database();
    }
  } else {
    dbInstance = new sql.Database();
  }

  initDb(dbInstance);
  saveDb(dbInstance);
  return dbInstance;
}

function saveDb(db: Database) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error("Error saving SQLite database to disk:", err);
  }
}

function initDb(db: Database) {
  // Table: users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table: settings (Key-Value)
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Table: presets
  db.run(`
    CREATE TABLE IF NOT EXISTS presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      speeds TEXT NOT NULL,
      icon TEXT
    );
  `);

  // Ensure JWT secret exists in settings
  const checkSecret = db.exec("SELECT value FROM settings WHERE key = 'jwt_secret'");
  if (!checkSecret.length || !checkSecret[0].values.length) {
    const newSecret = crypto.randomBytes(32).toString("hex");
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('jwt_secret', ?)", [newSecret]);
  }

  // Seed default presets if empty
  seedDefaultPresets(db);
}

// Default Presets for HP ProLiant DL380 G9
function seedDefaultPresets(db: Database) {
  const checkPresets = db.exec("SELECT COUNT(*) as count FROM presets");
  const count = checkPresets.length && checkPresets[0].values.length ? (checkPresets[0].values[0][0] as number) : 0;

  if (count === 0) {
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

    for (const item of defaults) {
      db.run("INSERT INTO presets (id, name, description, speeds, icon) VALUES (?, ?, ?, ?, ?)", [
        item.id,
        item.name,
        item.description,
        item.speeds,
        item.icon,
      ]);
    }
  }
}

// ----------------- USER & AUTH -----------------

export async function hasAdminUser(): Promise<boolean> {
  const db = await getDb();
  const res = db.exec("SELECT COUNT(*) FROM users");
  if (!res.length || !res[0].values.length) return false;
  return (res[0].values[0][0] as number) > 0;
}

export async function getAdminUser(): Promise<{ id: number; username: string; password_hash: string } | null> {
  const db = await getDb();
  const res = db.exec("SELECT id, username, password_hash FROM users ORDER BY id ASC LIMIT 1");
  if (!res.length || !res[0].values.length) return null;
  const row = res[0].values[0];
  return {
    id: row[0] as number,
    username: row[1] as string,
    password_hash: row[2] as string,
  };
}

export async function createAdminUser(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const hasUser = await hasAdminUser();
  if (hasUser) {
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
    const db = await getDb();
    db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [cleanUsername, passwordHash]);
    saveDb(db);
    return { success: true };
  } catch (err) {
    return { success: false, error: "Lỗi tạo tài khoản: " + (err instanceof Error ? err.message : String(err)) };
  }
}

export async function updateAdminPassword(newPassword: string, newUsername?: string): Promise<boolean> {
  const current = await getAdminUser();
  if (!current) return false;

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(newPassword, salt);
  const username = newUsername?.trim() || current.username;

  try {
    const db = await getDb();
    db.run("UPDATE users SET username = ?, password_hash = ? WHERE id = ?", [username, hash, current.id]);
    saveDb(db);
    return true;
  } catch {
    return false;
  }
}

export async function getAuthConfig(): Promise<AuthConfig | null> {
  const user = await getAdminUser();
  if (!user) return null;

  const db = await getDb();
  const res = db.exec("SELECT value FROM settings WHERE key = 'jwt_secret'");
  const jwtSecret = res.length && res[0].values.length ? (res[0].values[0][0] as string) : "fallback_secret_jwt";

  return {
    username: user.username,
    passwordHash: user.password_hash,
    jwtSecret,
  };
}

// ----------------- SETTINGS / ILO CONFIG -----------------

export async function getSetting(key: string, defaultValue = ""): Promise<string> {
  const db = await getDb();
  const res = db.exec(`SELECT value FROM settings WHERE key = '${key}'`);
  if (!res.length || !res[0].values.length) return defaultValue;
  return res[0].values[0][0] as string;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
  saveDb(db);
}

export async function getIloConfig(): Promise<IloConfig> {
  const host = await getSetting("ilo_host", process.env.ILO_HOST || "");
  const sshPort = Number(await getSetting("ilo_ssh_port", String(process.env.ILO_SSH_PORT || "22"))) || 22;
  const httpPort = Number(await getSetting("ilo_http_port", String(process.env.ILO_HTTP_PORT || "443"))) || 443;
  const username = await getSetting("ilo_username", process.env.ILO_USERNAME || "Administrator");
  const password = await getSetting("ilo_password", process.env.ILO_PASSWORD || "");
  const minFanSpeed = Number(await getSetting("min_fan_speed", String(process.env.MINIMUM_FAN_SPEED || "15"))) || 15;
  const maxFanSpeed = Number(await getSetting("max_fan_speed", "100")) || 100;
  const mockModeStr = await getSetting("mock_mode", "");
  const mockMode = mockModeStr ? mockModeStr === "true" : Boolean(process.env.MOCK_MODE === "true" || !host);
  const autoRefreshInterval = Number(await getSetting("auto_refresh_interval", "5")) || 5;

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

export async function saveIloConfig(config: IloConfig): Promise<void> {
  const db = await getDb();
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('ilo_host', ?)", [config.host || ""]);
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('ilo_ssh_port', ?)", [String(config.sshPort || 22)]);
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('ilo_http_port', ?)", [String(config.httpPort || 443)]);
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('ilo_username', ?)", [config.username || "Administrator"]);
  if (config.password !== undefined && config.password !== null) {
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('ilo_password', ?)", [config.password]);
  }
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('min_fan_speed', ?)", [String(config.minFanSpeed || 15)]);
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('max_fan_speed', ?)", [String(config.maxFanSpeed || 100)]);
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('mock_mode', ?)", [config.mockMode ? "true" : "false"]);
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('auto_refresh_interval', ?)", [String(config.autoRefreshInterval || 5)]);
  saveDb(db);
}

// ----------------- PRESETS -----------------

export async function getFanPresets(): Promise<FanPreset[]> {
  const db = await getDb();
  const res = db.exec("SELECT id, name, description, speeds, icon FROM presets");
  if (!res.length || !res[0].values.length) return [];

  return res[0].values.map((row) => ({
    id: row[0] as string,
    name: row[1] as string,
    description: row[2] as string,
    speeds: JSON.parse(row[3] as string),
    icon: row[4] as string,
  }));
}

export async function getPresets(): Promise<FanPreset[]> {
  return getFanPresets();
}

export async function saveFanPreset(preset: FanPreset): Promise<void> {
  const db = await getDb();
  db.run("INSERT OR REPLACE INTO presets (id, name, description, speeds, icon) VALUES (?, ?, ?, ?, ?)", [
    preset.id,
    preset.name,
    preset.description || "",
    JSON.stringify(preset.speeds),
    preset.icon || "Sliders",
  ]);
  saveDb(db);
}

export async function savePresets(presets: FanPreset[]): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM presets");
  for (const item of presets) {
    db.run("INSERT INTO presets (id, name, description, speeds, icon) VALUES (?, ?, ?, ?, ?)", [
      item.id,
      item.name,
      item.description || "",
      JSON.stringify(item.speeds),
      item.icon || "Sliders",
    ]);
  }
  saveDb(db);
}

export async function deleteFanPreset(id: string): Promise<void> {
  const db = await getDb();
  db.run("DELETE FROM presets WHERE id = ?", [id]);
  saveDb(db);
}
