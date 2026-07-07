import express from "express";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure data directory exists for SQLite
  const dbDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const dbPath = path.join(dbDir, "sqlite.db");
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS networks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS battery_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS custom_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL -- 'text', 'number', 'boolean'
    );

    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location_id INTEGER,
      status TEXT NOT NULL,
      serial_number TEXT,
      mac_address TEXT,
      network_id INTEGER,
      ip_address TEXT,
      ip_allocation TEXT,
      interface TEXT NOT NULL,
      price REAL NOT NULL,
      commissioning_date TEXT NOT NULL,
      battery_type_id INTEGER,
      matter_code TEXT,
      description TEXT,
      is_deleted INTEGER DEFAULT 0,
      FOREIGN KEY(location_id) REFERENCES locations(id) ON DELETE SET NULL,
      FOREIGN KEY(network_id) REFERENCES networks(id) ON DELETE SET NULL,
      FOREIGN KEY(battery_type_id) REFERENCES battery_types(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS device_custom_values (
      device_id INTEGER,
      field_id INTEGER,
      value TEXT,
      PRIMARY KEY(device_id, field_id),
      FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE,
      FOREIGN KEY(field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(device_id) REFERENCES devices(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS interfaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );
  `);

  // Migrate description column for existing databases if needed
  try {
    db.exec("ALTER TABLE devices ADD COLUMN description TEXT;");
  } catch (err) {
    // Column already exists, ignore error
  }

  // Migrate is_deleted column for existing databases if needed
  try {
    db.exec("ALTER TABLE devices ADD COLUMN is_deleted INTEGER DEFAULT 0;");
  } catch (err) {
    // Column already exists, ignore error
  }

  // Seed default values if tables are empty
  const seedLocations = ["Living Room", "Kitchen", "Bedroom", "Bathroom", "Office", "Hallway", "Garage", "Garden"];
  const seedNetworks = ["Main WiFi", "IoT WiFi", "Zigbee Mesh", "Thread Mesh", "Bluetooth Network"];
  const seedBatteryTypes = ["Mains Powered", "CR2032", "CR123A", "AA", "AAA", "18650", "Rechargeable Li-Ion"];
  const seedInterfaces = ["LAN", "WiFI", "ZigBee", "Bluetooth", "Thread"];
  const seedStatuses = ["Online", "Offline", "Standby", "Maintenance"];

  const locCount = db.prepare("SELECT COUNT(*) as count FROM locations").get() as { count: number };
  if (locCount.count === 0) {
    const insertLoc = db.prepare("INSERT INTO locations (name) VALUES (?)");
    for (const loc of seedLocations) {
      insertLoc.run(loc);
    }
  }

  const netCount = db.prepare("SELECT COUNT(*) as count FROM networks").get() as { count: number };
  if (netCount.count === 0) {
    const insertNet = db.prepare("INSERT INTO networks (name) VALUES (?)");
    for (const net of seedNetworks) {
      insertNet.run(net);
    }
  }

  const batCount = db.prepare("SELECT COUNT(*) as count FROM battery_types").get() as { count: number };
  if (batCount.count === 0) {
    const insertBat = db.prepare("INSERT INTO battery_types (name) VALUES (?)");
    for (const bat of seedBatteryTypes) {
      insertBat.run(bat);
    }
  }

  const interfaceCount = db.prepare("SELECT COUNT(*) as count FROM interfaces").get() as { count: number };
  if (interfaceCount.count === 0) {
    const insertInterface = db.prepare("INSERT INTO interfaces (name) VALUES (?)");
    for (const inter of seedInterfaces) {
      insertInterface.run(inter);
    }
  }

  const statusCount = db.prepare("SELECT COUNT(*) as count FROM statuses").get() as { count: number };
  if (statusCount.count === 0) {
    const insertStatus = db.prepare("INSERT INTO statuses (name) VALUES (?)");
    for (const stat of seedStatuses) {
      insertStatus.run(stat);
    }
  }

  // Seed initial devices and comments if empty
  const seedFile = path.join(dbDir, ".devices_seeded");
  if (!fs.existsSync(seedFile)) {
    const devCount = db.prepare("SELECT COUNT(*) as count FROM devices").get() as { count: number };
    if (devCount.count === 0) {
      const insertDevice = db.prepare(`
        INSERT INTO devices (
          name, location_id, status, serial_number, mac_address, network_id,
          ip_address, ip_allocation, interface, price, commissioning_date,
          battery_type_id, matter_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const livingRoom = db.prepare("SELECT id FROM locations WHERE name = ?").get("Living Room") as { id: number } | undefined;
      const kitchen = db.prepare("SELECT id FROM locations WHERE name = ?").get("Kitchen") as { id: number } | undefined;
      const iotWifi = db.prepare("SELECT id FROM networks WHERE name = ?").get("IoT WiFi") as { id: number } | undefined;
      const zigbee = db.prepare("SELECT id FROM networks WHERE name = ?").get("Zigbee Mesh") as { id: number } | undefined;
      const mains = db.prepare("SELECT id FROM battery_types WHERE name = ?").get("Mains Powered") as { id: number } | undefined;
      const cr2032 = db.prepare("SELECT id FROM battery_types WHERE name = ?").get("CR2032") as { id: number } | undefined;

      const dev1Id = insertDevice.run(
        "Smart Thermostat", livingRoom?.id ?? null, "Online", "ST-99218-A", "AA:BB:CC:11:22:33", iotWifi?.id ?? null,
        "192.168.1.101", "Reserved DHCP", "WiFI", 650.00, "2026-01-15", mains?.id ?? null, "1234-567-8901"
      ).lastInsertRowid;

      const dev2Id = insertDevice.run(
        "Kitchen Motion Sensor", kitchen?.id ?? null, "Online", "MS-33100-B", "DD:EE:FF:44:55:66", zigbee?.id ?? null,
        "", "DHCP", "ZigBee", 120.00, "2026-03-10", cr2032?.id ?? null, "5566-778-8899"
      ).lastInsertRowid;

      const insertComment = db.prepare("INSERT INTO comments (device_id, content, created_at) VALUES (?, ?, ?)");
      insertComment.run(dev1Id, "Device successfully commissioned and configured.", "2026-01-15T10:30:00Z");
      insertComment.run(dev1Id, "Firmware updated to v2.1.4. Temperature readings are now more stable.", "2026-04-20T14:15:00Z");
      insertComment.run(dev2Id, "Sensor installed in the corner above the fridge.", "2026-03-10T11:00:00Z");
    }
    fs.writeFileSync(seedFile, "true");
  }

  // Middleware
  app.use(express.json());

  // API: Get global settings collections
  app.get("/api/settings", (req, res) => {
    try {
      const locations = db.prepare("SELECT * FROM locations ORDER BY name ASC").all();
      const networks = db.prepare("SELECT * FROM networks ORDER BY name ASC").all();
      const batteryTypes = db.prepare("SELECT * FROM battery_types ORDER BY name ASC").all();
      const customFields = db.prepare("SELECT * FROM custom_fields ORDER BY name ASC").all();
      const interfaces = db.prepare("SELECT * FROM interfaces ORDER BY name ASC").all();
      const statuses = db.prepare("SELECT * FROM statuses ORDER BY name ASC").all();
      res.json({ locations, networks, batteryTypes, customFields, interfaces, statuses });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Add Location
  app.post("/api/settings/location", (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Location name is required" });
      }
      const stmt = db.prepare("INSERT INTO locations (name) VALUES (?)");
      const info = stmt.run(name.trim());
      res.status(201).json({ id: info.lastInsertRowid, name: name.trim() });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Location already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API: Add Network
  app.post("/api/settings/network", (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Network name is required" });
      }
      const stmt = db.prepare("INSERT INTO networks (name) VALUES (?)");
      const info = stmt.run(name.trim());
      res.status(201).json({ id: info.lastInsertRowid, name: name.trim() });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Network already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API: Add Battery Type
  app.post("/api/settings/battery-type", (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Battery type name is required" });
      }
      const stmt = db.prepare("INSERT INTO battery_types (name) VALUES (?)");
      const info = stmt.run(name.trim());
      res.status(201).json({ id: info.lastInsertRowid, name: name.trim() });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Battery type already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API: Add Interface
  app.post("/api/settings/interface", (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Interface name is required" });
      }
      const stmt = db.prepare("INSERT INTO interfaces (name) VALUES (?)");
      const info = stmt.run(name.trim());
      res.status(201).json({ id: info.lastInsertRowid, name: name.trim() });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Interface already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API: Add Status
  app.post("/api/settings/status", (req, res) => {
    try {
      const { name } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Status name is required" });
      }
      const stmt = db.prepare("INSERT INTO statuses (name) VALUES (?)");
      const info = stmt.run(name.trim());
      res.status(201).json({ id: info.lastInsertRowid, name: name.trim() });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Status already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API: Add Custom Field
  app.post("/api/settings/custom-field", (req, res) => {
    try {
      const { name, type } = req.body;
      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Field name is required" });
      }
      if (!["text", "number", "boolean"].includes(type)) {
        return res.status(400).json({ error: "Invalid field type" });
      }
      const stmt = db.prepare("INSERT INTO custom_fields (name, type) VALUES (?, ?)");
      const info = stmt.run(name.trim(), type);
      res.status(201).json({ id: info.lastInsertRowid, name: name.trim(), type });
    } catch (err: any) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ error: "Custom field name already exists" });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API: Delete Location
  app.delete("/api/settings/location/:id", (req, res) => {
    try {
      const { id } = req.params;
      const result = db.prepare("DELETE FROM locations WHERE id = ?").run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Location not found" });
      }
      res.json({ success: true, message: "Location deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Delete Network
  app.delete("/api/settings/network/:id", (req, res) => {
    try {
      const { id } = req.params;
      const result = db.prepare("DELETE FROM networks WHERE id = ?").run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Network not found" });
      }
      res.json({ success: true, message: "Network deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Delete Battery Type
  app.delete("/api/settings/battery-type/:id", (req, res) => {
    try {
      const { id } = req.params;
      const result = db.prepare("DELETE FROM battery_types WHERE id = ?").run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Battery type not found" });
      }
      res.json({ success: true, message: "Battery type deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Delete Custom Field
  app.delete("/api/settings/custom-field/:id", (req, res) => {
    try {
      const { id } = req.params;
      const result = db.prepare("DELETE FROM custom_fields WHERE id = ?").run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Custom field not found" });
      }
      res.json({ success: true, message: "Custom field deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Delete Interface
  app.delete("/api/settings/interface/:id", (req, res) => {
    try {
      const { id } = req.params;
      const result = db.prepare("DELETE FROM interfaces WHERE id = ?").run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Interface not found" });
      }
      res.json({ success: true, message: "Interface deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Delete Status
  app.delete("/api/settings/status/:id", (req, res) => {
    try {
      const { id } = req.params;
      const result = db.prepare("DELETE FROM statuses WHERE id = ?").run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Status not found" });
      }
      res.json({ success: true, message: "Status deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get Devices
  app.get("/api/devices", (req, res) => {
    try {
      const devices = db.prepare(`
        SELECT 
          d.*,
          l.name as location_name,
          n.name as network_name,
          b.name as battery_type_name,
          (SELECT COUNT(*) FROM comments c WHERE c.device_id = d.id) as comment_count
        FROM devices d
        LEFT JOIN locations l ON d.location_id = l.id
        LEFT JOIN networks n ON d.network_id = n.id
        LEFT JOIN battery_types b ON d.battery_type_id = b.id
        ORDER BY d.name ASC
      `).all() as any[];

      // Fetch custom values
      const customValues = db.prepare(`
        SELECT device_id, field_id, value FROM device_custom_values
      `).all() as any[];

      const valuesMap: Record<number, Record<number, string>> = {};
      customValues.forEach((cv) => {
        if (!valuesMap[cv.device_id]) {
          valuesMap[cv.device_id] = {};
        }
        valuesMap[cv.device_id][cv.field_id] = cv.value;
      });

      const result = devices.map((d) => ({
        id: d.id,
        name: d.name,
        locationId: d.location_id,
        locationName: d.location_name || "Unassigned",
        status: d.status,
        serialNumber: d.serial_number || "",
        macAddress: d.mac_address || "",
        networkId: d.network_id,
        networkName: d.network_name || "Unassigned",
        ipAddress: d.ip_address || "",
        ipAllocation: d.ip_allocation || "DHCP",
        interface: d.interface,
        price: d.price,
        commissioningDate: d.commissioning_date,
        batteryTypeId: d.battery_type_id,
        batteryTypeName: d.battery_type_name || "Unassigned",
        matterCode: d.matter_code || "",
        customValues: valuesMap[d.id] || {},
        commentCount: d.comment_count || 0,
        description: d.description || "",
        isDeleted: d.is_deleted === 1
      }));

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Get Single Device with full comment list
  app.get("/api/devices/:id", (req, res) => {
    try {
      const { id } = req.params;
      const device = db.prepare(`
        SELECT 
          d.*,
          l.name as location_name,
          n.name as network_name,
          b.name as battery_type_name
        FROM devices d
        LEFT JOIN locations l ON d.location_id = l.id
        LEFT JOIN networks n ON d.network_id = n.id
        LEFT JOIN battery_types b ON d.battery_type_id = b.id
        WHERE d.id = ?
      `).get(id) as any;

      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }

      const customValues = db.prepare(`
        SELECT field_id, value FROM device_custom_values WHERE device_id = ?
      `).all(id) as any[];

      const valuesMap: Record<number, string> = {};
      customValues.forEach((cv) => {
        valuesMap[cv.field_id] = cv.value;
      });

      const comments = db.prepare(`
        SELECT * FROM comments WHERE device_id = ? ORDER BY created_at DESC
      `).all(id) as any[];

      res.json({
        id: device.id,
        name: device.name,
        locationId: device.location_id,
        locationName: device.location_name || "Unassigned",
        status: device.status,
        serialNumber: device.serial_number || "",
        macAddress: device.mac_address || "",
        networkId: device.network_id,
        networkName: device.network_name || "Unassigned",
        ipAddress: device.ip_address || "",
        ipAllocation: device.ip_allocation || "DHCP",
        interface: device.interface,
        price: device.price,
        commissioningDate: device.commissioning_date,
        batteryTypeId: device.battery_type_id,
        batteryTypeName: device.battery_type_name || "Unassigned",
        matterCode: device.matter_code || "",
        customValues: valuesMap,
        description: device.description || "",
        isDeleted: device.is_deleted === 1,
        comments: comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.created_at
        }))
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Create Device
  app.post("/api/devices", (req, res) => {
    const insertDevice = db.prepare(`
      INSERT INTO devices (
        name, location_id, status, serial_number, mac_address, network_id,
        ip_address, ip_allocation, interface, price, commissioning_date,
        battery_type_id, matter_code, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertCustomValue = db.prepare(`
      INSERT OR REPLACE INTO device_custom_values (device_id, field_id, value) VALUES (?, ?, ?)
    `);

    const runTx = db.transaction((data: any) => {
      const info = insertDevice.run(
        data.name,
        data.locationId || null,
        data.status,
        data.serialNumber || null,
        data.macAddress || null,
        data.networkId || null,
        data.ipAddress || null,
        data.ipAllocation || "DHCP",
        data.interface,
        data.price || 0,
        data.commissioningDate,
        data.batteryTypeId || null,
        data.matterCode || null,
        data.description || null
      );

      const deviceId = info.lastInsertRowid;

      if (data.customValues) {
        for (const [fieldId, val] of Object.entries(data.customValues)) {
          const strValue = val === null || val === undefined ? "" : String(val);
          insertCustomValue.run(deviceId, Number(fieldId), strValue);
        }
      }

      db.prepare("INSERT INTO comments (device_id, content, created_at) VALUES (?, ?, ?)")
        .run(deviceId, "Device profile created.", new Date().toISOString());

      return deviceId;
    });

    try {
      const {
        name, locationId, status, serialNumber, macAddress, networkId,
        ipAddress, ipAllocation, interface: devInterface, price,
        commissioningDate, batteryTypeId, matterCode, customValues, description, initialComment
      } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Device name is required" });
      }
      if (!status) {
        return res.status(400).json({ error: "Device status is required" });
      }
      if (!devInterface) {
        return res.status(400).json({ error: "Interface is required" });
      }
      if (!commissioningDate) {
        return res.status(400).json({ error: "Commissioning date is required" });
      }

      const deviceId = runTx({
        name: name.trim(),
        locationId: locationId ? Number(locationId) : null,
        status,
        serialNumber: serialNumber?.trim() || null,
        macAddress: macAddress?.trim() || null,
        networkId: networkId ? Number(networkId) : null,
        ipAddress: ipAddress?.trim() || null,
        ipAllocation: ipAllocation || "DHCP",
        interface: devInterface,
        price: price ? Number(price) : 0,
        commissioningDate,
        batteryTypeId: batteryTypeId ? Number(batteryTypeId) : null,
        matterCode: matterCode?.trim() || null,
        customValues,
        description: (description || initialComment || "").trim() || null
      });

      res.status(201).json({ id: deviceId, message: "Device created successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Update Device
  app.put("/api/devices/:id", (req, res) => {
    const { id } = req.params;

    const updateDevice = db.prepare(`
      UPDATE devices SET
        name = ?,
        location_id = ?,
        status = ?,
        serial_number = ?,
        mac_address = ?,
        network_id = ?,
        ip_address = ?,
        ip_allocation = ?,
        interface = ?,
        price = ?,
        commissioning_date = ?,
        battery_type_id = ?,
        matter_code = ?,
        description = ?
      WHERE id = ?
    `);

    const insertCustomValue = db.prepare(`
      INSERT OR REPLACE INTO device_custom_values (device_id, field_id, value) VALUES (?, ?, ?)
    `);

    const runTx = db.transaction((deviceId: number, data: any) => {
      // 1. Fetch old device details
      const oldDevice = db.prepare(`
        SELECT 
          d.*,
          l.name as location_name,
          n.name as network_name,
          b.name as battery_type_name
        FROM devices d
        LEFT JOIN locations l ON d.location_id = l.id
        LEFT JOIN networks n ON d.network_id = n.id
        LEFT JOIN battery_types b ON d.battery_type_id = b.id
        WHERE d.id = ?
      `).get(deviceId) as any;

      if (!oldDevice) {
        throw new Error("Device not found");
      }

      // 2. Fetch target names for new relations to produce clear labels
      let newLocationName = "Unassigned";
      if (data.locationId) {
        const loc = db.prepare("SELECT name FROM locations WHERE id = ?").get(data.locationId) as any;
        if (loc) newLocationName = loc.name;
      }

      let newNetworkName = "Unassigned";
      if (data.networkId) {
        const net = db.prepare("SELECT name FROM networks WHERE id = ?").get(data.networkId) as any;
        if (net) newNetworkName = net.name;
      }

      let newBatteryTypeName = "Unassigned";
      if (data.batteryTypeId) {
        const bat = db.prepare("SELECT name FROM battery_types WHERE id = ?").get(data.batteryTypeId) as any;
        if (bat) newBatteryTypeName = bat.name;
      }

      // 3. Fetch custom fields and old custom values to compare
      const oldCustomValues = db.prepare("SELECT field_id, value FROM device_custom_values WHERE device_id = ?").all(deviceId) as any[];
      const oldCustomMap = new Map<number, string>();
      oldCustomValues.forEach(cv => {
        oldCustomMap.set(cv.field_id, cv.value || "");
      });

      const customFields = db.prepare("SELECT id, name FROM custom_fields").all() as any[];
      const fieldNames = new Map<number, string>();
      customFields.forEach(cf => {
        fieldNames.set(cf.id, cf.name);
      });

      // 4. Generate diff
      const changes: string[] = [];
      const formatVal = (v: any) => (v === null || v === undefined ? "" : String(v).trim());

      const oldName = formatVal(oldDevice.name);
      const newName = formatVal(data.name);
      if (oldName !== newName) {
        changes.push(`• Name: "${oldName || "None"}" ➔ "${newName || "None"}"`);
      }

      const oldLoc = oldDevice.location_name || "Unassigned";
      if (oldLoc !== newLocationName) {
        changes.push(`• Location: "${oldLoc}" ➔ "${newLocationName}"`);
      }

      const oldStatus = formatVal(oldDevice.status);
      const newStatus = formatVal(data.status);
      if (oldStatus !== newStatus) {
        changes.push(`• Status: "${oldStatus}" ➔ "${newStatus}"`);
      }

      const oldSerial = oldDevice.serial_number || "None";
      const newSerial = data.serialNumber || "None";
      if (oldSerial !== newSerial) {
        changes.push(`• Serial Number: "${oldSerial}" ➔ "${newSerial}"`);
      }

      const oldMac = oldDevice.mac_address || "None";
      const newMac = data.macAddress || "None";
      if (oldMac !== newMac) {
        changes.push(`• MAC Address: "${oldMac}" ➔ "${newMac}"`);
      }

      const oldNet = oldDevice.network_name || "Unassigned";
      if (oldNet !== newNetworkName) {
        changes.push(`• Network: "${oldNet}" ➔ "${newNetworkName}"`);
      }

      const oldIp = oldDevice.ip_address || "None";
      const newIp = data.ipAddress || "None";
      if (oldIp !== newIp) {
        changes.push(`• IPv4 Address: "${oldIp}" ➔ "${newIp}"`);
      }

      const oldAlloc = oldDevice.ip_allocation || "DHCP";
      const newAlloc = data.ipAllocation || "DHCP";
      if (oldAlloc !== newAlloc) {
        changes.push(`• IP Allocation: "${oldAlloc}" ➔ "${newAlloc}"`);
      }

      const oldInterface = formatVal(oldDevice.interface);
      const newInterface = formatVal(data.interface);
      if (oldInterface !== newInterface) {
        changes.push(`• Connection Interface: "${oldInterface}" ➔ "${newInterface}"`);
      }

      const oldPrice = Number(oldDevice.price || 0);
      const newPrice = Number(data.price || 0);
      if (oldPrice !== newPrice) {
        changes.push(`• Price: ${oldPrice} RON ➔ ${newPrice} RON`);
      }

      const oldCommDate = formatVal(oldDevice.commissioning_date);
      const newCommDate = formatVal(data.commissioningDate);
      if (oldCommDate !== newCommDate) {
        changes.push(`• Commissioning Date: "${oldCommDate}" ➔ "${newCommDate}"`);
      }

      const oldBat = oldDevice.battery_type_name || "Unassigned";
      if (oldBat !== newBatteryTypeName) {
        changes.push(`• Battery Type: "${oldBat}" ➔ "${newBatteryTypeName}"`);
      }

      const oldMatter = oldDevice.matter_code || "None";
      const newMatter = data.matterCode || "None";
      if (oldMatter !== newMatter) {
        changes.push(`• Matter Code: "${oldMatter}" ➔ "${newMatter}"`);
      }

      const oldDesc = formatVal(oldDevice.description);
      const newDesc = formatVal(data.description);
      if (oldDesc !== newDesc) {
        changes.push(`• Description: "${oldDesc || "None"}" ➔ "${newDesc || "None"}"`);
      }

      if (data.customValues) {
        for (const [fIdStr, val] of Object.entries(data.customValues)) {
          const fId = Number(fIdStr);
          const oldVal = oldCustomMap.get(fId) || "";
          const newVal = val === null || val === undefined ? "" : String(val).trim();
          if (oldVal !== newVal) {
            const fName = fieldNames.get(fId) || `Custom Field #${fId}`;
            changes.push(`• ${fName}: "${oldVal || "None"}" ➔ "${newVal || "None"}"`);
          }
        }
      }

      // 5. Execute Update
      const info = updateDevice.run(
        data.name,
        data.locationId || null,
        data.status,
        data.serialNumber || null,
        data.macAddress || null,
        data.networkId || null,
        data.ipAddress || null,
        data.ipAllocation || "DHCP",
        data.interface,
        data.price || 0,
        data.commissioningDate,
        data.batteryTypeId || null,
        data.matterCode || null,
        data.description || null,
        deviceId
      );

      if (info.changes === 0) {
        throw new Error("Device not found");
      }

      if (data.customValues) {
        for (const [fieldId, val] of Object.entries(data.customValues)) {
          const strValue = val === null || val === undefined ? "" : String(val);
          insertCustomValue.run(deviceId, Number(fieldId), strValue);
        }
      }

      let commentContent = "Device specifications updated.";
      if (changes.length > 0) {
        commentContent = `Device specifications updated:\n${changes.join("\n")}`;
      }

      db.prepare("INSERT INTO comments (device_id, content, created_at) VALUES (?, ?, ?)")
        .run(deviceId, commentContent, new Date().toISOString());
    });

    try {
      const {
        name, locationId, status, serialNumber, macAddress, networkId,
        ipAddress, ipAllocation, interface: devInterface, price,
        commissioningDate, batteryTypeId, matterCode, customValues, description, initialComment
      } = req.body;

      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "Device name is required" });
      }

      runTx(Number(id), {
        name: name.trim(),
        locationId: locationId ? Number(locationId) : null,
        status,
        serialNumber: serialNumber?.trim() || null,
        macAddress: macAddress?.trim() || null,
        networkId: networkId ? Number(networkId) : null,
        ipAddress: ipAddress?.trim() || null,
        ipAllocation: ipAllocation || "DHCP",
        interface: devInterface,
        price: price ? Number(price) : 0,
        commissioningDate,
        batteryTypeId: batteryTypeId ? Number(batteryTypeId) : null,
        matterCode: matterCode?.trim() || null,
        customValues,
        description: description !== undefined ? description : initialComment !== undefined ? initialComment : null
      });

      res.json({ message: "Device updated successfully" });
    } catch (err: any) {
      if (err.message === "Device not found") {
        return res.status(404).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // API: Delete Device (Soft Delete / Move to Recycle Bin)
  app.delete("/api/devices/:id", (req, res) => {
    try {
      const { id } = req.params;
      const info = db.prepare("UPDATE devices SET is_deleted = 1 WHERE id = ?").run(id);
      if (info.changes === 0) {
        return res.status(404).json({ error: "Device not found" });
      }
      
      // Log comment that it was moved to trash
      db.prepare("INSERT INTO comments (device_id, content, created_at) VALUES (?, ?, ?)")
        .run(id, "Device moved to Trash.", new Date().toISOString());

      res.json({ message: "Device moved to Trash successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Restore Device from Trash
  app.post("/api/devices/:id/restore", (req, res) => {
    try {
      const { id } = req.params;
      const info = db.prepare("UPDATE devices SET is_deleted = 0 WHERE id = ?").run(id);
      if (info.changes === 0) {
        return res.status(404).json({ error: "Device not found" });
      }

      // Log comment that it was restored
      db.prepare("INSERT INTO comments (device_id, content, created_at) VALUES (?, ?, ?)")
        .run(id, "Device restored from Trash.", new Date().toISOString());

      res.json({ message: "Device restored successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Permanent Delete Device
  app.delete("/api/devices/:id/permanent", (req, res) => {
    try {
      const { id } = req.params;
      const info = db.prepare("DELETE FROM devices WHERE id = ?").run(id);
      if (info.changes === 0) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json({ message: "Device permanently deleted" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Reset Application (Delete all devices, which cascades to delete custom values and comments)
  app.post("/api/reset", (req, res) => {
    try {
      db.prepare("DELETE FROM devices").run();
      res.json({ message: "Application has been reset. All devices have been deleted." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Add Comment to Device
  app.post("/api/devices/:id/comments", (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content || content.trim() === "") {
        return res.status(400).json({ error: "Comment content is required" });
      }

      const dev = db.prepare("SELECT id FROM devices WHERE id = ?").get(id);
      if (!dev) {
        return res.status(404).json({ error: "Device not found" });
      }

      const stmt = db.prepare("INSERT INTO comments (device_id, content, created_at) VALUES (?, ?, ?)");
      const timestamp = new Date().toISOString();
      const info = stmt.run(id, content.trim(), timestamp);

      res.status(201).json({
        id: info.lastInsertRowid,
        deviceId: Number(id),
        content: content.trim(),
        createdAt: timestamp
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API: Delete Comment
  app.delete("/api/comments/:id", (req, res) => {
    try {
      const { id } = req.params;
      const result = db.prepare("DELETE FROM comments WHERE id = ?").run(id);
      if (result.changes === 0) {
        return res.status(404).json({ error: "Comment not found" });
      }
      res.json({ success: true, message: "Comment deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve static UI / Dev Server setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
