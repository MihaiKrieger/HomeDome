import React, { useState, useMemo } from "react";
import {
  Network as NetworkIcon,
  Plus,
  Search,
  Activity,
  Maximize2,
  Minimize2,
  Layers,
  Cpu,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ExternalLink,
  Info,
  Sliders,
  Wifi,
  Bookmark,
  Trash2,
  Edit2
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
  networks,
  locations,
  selectedDevice,
  onSelectDevice,
  onAddDeviceWithIP,
  customFields,
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
      <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <NetworkIcon className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">IP Address & vLAN Map</h2>
          </div>
          <p className="text-xs text-slate-500">
            Monitor and plan DHCP reservations for your subnets without logging into the router dashboard.
          </p>
        </div>

        {/* Subnet Toggles */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl self-start md:self-auto">
          <button
            onClick={() => {
              setActiveSubnet("main");
              setHoveredHost(null);
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubnet === "main"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-600" />
            Main vLAN (.1.x)
          </button>
          <button
            onClick={() => {
              setActiveSubnet("iot");
              setHoveredHost(null);
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubnet === "iot"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            IoT vLAN (.0.x)
          </button>
        </div>
      </div>

      {/* Subnet Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Utilization</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight">{stats.utilizationPercent}%</span>
            <span className="text-xs text-slate-500 font-medium">({stats.totalAssigned}/254)</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                stats.utilizationPercent > 80 
                  ? "bg-rose-500" 
                  : stats.utilizationPercent > 50 
                  ? "bg-amber-500" 
                  : "bg-indigo-600"
              }`}
              style={{ width: `${stats.utilizationPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">DHCP Reserved</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-indigo-700 tracking-tight">{stats.reserved}</span>
            <span className="text-xs text-slate-500 font-medium">addresses</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2.5 flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-indigo-500 inline" /> Fixed DHCP leases
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Static IPs</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-amber-700 tracking-tight">{stats.staticCount}</span>
            <span className="text-xs text-slate-500 font-medium">manually set</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2.5 flex items-center gap-1">
            <Sliders className="w-3 h-3 text-amber-500 inline" /> Static configurations
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1">Vacant Hosts</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-600 tracking-tight">{stats.available}</span>
            <span className="text-xs text-slate-500 font-medium">available</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2.5 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-500 inline" /> Open for assignment
          </p>
        </div>
      </div>

      {/* Main Grid / Layout View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        {/* Header toolbar */}
        <div className="px-5 py-3.5 bg-slate-50/50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">IP Subnet View Mode:</span>
            <div className="inline-flex bg-slate-200/60 p-0.5 rounded-lg">
              <button
                onClick={() => setDisplayMode("grid")}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  displayMode === "grid" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-800"
                }`}
              >
                Interactive Grid
              </button>
              <button
                onClick={() => setDisplayMode("ledger")}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                  displayMode === "ledger" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-800"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all cursor-pointer"
              title={isFullscreenMap ? "Collapse view to show details side panel" : "Expand map to full width"}
            >
              {isFullscreenMap ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                  Show Details Panel
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                  Expand Full Width
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
              <div className="mb-3.5 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  IP Map Layout ({cidrNotation})
                </span>
                <span className="text-[10px] text-slate-400 italic">
                  *Hover for details | Click empty to reserve | Click occupied to inspect
                </span>
              </div>

              {/* Grid 16 columns wide */}
              <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                {Array.from({ length: 254 }, (_, i) => {
                  const hostNum = i + 1;
                  const device = hostToDeviceMap.get(hostNum);
                  const isGateway = hostNum === 1;
                  const isSelected = selectedDevice && getHostFromIP(selectedDevice.ipAddress) === hostNum && selectedDevice.ipAddress.startsWith(subnetPrefix);
                  const isHovered = hoveredHost === hostNum;

                  // Determine background color
                  let cellStyle = "bg-white hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 border-slate-200";
                  
                  if (device) {
                    if (device.status === "Online") {
                      cellStyle = "bg-emerald-500 text-white border-emerald-600 shadow-xs hover:bg-emerald-600";
                    } else if (device.status === "Offline") {
                      cellStyle = "bg-rose-500 text-white border-rose-600 shadow-xs hover:bg-rose-600";
                    } else if (device.status === "Standby") {
                      cellStyle = "bg-amber-500 text-white border-amber-600 shadow-xs hover:bg-amber-600";
                    } else {
                      cellStyle = "bg-indigo-600 text-white border-indigo-700 shadow-xs hover:bg-indigo-700";
                    }
                  } else if (isGateway) {
                    cellStyle = "bg-slate-300 text-slate-700 border-slate-400 font-bold hover:bg-slate-400";
                  }

                  return (
                    <button
                      key={hostNum}
                      onMouseEnter={() => setHoveredHost(hostNum)}
                      onMouseLeave={() => setHoveredHost(null)}
                      onClick={() => handleHostClick(hostNum, device || null)}
                      className={`h-9 w-full flex flex-col items-center justify-center text-[10px] font-semibold border rounded-lg cursor-pointer transition-all ${cellStyle} ${
                        isSelected ? "ring-3 ring-indigo-400 ring-offset-1 scale-105 z-10" : ""
                      } ${isHovered && !isSelected ? "scale-105 z-10 shadow-md" : ""}`}
                      title={device ? `${device.name} (${device.ipAddress})` : isGateway ? `Default Gateway (${gatewayIP})` : `Vacant: ${subnetPrefix}${hostNum}`}
                    >
                      <span>.{hostNum}</span>
                      {device && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white opacity-85 mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-4 items-center justify-center bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-white border border-slate-200" />
                  <span>Vacant IP</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-500 shadow-xs" />
                  <span>Reserved IP (Online)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-rose-500 shadow-xs" />
                  <span>Reserved IP (Offline)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-amber-500 shadow-xs" />
                  <span>Reserved IP (Standby)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-slate-300 border border-slate-400" />
                  <span>Gateway / Router</span>
                </div>
              </div>
            </div>

            {/* Right side: Live Port Inspector Card */}
            <div className="w-full lg:w-72 bg-slate-50 rounded-xl border border-slate-200 p-4.5 flex flex-col justify-between min-h-[340px]">
              <div className="space-y-4">
                <div className="border-b border-slate-200 pb-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                    Host Inspector
                  </span>
                  {inspectorIP && (
                    <span className="font-mono text-xs font-bold bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                      {inspectorIP}
                    </span>
                  )}
                </div>

                {inspectorDevice ? (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 tracking-tight leading-snug">
                        {inspectorDevice.name}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-400 uppercase mt-0.5 tracking-wider">
                        MAC: {inspectorDevice.macAddress || "N/A"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Status</span>
                        <span className={`inline-flex items-center gap-1 font-semibold text-[11px] mt-0.5 ${
                          inspectorDevice.status === "Online" ? "text-emerald-600" : inspectorDevice.status === "Offline" ? "text-rose-600" : "text-slate-600"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            inspectorDevice.status === "Online" ? "bg-emerald-500" : inspectorDevice.status === "Offline" ? "bg-rose-500" : "bg-slate-400"
                          }`} />
                          {inspectorDevice.status}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Allocation</span>
                        <span className="font-semibold text-slate-700 text-[11px] block mt-0.5">
                          {inspectorDevice.ipAllocation || "N/A"}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Location</span>
                        <span className="font-semibold text-slate-600 text-[11px] block mt-0.5 truncate" title={inspectorDevice.locationName}>
                          {inspectorDevice.locationName || "N/A"}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200/60">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Interface</span>
                        <span className="font-semibold text-slate-600 text-[11px] block mt-0.5 flex items-center gap-1">
                          <Wifi className="w-3 h-3 text-slate-400 inline" /> {inspectorDevice.interface || "N/A"}
                        </span>
                      </div>
                    </div>

                    {inspectorDevice.description && (
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200/60 text-[11px] text-slate-500 leading-relaxed italic">
                        "{inspectorDevice.description}"
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={() => onSelectDevice(inspectorDevice)}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold py-2 rounded-lg transition-all border border-indigo-100 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        Load Details & Logs
                      </button>
                    </div>
                  </div>
                ) : inspectorHost === 1 ? (
                  <div className="py-6 text-center space-y-2">
                    <span className="p-3 bg-slate-200 text-slate-600 rounded-full inline-block">
                      <Sliders className="w-6 h-6" />
                    </span>
                    <h4 className="text-xs font-bold text-slate-700">Subnet Default Gateway</h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      IP <span className="font-mono">{gatewayIP}</span> is typically occupied by your central router or gateway controller.
                    </p>
                  </div>
                ) : inspectorIP ? (
                  <div className="py-6 text-center space-y-3">
                    <span className="p-3 bg-emerald-50 text-emerald-600 rounded-full inline-block">
                      <Plus className="w-6 h-6" />
                    </span>
                    <h4 className="text-xs font-bold text-slate-700">Vacant Address</h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      No active reservations are configured for IP <span className="font-mono text-slate-600 font-bold">{inspectorIP}</span>.
                    </p>
                    <button
                      onClick={() => {
                        const preferredNet = activeSubnet === "main" ? "Main" : "IoT";
                        onAddDeviceWithIP(inspectorIP, preferredNet);
                      }}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add DHCP Lease
                    </button>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">Hover over an IP square above to inspect host lease details.</p>
                  </div>
                )}
              </div>

              {/* Subnet Metadata */}
              <div className="border-t border-slate-200/80 pt-2.5 mt-4 text-[10px] text-slate-400 font-mono space-y-1">
                <div className="flex justify-between">
                  <span>Netmask:</span>
                  <span className="text-slate-600 font-medium">{subnetMask}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subnet Type:</span>
                  <span className="text-slate-600 font-medium">{networkName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Scope:</span>
                  <span className="text-slate-600 font-medium">Class C Private</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Ledger Table View */
          <div className="flex-1 flex flex-col">
            {/* Search and filters ledger row */}
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/20 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="relative flex-1 max-w-sm">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={subnetSearch}
                  onChange={(e) => setSubnetSearch(e.target.value)}
                  placeholder="Filter ledger by name, IP, MAC, location..."
                  className="block w-full pl-8.5 pr-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={showOnlyReserved}
                    onChange={(e) => {
                      setShowOnlyReserved(e.target.checked);
                      if (e.target.checked) setShowOnlyVacant(false);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span>Show Only Reserved</span>
                </label>

                <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={showOnlyVacant}
                    onChange={(e) => {
                      setShowOnlyVacant(e.target.checked);
                      if (e.target.checked) setShowOnlyReserved(false);
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span>Show Only Vacant</span>
                </label>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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
                <tbody className="bg-white divide-y divide-slate-200 text-xs">
                  {filteredLedger.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                        No IP hosts match the selected search or filter criteria in {cidrNotation}.
                      </td>
                    </tr>
                  ) : (
                    filteredLedger.map(({ host, ip, device, isVacant }) => {
                      if (isVacant) {
                        const isGateway = host === 1;
                        return (
                          <tr key={host} className="hover:bg-slate-50/50 group/row">
                            <td className="px-5 py-2.5 font-mono font-bold text-slate-500">
                              {ip}
                            </td>
                            <td colSpan={5} className="px-5 py-2.5">
                              {isGateway ? (
                                <span className="inline-flex items-center gap-1.5 text-slate-500 font-semibold italic text-[11px]">
                                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                                  Default Gateway (Reserved for Router)
                                </span>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">
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
                                  className="opacity-0 group-hover/row:opacity-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-emerald-100 cursor-pointer transition-all"
                                >
                                  + Reserve
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      }

                      // Occupied host
                      let statusStyle = "bg-slate-50 text-slate-600 border-slate-200";
                      if (device!.status === "Online") {
                        statusStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                      } else if (device!.status === "Offline") {
                        statusStyle = "bg-rose-50 text-rose-700 border-rose-100";
                      } else if (device!.status === "Standby") {
                        statusStyle = "bg-amber-50 text-amber-700 border-amber-100";
                      }

                      const isSelected = selectedDevice && selectedDevice.id === device!.id;

                      return (
                        <tr 
                          key={host} 
                          onClick={() => onSelectDevice(device!)}
                          className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                            isSelected ? "bg-indigo-50/40" : ""
                          }`}
                        >
                          <td className="px-5 py-2.5 font-mono font-bold text-indigo-700">
                            {ip}
                          </td>
                          <td className="px-5 py-2.5 font-semibold text-slate-800">
                            {device!.name}
                          </td>
                          <td className="px-5 py-2.5 font-mono text-slate-500 text-[11px]">
                            {device!.macAddress || "Not set"}
                          </td>
                          <td className="px-5 py-2.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200">
                              <Bookmark className="w-2.5 h-2.5 text-slate-400" />
                              {device!.ipAllocation || "N/A"}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-slate-500 font-medium">
                            {device!.locationName || "N/A"}
                          </td>
                          <td className="px-5 py-2.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${statusStyle}`}>
                              <span className={`w-1 h-1 rounded-full ${
                                device!.status === "Online" ? "bg-emerald-500" : device!.status === "Offline" ? "bg-rose-500" : "bg-slate-400"
                              }`} />
                              {device!.status}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => onSelectDevice(device!)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-md border border-indigo-100 cursor-pointer"
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
