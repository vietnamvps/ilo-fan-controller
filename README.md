# HP ProLiant iLO Fan Controller 🚀

Giao diện Web hiện đại điều khiển quạt và giám sát nhiệt độ máy chủ HP ProLiant DL380 G9 qua iLO 4 (SSH & Redfish REST API).

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

---

## ⚡ Triển khai siêu nhanh bằng Docker

Bạn **không cần nhập IP hay mật khẩu vào docker-compose**. Toàn bộ cấu hình iLO sẽ được nhập trực tiếp qua trang quản trị Web UI và tự động lưu vào ổ đĩa qua volume `./data`.

### 1. Sử dụng Docker Run
```bash
docker run -d \
  --name ilo-fan-controller \
  --restart unless-stopped \
  -p 3000:3000 \
  -v ./data:/app/data \
  ghcr.io/vietnamvps/ilo-fan-controller:latest
```

### 2. Sử dụng Docker Compose
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
Khởi chạy:
```bash
docker compose up -d
```

---

## 🧭 Hướng dẫn sử dụng lần đầu

1. Mở trình duyệt: `http://<IP-server-của-bạn>:3000`
2. Đăng nhập tài khoản quản trị mặc định:
   - **Tài khoản:** `admin`
   - **Mật khẩu:** `admin123`
3. Vào mục **Cấu hình iLO (Settings)** trên thanh menu:
   - Nhập **Địa chỉ IP máy chủ iLO**
   - Nhập **Tài khoản** & **Mật khẩu iLO**
   - Bấm nút **"Kiểm tra kết nối iLO"** (hệ thống sẽ test cả SSH và Redfish REST API)
   - Bấm **"Lưu cấu hình"**.
4. Quay lại Dashboard để điều khiển quạt và giám sát nhiệt độ theo thời gian thực!
