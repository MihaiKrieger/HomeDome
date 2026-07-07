import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  BarChart2,
  PieChart as PieIcon,
  Activity,
  Server,
  Wifi,
  MapPin,
  FileText,
  BatteryCharging,
  Coins
} from "lucide-react";
import { Device, Location, Network } from "../types";

interface DeviceStatisticsProps {
  devices: Device[];
  locations: Location[];
  networks: Network[];
}

export default function DeviceStatistics({ devices, locations, networks }: DeviceStatisticsProps) {
  // 1. Calculations & Metrics
  const totalDevices = devices.length;

  const onlineDevices = devices.filter(d => d.status === "Online").length;
  const offlineDevices = devices.filter(d => d.status === "Offline").length;
  const standbyDevices = devices.filter(d => d.status === "Standby").length;
  const maintenanceDevices = devices.filter(d => d.status === "Maintenance").length;

  const onlinePercentage = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;

  const totalValue = devices.reduce((sum, d) => sum + (d.price || 0), 0);
  const avgValue = totalDevices > 0 ? Math.round(totalValue / totalDevices) : 0;

  // Format currency helpers
  const formatRON = (val: number) => {
    return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(val);
  };

  // 2. Data for Status Pie Chart
  const statusCounts = devices.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusCounts).map(([name, count]) => ({
    name,
    value: count
  }));

  const STATUS_COLORS: Record<string, string> = {
    "Online": "#10b981",       // emerald-500
    "Offline": "#f43f5e",      // rose-500
    "Standby": "#f59e0b",      // amber-500
    "Maintenance": "#0ea5e9"   // sky-500
  };

  const getStatusColor = (status: string) => STATUS_COLORS[status] || "#64748b";

  // 3. Data for Location Distribution Bar Chart
  const locationData = locations.map(loc => {
    const count = devices.filter(d => d.locationId === loc.id).length;
    return {
      name: loc.name,
      devices: count
    };
  }).filter(item => item.devices > 0); // Only show locations with devices to keep it clean

  const unassignedLocationCount = devices.filter(d => !d.locationId).length;
  if (unassignedLocationCount > 0) {
    locationData.push({
      name: "Unassigned",
      devices: unassignedLocationCount
    });
  }

  // Sort locations by device count descending
  locationData.sort((a, b) => b.devices - a.devices);

  // 4. Data for Network Distribution
  const networkData = networks.map(net => {
    const count = devices.filter(d => d.networkId === net.id).length;
    return {
      name: net.name,
      count
    };
  }).filter(item => item.count > 0);

  const unassignedNetworkCount = devices.filter(d => !d.networkId).length;
  if (unassignedNetworkCount > 0) {
    networkData.push({
      name: "Unassigned Network",
      count: unassignedNetworkCount
    });
  }
  networkData.sort((a, b) => b.count - a.count);

  // 5. Interface Distribution
  const interfaceCounts = devices.reduce((acc, d) => {
    acc[d.interface] = (acc[d.interface] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const interfaceData = Object.entries(interfaceCounts).map(([name, count]) => ({
    name,
    count
  })).sort((a, b) => b.count - a.count);

  if (totalDevices === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 h-full overflow-y-auto">
        <div className="bg-slate-50 p-4.5 rounded-full border border-slate-100 text-slate-300 mb-3.5">
          <BarChart2 className="w-10 h-10" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">No Data Available</h3>
        <p className="text-xs max-w-sm mt-1 text-slate-500">
          Add smart devices or import them from a CSV file to generate charts and statistics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6 h-full bg-slate-50/20">
      
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Assets</span>
            <Server className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-slate-900">{totalDevices}</div>
          <div className="text-[10px] text-slate-500 font-semibold truncate">Registered Devices</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Online Health</span>
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-black text-emerald-600">{onlinePercentage}%</div>
          <div className="text-[10px] text-slate-500 font-semibold truncate">{onlineDevices} of {totalDevices} Online</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. Net Value</span>
            <Coins className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-sm sm:text-base md:text-lg font-black text-slate-900 truncate" title={formatRON(totalValue)}>{formatRON(totalValue)}</div>
          <div className="text-[10px] text-slate-500 font-semibold truncate">Avg: {formatRON(avgValue)}</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Offline Status</span>
            <span className={`w-2 h-2 rounded-full ${offlineDevices > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`}></span>
          </div>
          <div className="text-lg sm:text-xl font-black text-rose-600">{offlineDevices}</div>
          <div className="text-[10px] text-slate-500 font-semibold truncate">{totalDevices - onlineDevices} inactive</div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-5">
        
        {/* Status Distribution (Pie Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <PieIcon className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hardware Status Breakdown</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    itemStyle={{ fontWeight: '600' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Pie Chart Legends with counts & percentages */}
            <div className="space-y-2.5">
              {["Online", "Offline", "Standby", "Maintenance"].map((st) => {
                const count = statusCounts[st] || 0;
                const percentage = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0;
                if (count === 0) return null;

                return (
                  <div key={st} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStatusColor(st) }}></span>
                      <span className="text-xs font-semibold text-slate-700">{st}</span>
                    </div>
                    <div className="text-right flex items-baseline gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{count}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Location Distribution (Horizontal Bar Chart) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Device Count by Location</h4>
          </div>
          
          {locationData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={locationData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={10} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={100} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="devices" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={25}>
                    {locationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#6366f1" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">No location data found</p>
          )}
        </div>

      </div>

      {/* Network & Connection Medium Distribution Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Network Breakdown */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
            <Wifi className="w-3.5 h-3.5 text-indigo-500" />
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Network Shares</h4>
          </div>
          <div className="space-y-3 flex-1 justify-center flex flex-col">
            {networkData.slice(0, 4).map((net) => {
              const percentage = totalDevices > 0 ? Math.round((net.count / totalDevices) * 100) : 0;
              return (
                <div key={net.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600 truncate max-w-[140px]">{net.name}</span>
                    <span className="text-slate-900">{net.count} <span className="text-slate-400 text-[10px]">({percentage}%)</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interface Breakdown */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
            <BatteryCharging className="w-3.5 h-3.5 text-indigo-500" />
            <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Connection Mediums</h4>
          </div>
          <div className="space-y-3 flex-1 justify-center flex flex-col">
            {interfaceData.slice(0, 4).map((inter) => {
              const percentage = totalDevices > 0 ? Math.round((inter.count / totalDevices) * 100) : 0;
              return (
                <div key={inter.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600 truncate">{inter.name}</span>
                    <span className="text-slate-900">{inter.count} <span className="text-slate-400 text-[10px]">({percentage}%)</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all" 
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
