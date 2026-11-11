import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const SECRET_KEY_PATH = path.join(DATA_DIR, ".secret_key");
const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

/**
 * Lấy hoặc sinh khóa mã hóa 32-byte (256-bit).
 * Ưu tiên: process.env.ILO_ENCRYPTION_KEY -> file data/.secret_key -> tự tạo mới.
 */
export function getEncryptionKey(): Buffer {
  if (process.env.ILO_ENCRYPTION_KEY) {
    const envKey = process.env.ILO_ENCRYPTION_KEY.trim();
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    return crypto.createHash("sha256").update(envKey).digest();
  }

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(SECRET_KEY_PATH)) {
      const savedKeyHex = fs.readFileSync(SECRET_KEY_PATH, "utf-8").trim();
      if (savedKeyHex.length === 64) {
        return Buffer.from(savedKeyHex, "hex");
      }
    }

    // Tự sinh key 32-byte và lưu vào data/.secret_key
    const newKey = crypto.randomBytes(32);
    try {
      fs.writeFileSync(SECRET_KEY_PATH, newKey.toString("hex"), {
        mode: 0o600,
        encoding: "utf-8",
      });
    } catch {
      // Trên Windows mode 0o600 có thể bỏ qua
      fs.writeFileSync(SECRET_KEY_PATH, newKey.toString("hex"), { encoding: "utf-8" });
    }
    return newKey;
  } catch (err) {
    console.error("Lỗi khởi tạo encryption key:", err);
    // Fallback in-memory hash nếu không ghi được ổ đĩa
    return crypto.createHash("sha256").update("ilo_fan_default_enc_fallback").digest();
  }
}

/**
 * Mã hóa chuỗi bằng AES-256-GCM.
 * Trả về định dạng: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptPassword(plainText: string): string {
  if (!plainText) return "";
  if (plainText.startsWith(PREFIX)) return plainText; // Đã mã hóa

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV chuẩn cho GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf-8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag().toString("hex");
  return `${PREFIX}${iv.toString("hex")}:${tag}:${encrypted}`;
}

/**
 * Giải mã chuỗi bằng AES-256-GCM.
 * Nếu chuỗi chưa mã hóa (bản cũ plaintext) thì trả về nguyên bản để tự migrate.
 */
export function decryptPassword(cipherText: string): { decrypted: string; wasPlaintext: boolean } {
  if (!cipherText) return { decrypted: "", wasPlaintext: false };

  if (!cipherText.startsWith(PREFIX)) {
    // Là mật khẩu cũ chưa mã hóa
    return { decrypted: cipherText, wasPlaintext: true };
  }

  try {
    const parts = cipherText.slice(PREFIX.length).split(":");
    if (parts.length !== 3) {
      throw new Error("Định dạng dữ liệu mã hóa không hợp lệ");
    }

    const [ivHex, tagHex, encryptedHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const tag = Buffer.from(tagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf-8");
    decrypted += decipher.final("utf-8");

    return { decrypted, wasPlaintext: false };
  } catch (err) {
    console.error("Lỗi giải mã mật khẩu iLO:", err);
    return { decrypted: "", wasPlaintext: false };
  }
}
