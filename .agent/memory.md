# Project Memory: HP ProLiant DL380 Gen9 Fan Controller

## 1. Internationalization (i18n) Architecture
- **Phương án kiến trúc:** Lightweight `LanguageContext` + JSON dictionaries (`src/locales/vi.json`, `src/locales/en.json`). Không dùng dynamic routing `/[locale]` hay dependency bên ngoài để tránh làm thay đổi cấu trúc URL và API routes.
- **Ngôn ngữ mặc định:** Tiếng Việt (`vi`).
- **Ngôn ngữ phụ:** Tiếng Anh (`en`).
- **Nguồn chân lý (Source of Truth):** Cookie `NEXT_LOCALE` (được đọc ở Server Component `src/app/layout.tsx` bằng `cookies()`), sau đó truyền `initialLocale` vào `<LanguageProvider>`. Client tự động đồng bộ sang `localStorage` để dự phòng.
- **Tránh Flash/Hydration mismatch:** Thuộc tính `<html lang={locale}>` và server-side metadata `generateMetadata()` sử dụng helper `getServerTranslation(locale)` đọc trực tiếp từ JSON dictionary trên server.

## 2. Vị trí File & Cấu trúc Thư mục Ngôn ngữ
```text
src/
├── locales/
│   ├── vi.json          # Dictionary Tiếng Việt (gốc)
│   └── en.json          # Dictionary Tiếng Anh
├── lib/
│   └── i18n.ts          # Core logic translate(), fallback, getServerTranslation()
├── contexts/
│   └── LanguageContext.tsx  # React Context & hook useTranslation()
├── components/
│   └── LanguageSwitcher.tsx # Nút chuyển đổi VI | EN với Icon quả địa cầu
scripts/
└── check-i18n.js        # Script kiểm tra đối soát 100% key parity giữa vi và en
```

## 3. Quy ước Đặt Key
- Sử dụng dot-notation dạng lồng nhau theo module / component:
  - `meta.*`: Tiêu đề và mô tả trang trong metadata.
  - `common.*`: Các nhãn dùng chung (`common.save`, `common.cancel`, `common.loading`,...).
  - `auth.login.*`: Trang đăng nhập (`/login`).
  - `auth.setup.*`: Trang khởi tạo tài khoản lần đầu (`/setup`).
  - `dashboard.chassis.*`: Thông số tổng quan server ở đầu Dashboard.
  - `dashboard.banners.*`: Banner cảnh báo Mock mode hoặc lỗi kết nối iLO.
  - `dashboard.fans.*`: Bảng điều khiển 6 quạt, Master slider và `fanCard.*`.
  - `dashboard.presets.*`: Quản lý các cấu hình preset làm mát nhanh.
  - `dashboard.sensors.*`: Cảm biến nhiệt độ phần cứng Redfish.
  - `dashboard.logs.*`: Nhật ký lệnh SSH Terminal.
  - `dashboard.modal.*`: Modal tạo preset tùy chỉnh mới.
  - `settings.*`: Trang cấu hình hệ thống & kết nối iLO 4 (`/settings`).
- **Placeholder động:** Sử dụng `{param}` thay vì nối chuỗi (ví dụ: `"{active} / {total} Quạt"`, `t("dashboard.chassis.fansCount", { active: 6, total: 6 })`).

## 4. Hướng dẫn Thêm Key Mới
1. Thêm key vào cả 2 file `src/locales/vi.json` và `src/locales/en.json` cùng cấp cấu trúc JSON.
2. Chạy lệnh kiểm tra đối soát:
   ```bash
   node scripts/check-i18n.js
   ```
   Script sẽ báo lỗi nếu thiếu key ở một trong hai file hoặc thừa key.
3. Trong component:
   ```tsx
   import { useTranslation } from "@/contexts/LanguageContext"; // hoặc relative path ../contexts/LanguageContext
   
   export default function MyComponent() {
     const { t } = useTranslation();
     return <h1>{t("dashboard.fans.title")}</h1>;
   }
   ```

## 5. Hướng dẫn Thêm Ngôn ngữ Mới (ví dụ: `ja` hoặc `zh`)
1. Tạo file từ điển mới: `src/locales/<mã_locale>.json` với toàn bộ key tương tự `vi.json`.
2. Khai báo mã ngôn ngữ trong `src/lib/i18n.ts`:
   - Thêm vào type `Locale`: `export type Locale = "vi" | "en" | "<mã_locale>";`
   - Import file từ điển và đưa vào object `dictionaries`.
   - Cập nhật mảng `SUPPORTED_LOCALES`.
3. Cập nhật `src/components/LanguageSwitcher.tsx` để hiển thị thêm lựa chọn ngôn ngữ mới.
4. Chạy `node scripts/check-i18n.js` để kiểm tra tính toàn vẹn.

## 6. Nguyên tắc Bất biến Nghiệp vụ (Business Logic Safety)
- **Preset mặc định:** Không sửa schema database và không sửa DB seed trong `src/lib/db.ts`. Việc dịch chỉ thực hiện ở tầng hiển thị UI bằng cách ánh xạ ID preset mặc định (`silent`, `balanced`, `performance`, `turbine`) sang `t("dashboard.presets.items.<id>.name")`.
- **Thông số kỹ thuật & Log:** Không dịch chuỗi lệnh SSH thực tế (`fan p <n> max <pwm>`), mã lỗi kỹ thuật nội bộ, tên thương hiệu (`HPE`, `iLO`, `DL380 Gen9`), đơn vị kỹ thuật (`rpm`, `°C`, `%`).
