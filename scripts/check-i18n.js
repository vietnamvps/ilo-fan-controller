const fs = require("fs");
const path = require("path");

const viPath = path.join(__dirname, "../src/locales/vi.json");
const enPath = path.join(__dirname, "../src/locales/en.json");

if (!fs.existsSync(viPath) || !fs.existsSync(enPath)) {
  console.error("❌ Lỗi: Không tìm thấy file vi.json hoặc en.json!");
  process.exit(1);
}

const viData = JSON.parse(fs.readFileSync(viPath, "utf-8"));
const enData = JSON.parse(fs.readFileSync(enPath, "utf-8"));

function flattenKeys(obj, prefix = "") {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(flattenKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const viKeys = new Set(flattenKeys(viData));
const enKeys = new Set(flattenKeys(enData));

const missingInEn = [...viKeys].filter((k) => !enKeys.has(k));
const missingInVi = [...enKeys].filter((k) => !viKeys.has(k));

console.log(`\n🔍 Kiểm tra đối soát từ khóa i18n:`);
console.log(`   - Tổng số keys Tiếng Việt (vi.json): ${viKeys.size}`);
console.log(`   - Tổng số keys Tiếng Anh  (en.json): ${enKeys.size}`);

let hasError = false;

if (missingInEn.length > 0) {
  hasError = true;
  console.error(`\n❌ Thiếu ${missingInEn.length} key trong en.json:`);
  missingInEn.forEach((k) => console.error(`   - ${k}`));
}

if (missingInVi.length > 0) {
  hasError = true;
  console.error(`\n❌ Thiếu ${missingInVi.length} key trong vi.json:`);
  missingInVi.forEach((k) => console.error(`   - ${k}`));
}

if (!hasError) {
  console.log(`\n✅ HOÀN TOÀN TRÙNG KHỚP! Bộ key giữa vi.json và en.json đồng bộ 100% (${viKeys.size} keys).\n`);
  process.exit(0);
} else {
  process.exit(1);
}
