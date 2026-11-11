# Bộ Điều Khiển Quạt & Giám Sát Nhiệt Độ HPE ProLiant DL380 Gen9 (iLO 4) 🚀

[🇻🇳 Xem bản Tiếng Việt](README.vi.md) | [🇬🇧 English Version](README.md)

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Ứng dụng web hiện đại, tối ưu giao diện tối (Dark Mode) và hỗ trợ co giãn hoàn hảo trên di động, chuyên dụng để **điều khiển tốc độ quạt và giám sát nhiệt độ máy chủ HPE ProLiant DL380 Gen9 (và Gen8)** chạy firmware **iLO 4 đã mở khóa (Fan Hack)** qua SSH và Redfish REST API.

---

## 📸 Hình Ảnh Giao Diện Thực Tế

| Tổng Quan Dashboard & Điều Khiển Master | Sơ Đồ 6 Cụm Quạt Chassis |
|:---:|:---:|
| ![Tổng quan Dashboard](docs/images/dashboard-overview.jpg) | ![Sơ đồ 6 Quạt Chassis](docs/images/fan-modules.jpg) |

| 44 Cảm Biến Nhiệt Độ Redfish Thời Gian Thực | Nhật Ký Lệnh SSH Terminal & Cảm Biến Khu Vực |
|:---:|:---:|
| ![Cảm biến nhiệt độ](docs/images/thermal-sensors-1.jpg) | ![Nhật ký lệnh Terminal](docs/images/thermal-sensors-2-logs.png) |

| Trang Cấu Hình Hệ Thống & Kết Nối iLO 4 |
|:---:|
| ![Cấu hình hệ thống](docs/images/settings-page.jpg) |

---

## ✨ Tính Năng Nổi Bật

- **Tích Hợp Giao Thức Kép (Dual-Protocol):**
  - **SSH (Fan Hack):** Gửi trực tiếp lệnh PWM (`fan p <bay_id> max <0-255>`) để kiểm soát tốc độ từng quạt riêng lẻ.
  - **Redfish REST API:** Thu thập thông số nhiệt độ thời gian thực (CPU 1, CPU 2, Nhiệt độ phòng máy / Inlet Ambient, Bộ nhớ RAM, Khe cắm PCIe...).
- **Khắc Phục Hoàn Toàn Lỗi Bắt Tay SSH Cũ (Legacy Ciphers):**
  - Tích hợp sẵn bộ thuật toán trao đổi khóa và mã hóa legacy của iLO 4 (`diffie-hellman-group14-sha1`, `diffie-hellman-group1-sha1`, `ssh-rsa`, `aes128-cbc`, `3des-cbc`), giải quyết triệt để lỗi `Handshake failed: no matching key exchange algorithm`.
- **Hỗ Trợ Đa Ngôn Ngữ Song Ngữ (i18n Anh - Việt):**
  - Chuyển đổi mượt mà giữa **Tiếng Việt (VI)** và **Tiếng Anh (EN)**.
  - Đọc cookie ngay tại Server Component (`layout.tsx`), loại bỏ hoàn toàn hiện tượng nháy ngôn ngữ (Hydration mismatch).
  - Khung nhật ký Terminal tự động dịch đổi ngôn ngữ theo thời gian thực cho toàn bộ log cũ và mới.
- **Bảng Điều Khiển 6 Quạt Chassis DL380 Gen9:**
  - Điều chỉnh từng quạt với thanh trượt mượt mà kèm hiệu ứng đồ họa cánh quạt quay theo tốc độ thực.
  - **Thanh trượt Master Sync:** Đồng bộ cả 6 quạt cùng lúc với cơ chế phát lệnh SSH tuần tự (sequential pulse), chống sốc dòng điện khởi động trên nguồn máy chủ 500W/800W.
- **Hồ Sơ Làm Mát Cài Đặt Sẵn (Fan Presets):**
  - **Preset hệ thống:** Ultra Quiet / Êm ái (15%), Balanced / Cân bằng (30%), Performance / Tải nặng (60%), Turbine Boost (100%).
  - **Preset tùy chỉnh:** Người dùng tự tạo, đặt tên, ghi chú và xóa hồ sơ theo nhu cầu thực tế.
- **Cơ Chế Khóa An Toàn Ngưỡng Tối Thiểu:**
  - Thiết lập ngưỡng tốc độ an toàn (mặc định 15% - 20%), ngăn chặn người dùng vô tình kéo quạt xuống mức quá thấp gây quá nhiệt linh kiện.
- **Khung Nhật Ký Lệnh Trực Tiếp (Action Terminal):**
  - Theo dõi chi tiết từng dòng lệnh gửi tới SSH iLO và kết quả phản hồi của phần cứng.
- **Chế Độ Giả Lập (Mock Simulation):**
  - Chế độ demo cho phép dùng thử giao diện khi máy chủ thật đang tắt nguồn hoặc bảo trì.
- **Giao Diện Di Động Hoàn Hảo (< 640px):**
  - Tối ưu kích thước trên màn hình điện thoại (360px, 390px, 768px, 1280px), không bao giờ bị tràn hay xuất hiện thanh cuộn ngang.
- **Lưu Trữ Tự Động Bằng SQLite:**
  - Lưu trữ tài khoản, mật khẩu mã hóa và cấu hình trong tệp `/app/data/app.db`. Không cần cài đặt MySQL hay PostgreSQL bên ngoài.

---

## 🛠️ Yêu Cầu Hệ Thống

1. **Phần cứng:**
   - Máy chủ HPE ProLiant DL380 Gen9 (hoặc các dòng Gen8 tương thích) có cổng mạng iLO 4 chuyên dụng.
2. **Firmware:**
   - Firmware iLO 4 đã được cài đặt bản vá mở khóa quạt (ví dụ: [kendallgoto/ilo4_unlock](https://github.com/kendallgoto/ilo4_unlock) v2.77 Fan Hack).
3. **Phần mềm:**
   - [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/).

---

## 🚀 Triển Khai Nhanh Bằng Docker

Bạn **không cần** ghi mật khẩu hoặc IP máy chủ vào file compose. Toàn bộ thông tin sẽ được cấu hình trực quan qua giao diện web lần đầu khởi chạy và lưu vào thư mục `./data`.

### 1. Sử dụng Docker Compose (Khuyên Dùng)

Tạo file `docker-compose.yml`:

```yaml
version: "3.8"

services:
  ilo-fan-controller:
    image: ghcr.io/vietnamvps/ilo-fan-controller:latest
    container_name: ilo-fan-controller
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
```

Khởi chạy container:

```bash
docker compose up -d
```

### 2. Sử dụng Docker CLI

```bash
docker run -d \
  --name ilo-fan-controller \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  ghcr.io/vietnamvps/ilo-fan-controller:latest
```

---

## 🧭 Hướng Dẫn Sử Dụng Lần Đầu

1. Mở trình duyệt và truy cập:
   ```text
   http://<IP-MÁY-CHỦ-CỦA-BẠN>:3000
   ```
2. **Trang Khởi Tạo Hệ Thống Lần Đầu (`/setup`):**
   - Tạo tài khoản Quản trị viên Web (Tên đăng nhập & Mật khẩu).
   - Nhập thông số iLO 4 (Địa chỉ IP Dedicated iLO, Cổng SSH 22, Tài khoản & Mật khẩu quản trị iLO).
   - Bấm **Hoàn tất cài đặt & Vào Dashboard**.
3. **Kiểm Tra & Lưu Cấu Hình (`/settings`):**
   - Bấm nút **Test Kết nối iLO** để kiểm tra đồng thời Redfish REST API (443) và SSH Fan Hack (22).
   - Nếu đang bật Chế độ Mô phỏng (Mock Mode), gạt tắt nút để bắt đầu điều khiển phần cứng thật.

---

## ⚙️ Cơ Chế Điều Khiển Quạt iLO 4

Trên firmware iLO 4 Fan Hack, các lệnh điều khiển quạt được thực thi trực tiếp qua phiên SSH:

```bash
fan p <bay_id> max <pwm_value>
```

- **Bay ID:** Từ `0` đến `5` tương ứng với Quạt 1 đến Quạt 6 trên cụm quạt máy chủ DL380 Gen9.
- **Giá trị PWM:** Từ `0` (dừng) đến `255` (100% công suất quạt).
  - `15%` ≈ PWM `38` (Vô cùng êm ái, thích hợp phòng ngủ / văn phòng)
  - `30%` ≈ PWM `76` (Cân bằng nhiệt độ và âm lượng)
  - `60%` ≈ PWM `153` (Làm mát mạnh khi render, máy ảo tải cao)
  - `100%` = PWM `255` (Turbine tối đa công suất)

> **Lưu ý khi lắp Card PCIe rời:** Khi cắm card PCIe bên thứ ba (GPU NVIDIA, Card mạng quang 10GbE SFP+...), iLO 4 mặc định sẽ hú còi quạt ở mức 60% - 100% vì lo ngại quá nhiệt. Ứng dụng này sẽ ghi đè và cố định mức quạt theo ý muốn của bạn mà không bị tự ý tăng tốc.

---

## 📦 Biên Dịch Từ Mã Nguồn (Build from Source)

```bash
# Tải mã nguồn về máy
git clone https://github.com/vietnamvps/ilo-fan-controller.git
cd ilo-fan-controller

# Đóng gói và chạy bằng Docker Compose
docker compose build --no-cache
docker compose up -d
```

### Chạy Môi Trường Phát Triển (Local Dev)

```bash
# Cài đặt thư viện
npm install

# Khởi chạy server phát triển
npm run dev

# Kiểm tra cú pháp TypeScript
npx tsc --noEmit

# Đối soát bộ từ khóa đa ngôn ngữ
node scripts/check-i18n.js
```

---

## 🗂️ Cấu Trúc Thư Mục Dự Án

```text
├── src/
│   ├── app/
│   │   ├── api/             # API Routes (auth, fans, presets, thermal, config)
│   │   ├── login/           # Giao diện Đăng nhập quản trị
│   │   ├── setup/           # Trình khởi tạo hệ thống lần đầu
│   │   ├── settings/        # Cấu hình iLO 4 & Đổi mật khẩu
│   │   ├── layout.tsx       # Root layout đọc cookie ngôn ngữ phía server
│   │   └── page.tsx         # Bảng điều khiển Quạt & Nhiệt độ thời gian thực
│   ├── components/          # Components tái sử dụng (FanCard, Header, ThermalGrid...)
│   ├── contexts/            # LanguageContext (Quản lý đa ngôn ngữ VI/EN)
│   ├── lib/                 # Module SSH/Redfish (ilo.ts), SQLite (db.ts), i18n core
│   ├── locales/             # File từ điển vi.json & en.json
│   └── types/               # TypeScript interfaces & types
├── scripts/
│   └── check-i18n.js        # Script tự động kiểm tra đối soát key parity
├── Dockerfile               # Đóng gói Docker multi-stage standalone
└── docker-compose.yml       # File chạy Docker compose mẫu
```

---

## 🔒 Bảo Mật & Quyền Riêng Tư

- Mật khẩu đăng nhập được mã hóa muối bằng thuật toán bcrypt an toàn.
- Thông tin đăng nhập iLO được lưu trữ an toàn trong SQLite cục bộ (`/app/data/app.db`).
- Phiên đăng nhập được quản lý bằng `httpOnly` cookie bảo mật.
- 100% chạy trên mạng nội bộ cục bộ, không gửi dữ liệu ra bên ngoài.

---

## 📄 Giấy Phép (License)

Dự án được phân phối mã nguồn mở theo giấy phép [MIT License](LICENSE).
