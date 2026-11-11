import {
  getIloConfig,
  saveIloConfig,
  getAuthConfig,
  getJwtSecret,
  getFanPresets,
  saveFanPreset,
  getPresets,
  savePresets,
  deleteFanPreset,
  hasAdminUser,
  createAdminUser,
  updateAdminPassword,
} from "./db";

// Re-export storage API backed by SQLite
export {
  getIloConfig,
  saveIloConfig,
  getAuthConfig,
  getJwtSecret,
  getFanPresets,
  saveFanPreset,
  getPresets,
  savePresets,
  deleteFanPreset,
  hasAdminUser,
  createAdminUser,
  updateAdminPassword,
};
