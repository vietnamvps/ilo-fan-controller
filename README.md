# HPE ProLiant DL380 Gen9 (iLO 4) Fan Controller & Thermal Monitor 🚀

[🇻🇳 Xem bản Tiếng Việt](README.vi.md) | [🇬🇧 English Version](README.md)

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A modern, responsive web application designed for **HPE ProLiant DL380 Gen9 (and Gen8)** servers running patched **iLO 4** firmware. It provides granular fan speed control via SSH and real-time hardware thermal monitoring via the Redfish REST API.

---

## ✨ Features

- **Dual-Protocol Hardware Integration:**
  - **SSH (Fan Hack):** Sends raw PWM commands (`fan p <bay_id> max <0-255>`) to control individual fan bays directly.
  - **Redfish REST API:** Telemetry polling for real-time temperatures (CPUs, Ambient/Inlet, Memory, PCIe slots, etc.).
- **Legacy SSH Ciphers & Handshake Compatibility:**
  - Built-in support for iLO 4 legacy key exchange (`diffie-hellman-group14-sha1`, `diffie-hellman-group1-sha1`), ciphers (`aes128-cbc`, `3des-cbc`), and host keys (`ssh-rsa`), completely resolving connection handshake errors.
- **Bilingual Interface (i18n):**
  - Instant switching between **English (EN)** and **Tiếng Việt (VI)**.
  - Zero hydration flash (server-side cookie reading).
  - Dynamically translated action logs.
- **Chassis 6-Fan Control:**
  - Individual fan sliders with immediate preview and real-time spinning tachometer animation.
  - **Master Sync Slider:** Set all 6 fans simultaneously with sequential SSH dispatch to prevent inrush current surges on power supplies.
- **Cooling Profiles (Presets):**
  - **Built-in Presets:** Ultra Quiet (Silent 15%), Balanced (30%), Performance (60%), Turbine Boost (100%).
  - **Custom Presets:** Save and manage custom fan curves directly from the UI.
- **Safety Safeguards:**
  - Configurable minimum safe fan speed (default: 15% - 20%) to prevent hardware damage.
- **Live Terminal Log:**
  - Real-time SSH and REST execution log with color-coded status codes.
- **Mock Simulation Mode:**
  - Built-in simulation mode to test UI and workflows without touching physical server hardware.
- **Responsive Dark Mode UI:**
  - Optimized for desktop, tablet, and mobile devices (< 640px) without horizontal overflow.
- **Zero-Config Persistent Storage:**
  - Embedded SQLite database stored in `/app/data/app.db`. No external database required.

---

## 🛠️ Prerequisites

1. **Hardware:**
   - HPE ProLiant DL380 Gen9 (or compatible Gen8 server) equipped with iLO 4.
2. **Firmware:**
   - Patched iLO 4 firmware unlocking fan speed commands (e.g., [kendallgoto/ilo4_unlock](https://github.com/kendallgoto/ilo4_unlock) v2.77 Fan Hack).
3. **Software:**
   - [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/).

---

## 🚀 Quick Start (Docker)

You **do not** need to expose passwords or IPs in your compose file. Everything is securely configured via the web interface during first-time setup and persisted into `./data`.

### 1. Using Docker Compose (Recommended)

Create `docker-compose.yml`:

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

Start the container:

```bash
docker compose up -d
```

### 2. Using Docker CLI

```bash
docker run -d \
  --name ilo-fan-controller \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  ghcr.io/vietnamvps/ilo-fan-controller:latest
```

---

## 🧭 Initial Setup Wizard

1. Open your browser and navigate to:
   ```text
   http://<YOUR_SERVER_IP>:3000
   ```
2. **First-time Onboarding (`/setup`):**
   - Create your administrator account (Username & Password).
   - Enter your iLO 4 connection details (Dedicated iLO IP, SSH port 22, iLO Username & Password).
   - Click **Complete Setup & Enter Dashboard**.
3. **Settings & Verification (`/settings`):**
   - Click **Test iLO Connection** to verify both Redfish REST API (443) and SSH Fan Hack (22).
   - If Mock Mode is enabled, toggle it OFF once the connection test succeeds.

---

## ⚙️ Fan Control Mechanics

On patched iLO 4 firmware, fan control commands are dispatched via SSH:

```bash
fan p <bay_id> max <pwm_value>
```

- **Bay ID:** `0` to `5` corresponding to Fan 1 through Fan 6 in the DL380 Gen9 chassis.
- **PWM Value:** `0` (stopped) to `255` (100% duty cycle).
  - `15%` ≈ PWM `38`
  - `30%` ≈ PWM `76`
  - `60%` ≈ PWM `153`
  - `100%` = PWM `255`

> **Note on PCIe Third-Party Cards:** Installing non-HPE PCIe cards (such as NVIDIA GPUs or 10GbE SFP+ NICs) typically triggers iLO 4's aggressive thermal algorithm, causing fans to spin at 60-100% permanently. This application overrides those limits and locks fan speeds at your designated quiet levels.

---

## 📦 Building From Source

```bash
# Clone the repository
git clone https://github.com/vietnamvps/ilo-fan-controller.git
cd ilo-fan-controller

# Build and start via Docker Compose
docker compose build --no-cache
docker compose up -d
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run type check
npx tsc --noEmit

# Check i18n key parity
node scripts/check-i18n.js
```

---

## 🗂️ Project Structure

```text
├── src/
│   ├── app/
│   │   ├── api/             # Next.js API Routes (auth, fans, presets, thermal, config)
│   │   ├── login/           # Administrator login page
│   │   ├── setup/           # First-time onboarding wizard
│   │   ├── settings/        # iLO 4 configuration & password management
│   │   ├── layout.tsx       # Root layout with SSR locale detection
│   │   └── page.tsx         # Real-time Fan & Thermal Dashboard
│   ├── components/          # Reusable UI components (FanCard, Header, ThermalGrid, etc.)
│   ├── contexts/            # LanguageContext (VI / EN provider)
│   ├── lib/                 # SSH/Redfish handlers (ilo.ts), SQLite database (db.ts), i18n
│   ├── locales/             # vi.json & en.json dictionaries
│   └── types/               # TypeScript interfaces & types
├── scripts/
│   └── check-i18n.js        # Automated i18n key parity verifier
├── Dockerfile               # Multi-stage standalone production build
└── docker-compose.yml       # Production deployment specification
```

---

## 🔒 Security

- Passwords are encrypted using salted bcrypt hashes in SQLite.
- iLO credentials are encrypted at rest with local hardware keys.
- Session tokens are stored in `httpOnly` secure cookies.
- No telemetry or external cloud calls; 100% self-hosted on your local network.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
