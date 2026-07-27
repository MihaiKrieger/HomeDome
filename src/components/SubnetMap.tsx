import React, { useState, useMemo } from "react";
import {
  Network as NetworkIcon,
  Plus,
  Search,
  Activity,
  Maximize2,
  Minimize2,
  CheckCircle,
  HelpCircle,
  Info,
  Sliders,
  Wifi,
  Bookmark
} from "lucide-react";
import { Device, Location, Network } from "../types";

interface SubnetMapProps {
  devices: Device[];
  networks: Network[];
  locations: Location[];
  selectedDevice: Device | null;
  onSelectDevice: (device: Device) => void;
  onAddDeviceWithIP: (ip: string, preferredNetworkName: string) => void;
  customFields: any[];
  isFullscreenMap: boolean;
  setIsFullscreenMap: (val: boolean) => void;
}

export default function SubnetMap({
  devices,
  selectedDevice,
  onSelectDevice,
  onAddDeviceWithIP,
  isFullscreenMap,
  setIsFullscreenMap
}: SubnetMapProps) {
  // Subnet selection: 'main' (192.168.1.x) or 'iot' (192.168.0.x)
  const [activeSubnet, setActiveSubnet] = useState<"main" | "iot">("main");
  // Display mode: 'grid' or 'ledger'
  const [displayMode, setDisplayMode] = useState<"grid" | "ledger">("grid");
  // Search within subnet ledger
  const [subnetSearch, setSubnetSearch] = useState("");
  // Filter for ledger list
  const [showOnlyReserved, setShowOnlyReserved] = useState(false);
  const [showOnlyVacant, setShowOnlyVacant] = useState(false);
  // IP Inspector hovered cell state (defaults to first active or gateway)
  const [hoveredHost, setHoveredHost] = useState<number | null>(null);

  // Constants
  const subnetPrefix = activeSubnet === "main" ? "192.168.1." : "192.168.0.";
  const gatewayIP = activeSubnet === "main" ? "192.168.1.1" : "192.168.0.1";
  const subnetMask = "255.255.255.0";
  const cidrNotation = activeSubnet === "main" ? "192.168.1.1/24" : "192.168.0.1/24";
  const networkName = activeSubnet === "main" ? "Main vLAN" : "IoT vLAN";

  // Helper to extract last octet from IP Address
  const getHostFromIP = (ip: string): number | null => {
    const parts = ip.split(".");
    if (parts.length !== 4) return null;
    const last = parseInt(parts[3], 10);
    return isNaN(last) ? null : last;
  };

  // Filter non-deleted devices belonging to the active subnet
  const subnetDevices = useMemo(() => {
    return devices.filter((d) => {
      if (d.isDeleted) return false;
      const ip = d.ipAddress || "";
      return ip.startsWith(subnetPrefix);
    });
  }, [devices, activeSubnet]);

  // Create a fast-lookup map: host number (1-254) -> Device
  const hostToDeviceMap = useMemo(() => {
    const map = new Map<number, Device>();
    subnetDevices.forEach((d) => {
      const host = getHostFromIP(d.ipAddress);
      if (host !== null && host >= 1 && host <= 254) {
        map.set(host, d);
      }
    });
    return map;
  }, [subnetDevices]);

  // Calculate subnet statistics
  const stats = useMemo(() => {
    let reserved = 0;
    let staticCount = 0;
    let dynamic = 0;

    subnetDevices.forEach((d) => {
      const alloc = (d.ipAllocation || "").toLowerCase();
      if (alloc.includes("reserved") || alloc.includes("reserve")) {
        reserved++;
      } else if (alloc.includes("static")) {
        staticCount++;
      } else {
        dynamic++;
      }
    });

    const totalAssigned = subnetDevices.length;
    const totalCapacity = 254; // Host parts .1 through .254
    const available = Math.max(0, totalCapacity - totalAssigned);
    const utilizationPercent = Math.round((totalAssigned / totalCapacity) * 100);

    return {
      reserved,
      staticCount,
      dynamic,
      totalAssigned,
      available,
      utilizationPercent
    };
  }, [subnetDevices]);

  // Filtered devices for the ledger list view
  const filteredLedger = useMemo(() => {
    const list = [];
    
    // Scan all 254 hosts
    for (let h = 1; h <= 254; h++) {
      const ip = `${subnetPrefix}${h}`;
      const dev = hostToDeviceMap.get(h);
      
      const isVacant = !dev;
      
      // Filter conditions
      if (showOnlyReserved && dev) {
        const isRes = (dev.ipAllocation || "").toLowerCase().includes("reserved") || 
                      (dev.ipAllocation || "").toLowerCase().includes("static");
        if (!isRes) continue;
      }
      if (showOnlyReserved && isVacant) continue;
      if (showOnlyVacant && !isVacant) continue;

      // Search term check
      if (subnetSearch.trim()) {
        const q = subnetSearch.toLowerCase();
        if (isVacant) {
          if (!ip.includes(q)) continue;
        } else {
          const matchName = dev.name.toLowerCase().includes(q);
          const matchIP = dev.ipAddress.toLowerCase().includes(q);
          const matchMAC = dev.macAddress.toLowerCase().includes(q);
          const matchLoc = (dev.locationName || "").toLowerCase().includes(q);
          if (!matchName && !matchIP && !matchMAC && !matchLoc) continue;
        }
      }

      list.push({
        host: h,
        ip,
        device: dev || null,
        isVacant
      });
    }

    return list;
  }, [hostToDeviceMap, activeSubnet, subnetSearch, showOnlyReserved, showOnlyVacant]);

  // Handle clicking a host square
  const handleHostClick = (host: number, device: Device | null) => {
    if (device) {
      onSelectDevice(device);
    } else {
      const ip = `${subnetPrefix}${host}`;
      const preferredNet = activeSubnet === "main" ? "Main" : "IoT";
      onAddDeviceWithIP(ip, preferredNet);
    }
  };

  // Inspect details of the hovered or selected host
  const inspectorHost = hoveredHost !== null ? hoveredHost : (selectedDevice && getHostFromIP(selectedDevice.ipAddress) && selectedDevice.ipAddress.startsWith(subnetPrefix) ? getHostFromIP(selectedDevice.ipAddress) : null);
  const inspectorDevice = inspectorHost ? hostToDeviceMap.get(inspectorHost) : null;
  const inspectorIP = inspectorHost ? `${subnetPrefix}${inspectorHost}` : null;

  return (
    <div className="flex-1 flex flex-col gap-5 min-w-0">
      {/* Upper Panel: Subnet Switcher & Title */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-slate-950 border border-slate-800 text-cyan-400 rounded-lg">
              <NetworkIcon className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-mono font-bold text-slate-100 tracking-tight">IP ADDRESS & vLAN MAP</h2>
          </div>
          <p className="text-xs text-slate-400">
            Monitor and plan DHCP leases for local subnets without router console logins.
          </p>
        </div>

        {/* Subnet Toggles */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto font-mono">
          <button
            onClick={() => {
              setActiveSubnet("main");
              setHoveredHost(null);
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubnet === "main"
                ? "bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400 led-glow-cyan" />
            Main vLAN (.1.x)
          </button>
          <button
            onClick={() => {
              setActiveSubnet("iot");
              setHoveredHost(null);
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubnet === "iot"
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 led-glow-emerald" />
            IoT vLAN (.0.x)
          </button>
        </div>
      </div>

      {/* Subnet Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Utilization</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-100 tracking-tight">{stats.utilizationPercent}%</span>
            <span className="text-xs text-slate-400">({stats.totalAssigned}/254)</span>
          </div>
          <div className="w-full bg-slate-950 border border-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                stats.utilizationPercent > 80 
                  ? "bg-rose-500" 
                  : stats.utilizationPercent > 50 
                  ? "bg-amber-400" 
                  : "bg-cyan-400"
              }`}
              style={{ width: `${stats.utilizationPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">DHCP Reserved</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-cyan-400 tracking-tight">{stats.reserved}</span>
            <span className="text-xs text-slate-400">addresses</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-cyan-400 inline" /> Fixed DHCP leases
          </p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Static IPs</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-400 tracking-tight">{stats.staticCount}</span>
            <span className="text-xs text-slate-400">manual</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-amber-400 inline" /> Static configs
          </p>
        </div>

        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Vacant Hosts</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">{stats.available}</span>
            <span className="text-xs text-slate-400">available</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-400 inline" /> Open for lease
          </p>
        </div>
      </div>

      {/* Main Grid / Layout View */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xs overflow-hidden flex flex-col">
        {/* Header toolbar */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mode:</span>
            <div className="inline-flex bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setDisplayMode("grid")}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  displayMode === "grid" ? "bg-cyan-950 text-cyan-400 border border-cyan-800/80 shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Interactive Grid
              </button>
              <button
                onClick={() => setDisplayMode("ledger")}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  displayMode === "ledger" ? "bg-cyan-950 text-cyan-400 border border-cyan-800/80 shadow-xs" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                IP Ledger List
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreenMap(!isFullscreenMap)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all cursor-pointer"
              title={isFullscreenMap ? "Collapse view to show details side panel" : "Expand map to full width"}
            >
              {isFullscreenMap ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
                  Show Panel
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                  Expand Map
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Display Area */}
        {displayMode === "grid" ? (
          <div className="p-5 flex flex-col lg:flex-row gap-5">
            {/* Left side: Grid of 254 hosts */}
            <div className="flex-1">
              <div className="mb-3.5 flex items-center justify-between font-mono">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  IP MAP LAYOUT ({cidrNotation})
                </span>
                <span className="text-[10px] text-slate-500 italic">
                  *Hover for details | Click empty to reserve
                </span>
              </div>

              {/* Grid 16 columns wide */}
              <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5 bg-slate-950 p-4 rounded-xl border border-slate-800/90 font-mono">
                {Array.from({ length: 254 }, (_, i) => {
                  const hostNum = i + 1;
                  const device = hostToDeviceMap.get(hostNum);
                  const isGateway = hostNum === 1;
                  const isSelected = selectedDevice && getHostFromIP(selectedDevice.ipAddress) === hostNum && selectedDevice.ipAddress.startsWith(subnetPrefix);
                  const isHovered = hoveredHost === hostNum;

                  // Determine background color
                  let cellStyle = "bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-slate-200 border-slate-800";
                  
                  if (device) {
                    if (device.status === "Online") {
                      cellStyle = "bg-emerald-950/90 text-emerald-400 border-emerald-500/80 shadow-xs hover:bg-emerald-900/90";
                    } else if (device.status === "Offline") {
                      cellStyle = "bg-rose-950/90 text-rose-400 border-rose-500/80 shadow-xs hover:bg-rose-900/90";
                    } else if (device.status === "Standby") {
                      cellStyle = "bg-amber-950/90 text-amber-400 border-amber-500/80 shadow-xs hover:bg-amber-900/90";
                    } else {
                      cellStyle = "bg-sky-950/90 text-sky-400 border-sky-500/80 shadow-xs hover:bg-sky-900/90";
                    }
                  } else if (isGateway) {
                    cellStyle = "bg-slate-800 text-slate-300 border-slate-700 font-bold hover:bg-slate-700";
                  }

                  return (
                    <button
                      key={hostNum}
                      onMouseEnter={() => setHoveredHost(hostNum)}
                      onMouseLeave={() => setHoveredHost(null)}
                      onClick={() => handleHostClick(hostNum, device || null)}
                      className={`h-9 w-full flex flex-col items-center justify-center text-[10px] font-bold border rounded-lg cursor-pointer transition-all ${cellStyle} ${
                        isSelected ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950 scale-105 z-10" : ""
                      } ${isHovered && !isSelected ? "scale-105 z-10 shadow-md border-cyan-500/50" : ""}`}
                      title={device ? `${device.name} (${device.ipAddress})` : isGateway ? `Default Gateway (${gatewayIP})` : `Vacant: ${subnetPrefix}${hostNum}`}
                    >
                      <span>.{hostNum}</span>
                      {device && (
                        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                          device.status === "Online" ? "bg-emerald-400 led-glow-emerald" :
                          device.status === "Offline" ? "bg-rose-400 led-glow-rose" : "bg-amber-400"
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 items-center justify-center bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-800" />
                  <span>Vacant Host</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-950 border border-emerald-500 text-emerald-400 flex items-center justify-center text-[8px] font-bold">●</span>
                  <span>Online Node</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-rose-950 border border-rose-500 text-rose-400 flex items-center justify-center text-[8px] font-bold">●</span>
                  <span>Offline Node</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-amber-950 border border-amber-500 text-amber-400 flex items-center justify-center text-[8px] font-bold">●</span>
                  <span>Standby Node</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700" />
                  <span>Gateway Router</span>
                </div>
              </div>
            </div>

            {/* Right side: Live Port Inspector Card */}
            <div className="w-full lg:w-72 bg-slate-950 rounded-xl border border-slate-800 p-4.5 flex flex-col justify-between min-h-[340px]">
              <div className="space-y-4">
                <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between font-mono">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    Host Inspector
                  </span>
                  {inspectorIP && (
                    <span className="text-xs font-bold bg-cyan-950 border border-cyan-800/80 text-cyan-400 px-1.5 py-0.5 rounded">
                      {inspectorIP}
                    </span>
                  )}
                </div>

                {inspectorDevice ? (
                  <div className="space-y-3 font-mono">
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 tracking-tight leading-snug">
                        {inspectorDevice.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 uppercase mt-0.5 tracking-wider">
                        MAC: {inspectorDevice.macAddress || "N/A"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Status</span>
                        <span className={`inline-flex items-center gap-1 font-semibold text-[11px] mt-0.5 ${
                          inspectorDevice.status === "Online" ? "text-emerald-400" : inspectorDevice.status === "Offline" ? "text-rose-400" : "text-slate-400"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            inspectorDevice.status === "Online" ? "bg-emerald-400 led-glow-emerald" : inspectorDevice.status === "Offline" ? "bg-rose-400 led-glow-rose" : "bg-slate-400"
                          }`} />
                          {inspectorDevice.status}
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Allocation</span>
                        <span className="font-semibold text-slate-300 text-[11px] block mt-0.5">
                          {inspectorDevice.ipAllocation || "N/A"}
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Location</span>
                        <span className="font-semibold text-slate-300 text-[11px] block mt-0.5 truncate" title={inspectorDevice.locationName}>
                          {inspectorDevice.locationName || "N/A"}
                        </span>
                      </div>

                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Interface</span>
                        <span className="font-semibold text-slate-300 text-[11px] block mt-0.5 flex items-center gap-1">
                          <Wifi className="w-3 h-3 text-slate-400 inline" /> {inspectorDevice.interface || "N/A"}
                        </span>
                      </div>
                    </div>

                    {inspectorDevice.description && (
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 leading-relaxed italic">
                        "{inspectorDevice.description}"
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={() => onSelectDevice(inspectorDevice)}
                        className="w-full bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-400 text-[11px] font-bold py-2 rounded-lg transition-all border border-cyan-800/80 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        Inspect Specifications & Logs
                      </button>
                    </div>
                  </div>
                ) : inspectorHost === 1 ? (
                  <div className="py-6 text-center space-y-2 font-mono">
                    <span className="p-3 bg-slate-900 text-slate-400 rounded-full inline-block border border-slate-800">
                      <Sliders className="w-6 h-6" />
                    </span>
                    <h4 className="text-xs font-bold text-slate-200">Subnet Default Gateway</h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      IP <span className="text-cyan-400">{gatewayIP}</span> is occupied by central router/gateway.
                    </p>
                  </div>
                ) : inspectorIP ? (
                  <div className="py-6 text-center space-y-3 font-mono">
                    <span className="p-3 bg-emerald-950 text-emerald-400 rounded-full inline-block border border-emerald-800">
                      <Plus className="w-6 h-6" />
                    </span>
                    <h4 className="text-xs font-bold text-slate-200">Vacant Address</h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      No active lease for IP <span className="text-slate-200 font-bold">{inspectorIP}</span>.
                    </p>
                    <button
                      onClick={() => {
                        const preferredNet = activeSubnet === "main" ? "Main" : "IoT";
                        onAddDeviceWithIP(inspectorIP, preferredNet);
                      }}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-all border border-emerald-500"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add DHCP Lease
                    </button>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 space-y-2 font-mono">
                    <HelpCircle className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs">Hover over an IP host square above to inspect lease details.</p>
                  </div>
                )}
              </div>

              {/* Subnet Metadata */}
              <div className="border-t border-slate-800 pt-2.5 mt-4 text-[10px] text-slate-500 font-mono space-y-1">
                <div className="flex justify-between">
                  <span>Netmask:</span>
                  <span className="text-slate-300 font-medium">{subnetMask}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subnet Type:</span>
                  <span className="text-slate-300 font-medium">{networkName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scope:</span>
                  <span className="text-slate-300 font-medium">Class C Private</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Ledger Table View */
          <div className="flex-1 flex flex-col font-mono">
            {/* Search and filters ledger row */}
            <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="relative flex-1 max-w-sm">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-slate-500" />
                </span>
                <input
                  type="text"
                  value={subnetSearch}
                  onChange={(e) => setSubnetSearch(e.target.value)}
                  placeholder="Filter ledger by name, IP, MAC, location..."
                  className="block w-full pl-8.5 pr-3 py-1.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg text-xs outline-hidden text-slate-200 placeholder-slate-600"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showOnlyReserved}
                    onChange={(e) => {
                      setShowOnlyReserved(e.target.checked);
                      if (e.target.checked) setShowOnlyVacant(false);
                    }}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 h-3.5 w-3.5"
                  />
                  <span>Show Only Reserved</span>
                </label>

                <label className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showOnlyVacant}
                    onChange={(e) => {
                      setShowOnlyVacant(e.target.checked);
                      if (e.target.checked) setShowOnlyReserved(false);
                    }}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 h-3.5 w-3.5"
                  />
                  <span>Show Only Vacant</span>
                </label>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800 text-left">
                <thead className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3 w-32">IP Address</th>
                    <th scope="col" className="px-5 py-3 w-48">Device Name</th>
                    <th scope="col" className="px-5 py-3 w-44">MAC Address</th>
                    <th scope="col" className="px-5 py-3 w-32">Allocation Type</th>
                    <th scope="col" className="px-5 py-3 w-32">Location</th>
                    <th scope="col" className="px-5 py-3 w-24">Status</th>
                    <th scope="col" className="px-5 py-3 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-900 divide-y divide-slate-800/80 text-xs">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                        No IP hosts match the selected search or filter criteria in {cidrNotation}.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map(({ host, ip, device, isVacant }) => {
                      if (isVacant) {
                        const isGateway = host === 1;
                        return (
                          <tr key={host} className="hover:bg-slate-800/50 group/row">
                            <td className="px-5 py-2.5 font-bold text-slate-500">
                              {ip}
                            </td>
                            <td colSpan={5} className="px-5 py-2.5">
                              {isGateway ? (
                                <span className="inline-flex items-center gap-1.5 text-slate-400 font-semibold italic text-[11px]">
                                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                                  Default Gateway (Reserved for Router)
                                </span>
                              ) : (
                                <span className="text-slate-600 italic text-[11px]">
                                  Unassigned Address
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              {!isGateway && (
                                <button
                                  onClick={() => {
                                    const preferredNet = activeSubnet === "main" ? "Main" : "IoT";
                                    onAddDeviceWithIP(ip, preferredNet);
                                  }}
                                  className="opacity-0 group-hover/row:opacity-100 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-md border border-emerald-800/80 cursor-pointer transition-all"
                                >
                                  + Reserve
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      }

                      // Occupied host
                      let statusStyle = "bg-slate-950 text-slate-400 border-slate-800";
                      if (device!.status === "Online") {
                        statusStyle = "bg-emerald-950/60 text-emerald-400 border-emerald-800/60";
                      } else if (device!.status === "Offline") {
                        statusStyle = "bg-rose-950/60 text-rose-400 border-rose-800/60";
                      } else if (device!.status === "Standby") {
                        statusStyle = "bg-amber-950/60 text-amber-400 border-amber-800/60";
                      }

                      const isSelected = selectedDevice && selectedDevice.id === device!.id;

                      return (
                        <tr 
                          key={host} 
                          onClick={() => onSelectDevice(device!)}
                          className={`hover:bg-slate-800/80 cursor-pointer transition-colors ${
                            isSelected ? "bg-cyan-950/40" : ""
                          }`}
                        >
                          <td className="px-5 py-2.5 font-bold text-cyan-400">
                            {ip}
                          </td>
                          <td className="px-5 py-2.5 font-semibold text-slate-100">
                            {device!.name}
                          </td>
                          <td className="px-5 py-2.5 text-slate-400 text-[11px]">
                            {device!.macAddress || "Not set"}
                          </td>
                          <td className="px-5 py-2.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-[10px] bg-slate-950 text-slate-300 px-1.5 py-0.5 rounded-md border border-slate-800">
                              <Bookmark className="w-2.5 h-2.5 text-slate-500" />
                              {device!.ipAllocation || "N/A"}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-slate-400 font-medium">
                            {device!.locationName || "N/A"}
                          </td>
                          <td className="px-5 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle}`}>
                              <span className={`w-1 h-1 rounded-full ${
                                device!.status === "Online" ? "bg-emerald-400 led-glow-emerald" : device!.status === "Offline" ? "bg-rose-400 led-glow-rose" : "bg-slate-500"
                              }`} />
                              {device!.status}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onSelectDevice(device!)}
                              className="bg-cyan-950 hover:bg-cyan-900 text-cyan-400 text-[10px] font-bold px-2 py-1 rounded-md border border-cyan-800/80 cursor-pointer"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
