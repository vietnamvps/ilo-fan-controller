export interface FanStatus {
  name: string; // e.g., "Fan 1", "Fan 2", ... "Fan 6"
  index: number; // 0..5
  speed: number; // Percentage 0..100
  status: "OK" | "Warning" | "Critical" | "Unknown";
  units?: string;
}

export interface TempSensor {
  name: string; // e.g., "01-Inlet Ambient", "02-CPU 1", "03-CPU 2", "04-Memory", etc.
  temperature: number; // Celsius
  criticalThreshold?: number;
  status: "OK" | "Warning" | "Critical";
}

export interface ServerThermalData {
  fans: FanStatus[];
  temperatures: TempSensor[];
  lastUpdated: string;
  serverModel: string;
  iloFirmware: string;
  isMock: boolean;
}

export interface FanPreset {
  id: string;
  name: string;
  description?: string;
  speeds: number[]; // Array of speeds for Fan 1..6, or single number for all
  icon?: string;
}

export interface IloConfig {
  host: string;
  sshPort: number;
  httpPort: number;
  username: string;
  password?: string;
  minFanSpeed: number; // Safe minimum fan limit, e.g. 15%
  maxFanSpeed: number; // Safe maximum fan limit, e.g. 100%
  mockMode: boolean;
  autoRefreshInterval: number; // In seconds
}

export interface AuthConfig {
  username: string;
  passwordHash: string;
  jwtSecret: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warn" | "error";
  message: string;
}
