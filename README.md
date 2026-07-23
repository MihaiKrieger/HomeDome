# HomeDome Device Tracker

**HomeDome Device Tracker** is a self-hosted, full-stack asset management application designed to organize, document, and manage smart home hardware, IoT devices, network infrastructure, and power peripherals.

---

## 🌟 Key Features

- **Device Lifecycle & Inventory Tracking**
  - Track name, location, operational status, serial number, MAC address, network assignment, IP allocation (DHCP/Static), hardware connection interface, purchase price (RON), commissioning date, battery specifications, and Matter certification codes.
- **Multi-Device Relationship Graph**
  - Establish multi-device links between hardware (e.g., parent routers, mesh nodes, replacement products, attached sensors, or power supplies).
  - Bidirectional relationship visibility: view both **Linked Devices (Outgoing)** and **Referenced By (Incoming)** relationships with quick navigation.
- **Dynamic Custom Fields**
  - Add text, numeric, or boolean custom parameters on the fly to tailor tracking to specialized IoT equipment.
- **Taxonomy Management**
  - Manage locations, mesh/WiFi networks, and battery types dynamically across your home setup.
- **Audit Logs & Comments System**
  - Maintain historical log entries for commissioning, maintenance, location shifts, and manual notes per device.
- **Analytics & Insights**
  - Visual breakdown charts using Recharts for network distribution, device status counts, and location allocations.
- **CSV Data Import & Export**
  - Bulk import existing hardware catalogs or export full database backups.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion, Recharts
- **Backend:** Node.js, Express
- **Database:** SQLite (`better-sqlite3`) with runtime auto-migrations
- **Build System:** Vite, esbuild, `tsx`

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ installed
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/homedome-device-tracker.git
   cd homedome-device-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

---

## 📜 Available Scripts

- `npm run dev` — Launches the Express server and Vite frontend concurrently.
- `npm run build` — Bundles the client application and compiles `server.ts` into CommonJS for production deployment.
- `npm run start` — Runs the compiled backend server from `dist/server.cjs`.
- `npm run lint` — Executes TypeScript type checking across the project.

---

## 📁 Project Structure

```
├── server.ts              # Express API server & SQLite database management
├── src/
│   ├── App.tsx            # Primary React UI component & state handling
│   ├── main.tsx           # React entry point
│   ├── types.ts           # Shared TypeScript interfaces and types
│   └── index.css          # Tailwind CSS global styles
├── index.html             # HTML template
├── package.json           # Node dependencies & project scripts
└── metadata.json          # Application configuration metadata
```

---

## 🛡️ License

Distributed under the MIT License.
