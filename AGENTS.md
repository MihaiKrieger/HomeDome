# AGENTS.md — HomeDome Device Tracker Guidelines

This file serves as a comprehensive developer guide and instruction manual for AI agents working on the **HomeDome Device Tracker** codebase.

---

## 📌 Project Overview

**HomeDome Device Tracker** is a self-hosted, full-stack asset management application designed to track smart home hardware, IoT devices, network infrastructure, battery specifications, custom metadata, and inter-device relationships.

- **Primary Stack:** Node.js, Express, SQLite (`better-sqlite3`), React 19, TypeScript, Tailwind CSS v4, Lucide React, Recharts.
- **Runtime Environment:** Single container / local process running Express with Vite middleware in dev on port `3000`.

---

## 📐 System Architecture

### 1. Server & Execution (`server.ts`)
- **Backend Architecture:** Monolithic Express server (`server.ts`) using `better-sqlite3` for local persistent storage.
- **Port & Host Binding:** Must strictly run on port `3000` and host `0.0.0.0`.
- **Database Initializations & Migrations:** SQLite schema creation and auto-migrations run inside `server.ts` upon server boot.
- **Build & Distribution:**
  - **Dev:** `npm run dev` executes `tsx server.ts` with Vite development middleware.
  - **Production:** `npm run build` compiles Vite static assets into `dist/` and bundles `server.ts` using `esbuild` into CommonJS (`dist/server.cjs`).
  - **Start:** `npm run start` runs `node dist/server.cjs`.

### 2. Frontend Structure (`src/App.tsx`, `src/types.ts`)
- **Single-Page Application:** The UI is contained primarily in `src/App.tsx` with modal dialogs, tab views, and interactive drawer overlays.
- **Type Definitions:** All shared interfaces (`Device`, `DeviceRelation`, `Location`, `Network`, `BatteryType`, `CustomField`) are defined in `src/types.ts`.

---

## 🗄️ Database Schema (`better-sqlite3`)

### Core Tables
1. **`devices`**
   - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
   - `name` (TEXT NOT NULL)
   - `location_id` (INTEGER NULLABLE)
   - `status` (TEXT NOT NULL DEFAULT 'Online')
   - `serial_number`, `mac_address`, `network_id`, `ip_address`, `ip_allocation` ('DHCP' | 'Static')
   - `interface`, `price`, `commissioning_date`, `battery_type_id`, `matter_code`, `description`
   - `is_deleted` (INTEGER DEFAULT 0 for soft-deletes)
   - `related_device_id` (INTEGER NULLABLE - legacy single link column kept for backward compatibility)

2. **`device_links`** (Multi-Device Links Junction Table)
   - `source_device_id` (INTEGER NOT NULL)
   - `target_device_id` (INTEGER NOT NULL)
   - PRIMARY KEY (`source_device_id`, `target_device_id`)
   - Bidirectional resolution: Outgoing links query `source_device_id = deviceId`; incoming links query `target_device_id = deviceId`.

3. **Taxonomy Tables**
   - `locations`: `id`, `name`
   - `networks`: `id`, `name`
   - `battery_types`: `id`, `name`

4. **Dynamic Attributes & Audit Logs**
   - `custom_fields`: `id`, `name`, `type` (`text` | `number` | `boolean`)
   - `custom_values`: `device_id`, `field_id`, `value`
   - `comments`: `id`, `device_id`, `content`, `created_at` (stores user comments & automated change diff audit logs)

---

## 🔌 API Endpoint Reference

| Method | Endpoint | Description |
| text | text | text |
| `GET` | `/api/devices` | Returns list of active devices with location/network names, custom fields, and bidirectional links (`relatedDevices` & `referencedByDevices`). |
| `GET` | `/api/devices/:id` | Returns single device payload with comment logs and linked device arrays. |
| `POST` | `/api/devices` | Creates a device, updates `device_links`, and generates initial activity comment. |
| `PUT` | `/api/devices/:id` | Updates a device, diffs altered fields to write audit log entry, and syncs `device_links`. |
| `DELETE` | `/api/devices/:id` | Soft-deletes device (`is_deleted = 1`) and logs deletion event. |
| `POST` | `/api/devices/:id/restore` | Restores soft-deleted device. |
| `GET/POST/DELETE` | `/api/locations` | CRUD for device locations taxonomy. |
| `GET/POST/DELETE` | `/api/networks` | CRUD for WiFi/Mesh networks taxonomy. |
| `GET/POST/DELETE` | `/api/battery-types` | CRUD for battery types taxonomy. |
| `GET/POST/DELETE` | `/api/custom-fields` | CRUD for custom fields taxonomy. |

---

## 🛠️ Code Conventions & Agent Guidelines

1. **Schema Migrations:**
   - When introducing new database columns or tables in `server.ts`, wrap DDL additions in `try { ... } catch` blocks or use standard `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN` statements to prevent boot failures on existing SQLite files.
2. **Bidirectional Device Relationships:**
   - Always update and query the `device_links` table when modifying device associations.
   - Maintain `relatedDevices` (outgoing) and `referencedByDevices` (incoming) arrays in JSON payloads.
3. **Type Safety:**
   - Ensure all frontend state modifications stay synchronized with `src/types.ts`.
   - Always run `npm run lint` (`tsc --noEmit`) after modifications to confirm zero type errors.
4. **Port & Environment Restrictions:**
   - Never change port `3000` or attempt to read custom port environment variables.
   - Maintain client/server proxy routing via the Express server entry point.
