# HP ProLiant iLO Fan Controller 🚀

Modern Web UI & SSH/Redfish Controller for HP ProLiant DL380 G9 (iLO 4) Servers.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- 🎛️ **Individual & Master Fan Control:** Đặt tốc độ 6 quạt độc lập hoặc đồng loạt qua Master Slider.
- 🌡️ **Thermal & Hardware Monitoring:** Lấy thông số nhiệt độ thời gian thực (CPU, RAM, Ambient, PCIe,...) qua Redfish API.
- ⚡ **Preset Profiles:** Cấu hình quạt mẫu sẵn (Ultra Quiet 15%, Balanced 30%, Performance 60%, Turbine 100%) và lưu cấu hình tùy chỉnh.
- 💻 **Real-time Terminal Logs:** Theo dõi chi tiết các lệnh SSH gửi tới iLO.
- 🔐 **Authentication & Security:** Bảo vệ bằng JWT session, mã hóa mật khẩu Bcrypt.
- 🐳 **Docker Multi-Arch Ready:** Hỗ trợ chạy Docker trên cả `linux/amd64` và `linux/arm64`.

---

## 🐳 Quick Start with Docker (Chạy trực tiếp từ GitHub)

Sau khi image được tự động build qua GitHub Actions, bạn có thể chạy trên server mà không cần cài Node.js hay clone mã nguồn:

### Cách 1: Sử dụng Docker Run
```bash
docker run -d \
  --name ilo-fan-controller \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data \
  -e ILO_HOST="192.168.1.100" \
  -e ILO_USERNAME="Administrator" \
  -e ILO_PASSWORD="your_ilo_password" \
  ghcr.io/vietnamvps/ilo-fan-controller:latest
```

### Cách 2: Sử dụng Docker Compose
Tạo một file `docker-compose.yml` trên server của bạn:

```yaml
version: "3.8"

services:
  ilo-fan-controller:
    image: ghcr.io/vietnamvps/ilo-fan-controller:latest
    container_name: ilo-fan-controller
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - ILO_HOST=192.168.1.100
      - ILO_USERNAME=Administrator
      - ILO_PASSWORD=your_ilo_password
      - MINIMUM_FAN_SPEED=15
    volumes:
      - ./data:/app/data
```

Chạy lệnh:
```bash
docker compose up -d
```

Truy cập: `http://<IP-SERVER>:3000`
- **Tài khoản mặc định:** `admin`
- **Mật khẩu mặc định:** `admin123`

---

## 🛠️ Development & Local Run

```bash
# Cài đặt thư viện
pnpm install

# Khởi chạy server dev
pnpm dev

# Build production
pnpm build
pnpm start
```
