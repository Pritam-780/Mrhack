# Mrhack

Mrhack is a Node.js-based information collection tool. It uses Express and EJS to gather **device info**, **location**, and **browser details** from users when they visit a link.

> **For educational and ethical testing only.**

---

## What It Does

- **Collects Device Info:** OS, browser, screen size, platform, language.
- **Captures Geolocation:** Latitude and longitude via browser.
- **Logs Visitor Data:** All data is shown on your terminal in real-time.
- **Generates Custom Links** to trick users into clicking (optional).

---

## How It Works

1. User opens a generated link (e.g., `http://your-ip:3000/generate?url=facebook.com`)
2. They are shown a fake page while device and location data is captured.
3. Data is logged on your Termux/Linux console.
4. User is redirected to the real site (like Facebook).

---

## Files Description

| File             | Purpose                                  |
|------------------|-------------------------------------------|
| `index.js`       | Main server file (Express routes & logic) |
| `device-info.ejs`| Collects device/browser data              |
| `location.ejs`   | Captures location using JS geolocation API|
| `name.ejs`       | Fake loading page                         |
| `generate.ejs`   | Generates link previews                   |
| `package.json`   | Node dependencies and config              |

---

## How To Run (on Termux or Linux)

### 1. Install Node.js & Git
#### 2.  Clone the Repository
```bash
pkg update && pkg upgrade
pkg install nodejs git
git clone https://github.com/Pritam-780/Mrhack.git
cd Mrhack
npm install
node index.js
