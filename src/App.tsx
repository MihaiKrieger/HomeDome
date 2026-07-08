import React, { useState, useEffect } from "react";
import {
  Cpu,
  Plus,
  Settings as SettingsIcon,
  Search,
  MapPin,
  Wifi,
  Activity,
  Trash2,
  Edit2,
  Clock,
  Send,
  X,
  FileText,
  Calendar,
  Layers,
  Hash,
  MessageSquare,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Network as NetworkIcon,
  Tag,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Sparkles,
  ExternalLink,
  BatteryCharging,
  Download,
  Upload,
  BarChart2,
  PieChart,
  Maximize2,
  Minimize2
} from "lucide-react";
import { Device, Comment, Location, Network, BatteryType, CustomField, DeviceInterface, DeviceStatus } from "./types";
import DeviceStatistics from "./components/DeviceStatistics";

const highlightMatch = (text: string | null | undefined, search: string) => {
  if (!text) return null;
  if (!search || !search.trim()) return <span>{text}</span>;
  
  try {
    const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <span>
        {parts.map((part, index) => 
          regex.test(part) ? (
            <mark key={index} className="bg-amber-100 text-amber-950 font-bold px-0.5 rounded-xs border-b border-amber-200">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  } catch (err) {
    return <span>{text}</span>;
  }
};

export default function App() {
  // Global Collections
  const [devices, setDevices] = useState<Device[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [batteryTypes, setBatteryTypes] = useState<BatteryType[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [interfaces, setInterfaces] = useState<DeviceInterface[]>([]);
  const [statuses, setStatuses] = useState<DeviceStatus[]>([]);

  // Selected device for detail panel
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedDeviceDetails, setSelectedDeviceDetails] = useState<Device | null>(null);
  const [activeTabRight, setActiveTabRight] = useState<"details" | "logs" | "stats">("stats");

  // Loading & Messages
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterLocation, setFilterLocation] = useState("");
  const [filterNetwork, setFilterNetwork] = useState("");
  const [filterInterface, setFilterInterface] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [viewTrashOnly, setViewTrashOnly] = useState(false);

  // Settings Panel state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"locations" | "networks" | "battery_types" | "custom_fields" | "interfaces" | "statuses" | "reset">("locations");
  const [newLocationName, setNewLocationName] = useState("");
  const [newNetworkName, setNewNetworkName] = useState("");
  const [newBatteryTypeName, setNewBatteryTypeName] = useState("");
  const [newInterfaceName, setNewInterfaceName] = useState("");
  const [newStatusName, setNewStatusName] = useState("");
  const [newCustomFieldName, setNewCustomFieldName] = useState("");
  const [newCustomFieldType, setNewCustomFieldType] = useState<"text" | "number" | "boolean">("text");
  const [settingToDelete, setSettingToDelete] = useState<{ type: "location" | "network" | "battery_type" | "custom_field" | "interface" | "status"; id: number; name: string } | null>(null);
  const [resetWarningStep, setResetWarningStep] = useState<0 | 1 | 2>(0);
  const [resetConfirmText, setResetConfirmText] = useState("");

  // Add/Edit Device Modal state
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  // Deletion Confirmation state
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  // Device Form fields
  const [formName, setFormName] = useState("");
  const [formLocationId, setFormLocationId] = useState("");
  const [formStatus, setFormStatus] = useState("Online");
  const [formSerialNumber, setFormSerialNumber] = useState("");
  const [formMacAddress, setFormMacAddress] = useState("");
  const [formNetworkId, setFormNetworkId] = useState("");
  const [formIpAddress, setFormIpAddress] = useState("");
  const [formIpAllocation, setFormIpAllocation] = useState("DHCP");
  const [formInterface, setFormInterface] = useState("WiFI");
  const [formPrice, setFormPrice] = useState("0");
  const [formCommissioningDate, setFormCommissioningDate] = useState("");
  const [formBatteryTypeId, setFormBatteryTypeId] = useState("");
  const [formMatterCode, setFormMatterCode] = useState("");
  const [formCustomValues, setFormCustomValues] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Comments state
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isLoggingBatterySwap, setIsLoggingBatterySwap] = useState(false);
  const [commentIdConfirmDelete, setCommentIdConfirmDelete] = useState<number | null>(null);
  const [formInitialComment, setFormInitialComment] = useState("");
  const [isFormCommentExpanded, setIsFormCommentExpanded] = useState(false);
  const [isLogCommentExpanded, setIsLogCommentExpanded] = useState(false);

  // CSV Preview State
  const [csvPreviewItems, setCsvPreviewItems] = useState<{
    id: string;
    selected: boolean;
    name: string;
    location: string;
    status: string;
    serialNumber: string;
    macAddress: string;
    network: string;
    ipAddress: string;
    ipAllocation: string;
    interface: string;
    price: number;
    commissioningDate: string;
    batteryType: string;
    matterCode: string;
    initialComment: string;
    customValues: Record<string, any>;
  }[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [isCsvPreviewOpen, setIsCsvPreviewOpen] = useState(false);
  const [isCsvImporting, setIsCsvImporting] = useState(false);
  const [csvMatchedCount, setCsvMatchedCount] = useState(0);

  // Load Initial Data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, devicesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/devices")
      ]);

      if (!settingsRes.ok || !devicesRes.ok) {
        throw new Error("Failed to load application data.");
      }

      const settingsData = await settingsRes.json();
      const devicesData = await devicesRes.json();

      setLocations(settingsData.locations);
      setNetworks(settingsData.networks);
      setBatteryTypes(settingsData.batteryTypes);
      setCustomFields(settingsData.customFields);
      setInterfaces(settingsData.interfaces || []);
      setStatuses(settingsData.statuses || []);
      setDevices(devicesData);

      // If there's a selected device, update its basic attributes from list
      if (selectedDevice) {
        const updated = devicesData.find((d: Device) => d.id === selectedDevice.id);
        if (updated) {
          setSelectedDevice(updated);
        } else {
          setSelectedDevice(null);
          setSelectedDeviceDetails(null);
        }
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch detailed comments and properties when selectedDevice changes
  useEffect(() => {
    if (!selectedDevice) {
      setSelectedDeviceDetails(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/devices/${selectedDevice.id}`);
        if (res.ok) {
          const detailed = await res.json();
          setSelectedDeviceDetails(detailed);
        } else {
          showToast("Failed to fetch device details and comments", "error");
        }
      } catch (err) {
        showToast("Network error fetching device details", "error");
      }
    };

    fetchDetails();
  }, [selectedDevice]);

  // Auto-switch tab when selectedDevice state changes
  useEffect(() => {
    if (!selectedDevice) {
      setActiveTabRight("stats");
    }
  }, [selectedDevice]);

  // Toast Helper
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Predefined standard statuses
  const statusOptions = ["Online", "Offline", "Standby", "Maintenance"];

  // Open Device Modal (Add Mode)
  const handleOpenAddModal = () => {
    setEditingDevice(null);
    setFormName("");
    setFormLocationId(locations[0]?.id?.toString() || "");
    setFormStatus(statuses[0]?.name || "Online");
    setFormSerialNumber("");
    setFormMacAddress("");
    setFormNetworkId(networks[0]?.id?.toString() || "");
    setFormIpAddress("");
    setFormIpAllocation("DHCP");
    setFormInterface(interfaces[0]?.name || "WiFI");
    setFormPrice("0");
    setFormCommissioningDate(new Date().toISOString().split("T")[0]);
    setFormBatteryTypeId(batteryTypes[0]?.id?.toString() || "");
    setFormMatterCode("");

    // Initialize custom field values
    const initialCustoms: Record<number, string> = {};
    customFields.forEach((field) => {
      initialCustoms[field.id] = field.type === "boolean" ? "false" : "";
    });
    setFormCustomValues(initialCustoms);

    setFormInitialComment("");
    setFormError(null);
    setIsDeviceModalOpen(true);
  };

  // Open Device Modal (Edit Mode)
  const handleOpenEditModal = (device: Device) => {
    setEditingDevice(device);
    setFormName(device.name);
    setFormLocationId(device.locationId?.toString() || "");
    setFormStatus(device.status);
    setFormSerialNumber(device.serialNumber);
    setFormMacAddress(device.macAddress);
    setFormNetworkId(device.networkId?.toString() || "");
    setFormIpAddress(device.ipAddress);
    setFormIpAllocation(device.ipAllocation);
    setFormInterface(device.interface);
    setFormPrice(device.price.toString());
    setFormCommissioningDate(device.commissioningDate);
    setFormBatteryTypeId(device.batteryTypeId?.toString() || "");
    setFormMatterCode(device.matterCode);

    // Initialize form custom values from device data or set default
    const initialCustoms: Record<number, string> = {};
    customFields.forEach((field) => {
      initialCustoms[field.id] = device.customValues[field.id] !== undefined
        ? String(device.customValues[field.id])
        : (field.type === "boolean" ? "false" : "");
    });
    setFormCustomValues(initialCustoms);

    setFormInitialComment(device.description || "");
    setFormError(null);
    setIsDeviceModalOpen(true);
  };

  // Handle setting additions
  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;

    try {
      const res = await fetch("/api/settings/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLocationName })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Location "${data.name}" added successfully!`, "success");
        setNewLocationName("");
        loadData();
      } else {
        showToast(data.error || "Failed to add location", "error");
      }
    } catch {
      showToast("Network error creating location", "error");
    }
  };

  const handleAddNetwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNetworkName.trim()) return;

    try {
      const res = await fetch("/api/settings/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newNetworkName })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Network "${data.name}" added successfully!`, "success");
        setNewNetworkName("");
        loadData();
      } else {
        showToast(data.error || "Failed to add network", "error");
      }
    } catch {
      showToast("Network error creating network", "error");
    }
  };

  const handleAddBatteryType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatteryTypeName.trim()) return;

    try {
      const res = await fetch("/api/settings/battery-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBatteryTypeName })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Battery Type "${data.name}" added successfully!`, "success");
        setNewBatteryTypeName("");
        loadData();
      } else {
        showToast(data.error || "Failed to add battery type", "error");
      }
    } catch {
      showToast("Network error creating battery type", "error");
    }
  };

  const handleAddCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomFieldName.trim()) return;

    try {
      const res = await fetch("/api/settings/custom-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCustomFieldName, type: newCustomFieldType })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Custom Field "${data.name}" (${data.type}) created!`, "success");
        setNewCustomFieldName("");
        loadData();
      } else {
        showToast(data.error || "Failed to create custom field", "error");
      }
    } catch {
      showToast("Network error creating custom field", "error");
    }
  };

  // Delete Settings Handlers
  const handleDeleteLocation = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/settings/location/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(`Location "${name}" deleted successfully!`, "success");
        setSettingToDelete(null);
        loadData();
      } else {
        showToast(data.error || "Failed to delete location", "error");
      }
    } catch {
      showToast("Network error deleting location", "error");
    }
  };

  const handleDeleteNetwork = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/settings/network/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(`Network "${name}" deleted successfully!`, "success");
        setSettingToDelete(null);
        loadData();
      } else {
        showToast(data.error || "Failed to delete network", "error");
      }
    } catch {
      showToast("Network error deleting network", "error");
    }
  };

  const handleDeleteBatteryType = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/settings/battery-type/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(`Battery Type "${name}" deleted successfully!`, "success");
        setSettingToDelete(null);
        loadData();
      } else {
        showToast(data.error || "Failed to delete battery type", "error");
      }
    } catch {
      showToast("Network error deleting battery type", "error");
    }
  };

  const handleDeleteCustomField = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/settings/custom-field/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(`Custom Field "${name}" deleted successfully!`, "success");
        setSettingToDelete(null);
        loadData();
      } else {
        showToast(data.error || "Failed to delete custom field", "error");
      }
    } catch {
      showToast("Network error deleting custom field", "error");
    }
  };

  const handleAddInterface = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterfaceName.trim()) return;

    try {
      const res = await fetch("/api/settings/interface", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newInterfaceName })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Interface "${data.name}" added successfully!`, "success");
        setNewInterfaceName("");
        loadData();
      } else {
        showToast(data.error || "Failed to add interface", "error");
      }
    } catch {
      showToast("Network error creating interface", "error");
    }
  };

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusName.trim()) return;

    try {
      const res = await fetch("/api/settings/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStatusName })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Status "${data.name}" added successfully!`, "success");
        setNewStatusName("");
        loadData();
      } else {
        showToast(data.error || "Failed to add status", "error");
      }
    } catch {
      showToast("Network error creating status", "error");
    }
  };

  const handleDeleteInterface = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/settings/interface/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(`Interface "${name}" deleted successfully!`, "success");
        setSettingToDelete(null);
        loadData();
      } else {
        showToast(data.error || "Failed to delete interface", "error");
      }
    } catch {
      showToast("Network error deleting interface", "error");
    }
  };

  const handleDeleteStatus = async (id: number, name: string) => {
    try {
      const res = await fetch(`/api/settings/status/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(`Status "${name}" deleted successfully!`, "success");
        setSettingToDelete(null);
        loadData();
      } else {
        showToast(data.error || "Failed to delete status", "error");
      }
    } catch {
      showToast("Network error deleting status", "error");
    }
  };

  // Submit Device Profile (Add or Edit)
  const handleSubmitDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validations
    if (!formName.trim()) {
      setFormError("Device name is required.");
      return;
    }

    if (formMatterCode.trim() && !/^\d{4}-\d{3}-\d{4}$/.test(formMatterCode.trim())) {
      setFormError("Matter Code must be formatted as: xxxx-xxx-xxxx (e.g. 1234-567-8901)");
      return;
    }

    // Prepare payload
    const payload = {
      name: formName,
      locationId: formLocationId ? Number(formLocationId) : null,
      status: formStatus,
      serialNumber: formSerialNumber.trim() || null,
      macAddress: formMacAddress.trim() || null,
      networkId: formNetworkId ? Number(formNetworkId) : null,
      ipAddress: isIpSupported(formInterface) ? (formIpAddress.trim() || null) : null,
      ipAllocation: isIpSupported(formInterface) ? formIpAllocation : "DHCP",
      interface: formInterface,
      price: Number(formPrice) || 0,
      commissioningDate: formCommissioningDate,
      batteryTypeId: formBatteryTypeId ? Number(formBatteryTypeId) : null,
      matterCode: formMatterCode.trim() || null,
      customValues: formCustomValues,
      description: formInitialComment.trim() || null
    };

    const url = editingDevice ? `/api/devices/${editingDevice.id}` : "/api/devices";
    const method = editingDevice ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        showToast(
          editingDevice
            ? `Device "${formName}" updated successfully!`
            : `Device "${formName}" added successfully!`,
          "success"
        );
        setFormInitialComment("");
        setIsDeviceModalOpen(false);
        loadData();

        // If editing active device, update detail side panel trigger
        if (editingDevice) {
          setSelectedDevice(prev => prev && prev.id === editingDevice.id ? { ...prev, ...payload, id: prev.id } : prev);
        }
      } else {
        setFormError(data.error || "An error occurred while saving the device.");
      }
    } catch {
      setFormError("A network error occurred. Please try again.");
    }
  };

  // Delete Device (Soft Delete / Move to Trash)
  const handleDeleteDevice = async (id: number) => {
    try {
      const res = await fetch(`/api/devices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Device moved to Recycle Bin.", "success");
        if (selectedDevice && selectedDevice.id === id) {
          setSelectedDevice(null);
          setSelectedDeviceDetails(null);
        }
        setDeviceToDelete(null);
        loadData();
      } else {
        showToast(data.error || "Failed to move device to Trash", "error");
      }
    } catch {
      showToast("Network error deleting device", "error");
    }
  };

  // Permanent Delete Device (Completely erase from SQLite)
  const handlePermanentDeleteDevice = async (id: number) => {
    try {
      const res = await fetch(`/api/devices/${id}/permanent`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast("Device permanently deleted.", "success");
        if (selectedDevice && selectedDevice.id === id) {
          setSelectedDevice(null);
          setSelectedDeviceDetails(null);
        }
        setDeviceToDelete(null);
        loadData();
      } else {
        showToast(data.error || "Failed to permanently delete device", "error");
      }
    } catch {
      showToast("Network error permanently deleting device", "error");
    }
  };

  // Restore Device from Trash
  const handleRestoreDevice = async (id: number) => {
    try {
      const res = await fetch(`/api/devices/${id}/restore`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        showToast("Device restored from Recycle Bin.", "success");
        loadData();
      } else {
        showToast(data.error || "Failed to restore device", "error");
      }
    } catch {
      showToast("Network error restoring device", "error");
    }
  };

  // Submit a comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !newComment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/devices/${selectedDevice.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment })
      });
      const data = await res.json();

      if (res.ok) {
        setNewComment("");
        // Reload details to capture the new comment in history
        const detailsRes = await fetch(`/api/devices/${selectedDevice.id}`);
        if (detailsRes.ok) {
          const detailed = await detailsRes.json();
          setSelectedDeviceDetails(detailed);
        }
        // Update device count in device list
        setDevices(prevDevices =>
          prevDevices.map(d => d.id === selectedDevice.id ? { ...d, commentCount: d.commentCount + 1 } : d)
        );
        showToast("Comment added to logs.", "success");
      } else {
        showToast(data.error || "Failed to add comment", "error");
      }
    } catch {
      showToast("Network error posting comment", "error");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete comment from log
  const handleDeleteComment = async (commentId: number) => {
    if (!selectedDevice) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (res.ok) {
        // Reload details to capture updated history
        const detailsRes = await fetch(`/api/devices/${selectedDevice.id}`);
        if (detailsRes.ok) {
          const detailed = await detailsRes.json();
          setSelectedDeviceDetails(detailed);
        }
        // Update device count in device list
        setDevices(prevDevices =>
          prevDevices.map(d => d.id === selectedDevice.id ? { ...d, commentCount: Math.max(0, d.commentCount - 1) } : d)
        );
        setCommentIdConfirmDelete(null);
        showToast("Log entry deleted.", "success");
      } else {
        showToast(data.error || "Failed to delete log entry", "error");
      }
    } catch {
      showToast("Network error deleting log entry", "error");
    }
  };

  // Log battery swap event
  const handleLogBatterySwap = async () => {
    if (!selectedDevice || isLoggingBatterySwap) return;

    setIsLoggingBatterySwap(true);
    try {
      const batteryType = selectedDevice.batteryTypeName || "battery";
      const logContent = `🔋 Battery Swapped: Replaced with a fresh ${batteryType} cell.`;
      
      const res = await fetch(`/api/devices/${selectedDevice.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: logContent })
      });
      const data = await res.json();

      if (res.ok) {
        // Reload details to capture the new log entry
        const detailsRes = await fetch(`/api/devices/${selectedDevice.id}`);
        if (detailsRes.ok) {
          const detailed = await detailsRes.json();
          setSelectedDeviceDetails(detailed);
        }
        // Update comment/log count in device list
        setDevices(prevDevices =>
          prevDevices.map(d => d.id === selectedDevice.id ? { ...d, commentCount: d.commentCount + 1 } : d)
        );
        showToast("Battery swap logged successfully!", "success");
      } else {
        showToast(data.error || "Failed to log battery swap", "error");
      }
    } catch {
      showToast("Network error logging battery swap", "error");
    } finally {
      setIsLoggingBatterySwap(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredDevices.length === 0) {
      showToast("No devices to export", "error");
      return;
    }

    // Define headers
    const baseHeaders = [
      "ID",
      "Device Name",
      "Location",
      "Status",
      "Serial Number",
      "MAC Address",
      "Network",
      "IPv4 Address",
      "IP Allocation",
      "Connection Interface",
      "Price (RON)",
      "Commissioning Date",
      "Battery Specification",
      "Matter Code",
      "Comments Count"
    ];

    // Append custom fields to headers
    const customHeaders = customFields.map(cf => `${cf.name} (${cf.type})`);
    const headers = [...baseHeaders, ...customHeaders];

    // Helper to escape values for CSV
    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return "";
      let str = String(val);
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    // Build rows
    const rows = filteredDevices.map(device => {
      const baseValues = [
        device.id,
        device.name,
        device.locationName || "Unassigned",
        device.status,
        device.serialNumber || "",
        device.macAddress || "",
        device.networkName || "Unassigned",
        device.ipAddress || "",
        device.ipAllocation || "",
        device.interface,
        device.price,
        device.commissioningDate || "",
        device.batteryTypeName || "",
        device.matterCode || "",
        device.commentCount || 0
      ];

      const customValues = customFields.map(cf => {
        const val = device.customValues?.[cf.id];
        if (val === undefined || val === null) return "";
        return val;
      });

      return [...baseValues, ...customValues].map(escapeCSV).join(",");
    });

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows].join("\n");

    // Create file download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `homedome_devices_export_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("CSV exported successfully!", "success");
  };

  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let col = "";
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            col += '"';
            i++; // Skip next quote
          } else {
            inQuotes = false;
          }
        } else {
          col += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push(col);
          col = "";
        } else if (char === '\r' || char === '\n') {
          row.push(col);
          col = "";
          if (row.some(c => c !== "") || row.length > 1) {
            lines.push(row);
          }
          row = [];
          if (char === '\r' && nextChar === '\n') {
            i++; // Skip \n
          }
        } else {
          col += char;
        }
      }
    }
    if (col !== "" || row.length > 0) {
      row.push(col);
      if (row.some(c => c !== "") || row.length > 1) {
        lines.push(row);
      }
    }
    return lines;
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          showToast("No content found in file", "error");
          return;
        }

        const parsed = parseCSV(text);
        if (parsed.length < 2) {
          showToast("CSV must contain at least a header row and one data row", "error");
          return;
        }

        const headers = parsed[0].map(h => h.trim());
        const dataRows = parsed.slice(1);

        // Helper for fuzzy matching on columns
        const getIdx = (colNames: string[]) => {
          return headers.findIndex(h => {
            const cleanHeader = h.toLowerCase().trim();
            return colNames.some(target => {
              const cleanTarget = target.toLowerCase().trim();
              return cleanHeader === cleanTarget || 
                     cleanHeader.replace(/[^a-z0-9]/g, "") === cleanTarget.replace(/[^a-z0-9]/g, "");
            });
          });
        };

        const nameIdx = getIdx(["Device Name", "Name"]);
        const locationIdx = getIdx(["Location", "Room", "Area"]);
        const statusIdx = getIdx(["Status", "State"]);
        const serialIdx = getIdx(["Serial No.", "Serial Number", "Serial No", "Serial", "S/N"]);
        const macIdx = getIdx(["MAC/IEEE Address", "MAC Address", "MAC", "MAC/IEEE", "IEEE Address", "Hardware Address"]);
        const networkIdx = getIdx(["Network", "WiFi Network", "SSID"]);
        const ipIdx = getIdx(["IP Address", "IPv4 Address", "IP_Address", "IP", "IPv4"]);
        const ipAllocIdx = getIdx(["Allocation", "IP Allocation", "IP Allocation Type", "Allocation Type", "IP Type"]);
        const interfaceIdx = getIdx(["Interface", "Connection Interface", "Connection", "Hardware Interface"]);
        const priceIdx = getIdx(["Price", "Price (RON)", "Cost", "Value"]);
        const dateIdx = getIdx(["Commissioning date", "Commissioning Date", "Commissioning_Date", "Date"]);
        const batteryIdx = getIdx(["Battery Type", "Battery Specification", "Battery", "Battery Spec"]);
        const matterIdx = getIdx(["Matter Code", "Matter_Code", "Matter", "Matter Cert"]);
        const commentsIdx = getIdx(["Comments", "Comment", "Notes", "Description", "Log", "Logs", "Initial Comment"]);

        if (nameIdx === -1) {
          showToast("Invalid CSV format. Missing 'Device Name' column.", "error");
          return;
        }

        // Identify non-standard custom headers
        const standardIndices = new Set([
          nameIdx, locationIdx, statusIdx, serialIdx, macIdx, networkIdx,
          ipIdx, ipAllocIdx, interfaceIdx, priceIdx, dateIdx, batteryIdx, matterIdx, commentsIdx
        ]);

        const customFieldMapping: { colIdx: number; name: string }[] = [];
        headers.forEach((header, idx) => {
          if (idx !== nameIdx && !standardIndices.has(idx) && header.trim() !== "") {
            customFieldMapping.push({ colIdx: idx, name: header.trim() });
          }
        });

        // Compute matched columns count
        let matchedColsCount = 0;
        const potentialBaseFields = [
          nameIdx, locationIdx, statusIdx, serialIdx, macIdx, networkIdx,
          ipIdx, ipAllocIdx, interfaceIdx, priceIdx, dateIdx, batteryIdx, matterIdx, commentsIdx
        ];
        potentialBaseFields.forEach(idx => {
          if (idx !== -1) matchedColsCount++;
        });
        matchedColsCount += customFieldMapping.length;
        setCsvMatchedCount(matchedColsCount);

        const itemsToPreview: any[] = [];
        let indexId = 1;

        for (const row of dataRows) {
          const nameVal = row[nameIdx]?.trim();
          if (!nameVal) {
            continue;
          }

          const locationVal = locationIdx !== -1 ? row[locationIdx]?.trim() || "" : "";
          const statusVal = statusIdx !== -1 ? row[statusIdx]?.trim() || "Online" : "Online";
          const serialVal = serialIdx !== -1 ? row[serialIdx]?.trim() || "" : "";
          const macVal = macIdx !== -1 ? row[macIdx]?.trim() || "" : "";
          const networkVal = networkIdx !== -1 ? row[networkIdx]?.trim() || "" : "";
          const ipVal = ipIdx !== -1 ? row[ipIdx]?.trim() || "" : "";
          const ipAllocVal = ipAllocIdx !== -1 ? row[ipAllocIdx]?.trim() || "DHCP" : "DHCP";
          const interfaceVal = interfaceIdx !== -1 ? row[interfaceIdx]?.trim() || "WiFi" : "WiFi";

          let priceVal = 0;
          if (priceIdx !== -1 && row[priceIdx]) {
            const cleanPrice = row[priceIdx].replace(/[^\d.-]/g, "");
            priceVal = parseFloat(cleanPrice) || 0;
          }

          let dateVal = new Date().toISOString().split("T")[0];
          if (dateIdx !== -1 && row[dateIdx]) {
            const rawDate = row[dateIdx].trim();
            if (rawDate) {
              // 1. Try to match YYYY-MM-DD or YYYY/MM/DD with flexible spacing
              const matchYMD = rawDate.match(/^(\d{4})[-/ ]+(\d{1,2})[-/ ]+(\d{1,2})/);
              if (matchYMD) {
                const [_, y, m, d] = matchYMD;
                dateVal = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              } else {
                // 2. Try to match DD-MM-YYYY or MM-DD-YYYY or DD/MM/YYYY
                const matchDMY = rawDate.match(/^(\d{1,2})[-/ ]+(\d{1,2})[-/ ]+(\d{4})/);
                if (matchDMY) {
                  const [_, first, second, y] = matchDMY;
                  const val1 = parseInt(first, 10);
                  const val2 = parseInt(second, 10);
                  let day = val1;
                  let month = val2;
                  if (val1 > 12) {
                    day = val1;
                    month = val2;
                  } else if (val2 > 12) {
                    month = val1;
                    day = val2;
                  } else {
                    // Ambiguous (both <= 12), default to DD/MM/YYYY due to European RON context
                    day = val1;
                    month = val2;
                  }
                  dateVal = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                } else {
                  // 3. Fallback to JS Date constructor
                  const parsedDate = new Date(rawDate);
                  if (!isNaN(parsedDate.getTime())) {
                    const y = parsedDate.getFullYear();
                    const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
                    const d = String(parsedDate.getDate()).padStart(2, '0');
                    dateVal = `${y}-${m}-${d}`;
                  }
                }
              }
            }
          }

          const batteryVal = batteryIdx !== -1 ? row[batteryIdx]?.trim() || "" : "";
          const matterVal = matterIdx !== -1 ? row[matterIdx]?.trim() || "" : "";
          const commentsVal = commentsIdx !== -1 ? row[commentsIdx]?.trim() || "" : "";

          // Custom field values
          const customValues: Record<string, any> = {};
          customFieldMapping.forEach(({ colIdx, name }) => {
            const rawVal = row[colIdx];
            if (rawVal !== undefined && rawVal !== null) {
              customValues[name] = rawVal.trim();
            }
          });

          itemsToPreview.push({
            id: `csv-${indexId++}`,
            selected: true,
            name: nameVal,
            location: locationVal,
            status: statusVal,
            serialNumber: serialVal,
            macAddress: macVal,
            network: networkVal,
            ipAddress: ipVal,
            ipAllocation: ipAllocVal,
            interface: interfaceVal,
            price: priceVal,
            commissioningDate: dateVal,
            batteryType: batteryVal,
            matterCode: matterVal,
            initialComment: commentsVal,
            customValues
          });
        }

        if (itemsToPreview.length === 0) {
          showToast("No valid devices with names found in CSV.", "error");
          return;
        }

        setCsvHeaders(headers);
        setCsvPreviewItems(itemsToPreview);
        setIsCsvPreviewOpen(true);
        setIsSettingsOpen(false);
      } catch (err) {
        console.error(err);
        showToast("Error processing CSV file.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleConfirmImportCSV = async () => {
    const selectedItems = csvPreviewItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      showToast("Please select at least one device to import", "error");
      return;
    }

    setIsCsvImporting(true);

    try {
      const localLocations = [...locations];
      const localStatuses = [...statuses];
      const localNetworks = [...networks];
      const localBatteryTypes = [...batteryTypes];
      const localInterfaces = [...interfaces];
      const localCustomFields = [...customFields];

      // 0. Detect and auto-create unrecognized custom fields mentioned in selectedItems
      const customFieldNamesToCreate = new Set<string>();
      selectedItems.forEach(item => {
        if (item.customValues) {
          Object.keys(item.customValues).forEach(fieldName => {
            const exists = localCustomFields.some(cf => cf.name.toLowerCase() === fieldName.toLowerCase());
            if (!exists) {
              customFieldNamesToCreate.add(fieldName);
            }
          });
        }
      });

      // Create them dynamically on the backend
      for (const fieldName of Array.from(customFieldNamesToCreate)) {
        // Infer the type of this custom field across all selected items
        let isBool = true;
        let isNum = true;
        let hasVal = false;

        selectedItems.forEach(item => {
          const val = item.customValues[fieldName]?.trim();
          if (val) {
            hasVal = true;
            const lowerVal = val.toLowerCase();
            if (lowerVal !== "true" && lowerVal !== "false" && lowerVal !== "1" && lowerVal !== "0" && lowerVal !== "yes" && lowerVal !== "no") {
              isBool = false;
            }
            if (isNaN(Number(val.replace(/[^\d.-]/g, "")))) {
              isNum = false;
            }
          }
        });

        const inferredType: "text" | "number" | "boolean" = (hasVal && isBool) ? "boolean" : (hasVal && isNum) ? "number" : "text";

        try {
          const resCf = await fetch("/api/settings/custom-field", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: fieldName, type: inferredType })
          });
          if (resCf.ok) {
            const newCf = await resCf.json();
            localCustomFields.push(newCf);
          }
        } catch (err) {
          console.error("Auto-creating custom field failed", err);
        }
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of selectedItems) {
        // 1. Location
        let locationId: number | null = null;
        if (item.location) {
          const locName = item.location.trim();
          const matchedLoc = localLocations.find(l => l.name.toLowerCase() === locName.toLowerCase());
          if (matchedLoc) {
            locationId = matchedLoc.id;
          } else if (locName !== "Unassigned" && locName !== "") {
            try {
              const resLoc = await fetch("/api/settings/location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: locName })
              });
              if (resLoc.ok) {
                const newLoc = await resLoc.json();
                localLocations.push(newLoc);
                locationId = newLoc.id;
              }
            } catch (err) {
              console.error("Auto-creating location failed", err);
            }
          }
        }

        // 2. Status
        let statusVal = "Online";
        if (item.status) {
          const statusName = item.status.trim();
          const matchedSt = localStatuses.find(s => s.name.toLowerCase() === statusName.toLowerCase());
          if (matchedSt) {
            statusVal = matchedSt.name;
          } else if (statusName !== "") {
            try {
              const resSt = await fetch("/api/settings/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: statusName })
              });
              if (resSt.ok) {
                const newSt = await resSt.json();
                localStatuses.push(newSt);
                statusVal = newSt.name;
              }
            } catch (err) {
              console.error("Auto-creating status failed", err);
            }
          }
        }

        // 3. Network
        let networkId: number | null = null;
        if (item.network) {
          const netName = item.network.trim();
          const matchedNet = localNetworks.find(n => n.name.toLowerCase() === netName.toLowerCase());
          if (matchedNet) {
            networkId = matchedNet.id;
          } else if (netName !== "Unassigned" && netName !== "") {
            try {
              const resNet = await fetch("/api/settings/network", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: netName })
              });
              if (resNet.ok) {
                const newNet = await resNet.json();
                localNetworks.push(newNet);
                networkId = newNet.id;
              }
            } catch (err) {
              console.error("Auto-creating network failed", err);
            }
          }
        }

        // 4. Battery spec
        let batteryTypeId: number | null = null;
        if (item.batteryType) {
          const batName = item.batteryType.trim();
          const matchedBat = localBatteryTypes.find(b => b.name.toLowerCase() === batName.toLowerCase());
          if (matchedBat) {
            batteryTypeId = matchedBat.id;
          } else if (batName !== "Unassigned" && batName !== "") {
            try {
              const resBat = await fetch("/api/settings/battery-type", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: batName })
              });
              if (resBat.ok) {
                const newBat = await resBat.json();
                localBatteryTypes.push(newBat);
                batteryTypeId = newBat.id;
              }
            } catch (err) {
              console.error("Auto-creating battery spec failed", err);
            }
          }
        }

        // 5. Interface
        let interfaceVal = "WiFi";
        if (item.interface) {
          const interName = item.interface.trim();
          const matchedInter = localInterfaces.find(i => i.name.toLowerCase() === interName.toLowerCase());
          if (matchedInter) {
            interfaceVal = matchedInter.name;
          } else if (interName !== "") {
            try {
              const resInter = await fetch("/api/settings/interface", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: interName })
              });
              if (resInter.ok) {
                const newInter = await resInter.json();
                localInterfaces.push(newInter);
                interfaceVal = newInter.name;
              }
            } catch (err) {
              console.error("Auto-creating interface failed", err);
            }
          }
        }

        // Map customValues by actual database field IDs
        const dbCustomValues: Record<number, any> = {};
        if (item.customValues) {
          Object.entries(item.customValues).forEach(([fieldName, rawVal]) => {
            const cf = localCustomFields.find(c => c.name.toLowerCase() === fieldName.toLowerCase());
            if (cf && rawVal !== undefined && rawVal !== null) {
              const strVal = String(rawVal).trim();
              if (cf.type === "boolean") {
                dbCustomValues[cf.id] = strVal.toLowerCase() === "true" || strVal === "1" || strVal.toLowerCase() === "yes";
              } else if (cf.type === "number") {
                dbCustomValues[cf.id] = parseFloat(strVal.replace(/[^\d.-]/g, "")) || 0;
              } else {
                dbCustomValues[cf.id] = strVal;
              }
            }
          });
        }

        const devicePayload = {
          name: item.name,
          locationId,
          status: statusVal,
          serialNumber: item.serialNumber || null,
          macAddress: item.macAddress || null,
          networkId,
          ipAddress: isIpSupported(interfaceVal) ? (item.ipAddress || null) : null,
          ipAllocation: isIpSupported(interfaceVal) ? item.ipAllocation : "DHCP",
          interface: interfaceVal,
          price: item.price,
          commissioningDate: item.commissioningDate,
          batteryTypeId,
          matterCode: item.matterCode || null,
          customValues: dbCustomValues,
          description: item.initialComment || null
        };

        try {
          const res = await fetch("/api/devices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(devicePayload)
          });
          if (res.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        showToast(`Successfully imported ${successCount} devices!${failCount > 0 ? ` Failed to import ${failCount} rows.` : ""}`, "success");
        await loadData();
        setIsCsvPreviewOpen(false);
        setCsvPreviewItems([]);
      } else {
        showToast("Failed to import selected devices. Please check CSV format or connection.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error executing CSV import.", "error");
    } finally {
      setIsCsvImporting(false);
    }
  };

  // Reset Application
  const handleResetApplication = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/reset", {
        method: "POST"
      });
      if (!res.ok) {
        throw new Error("Failed to reset the application.");
      }
      const data = await res.json();
      showToast(data.message || "Application reset successfully.", "success");
      
      // Clear client states
      setSelectedDevice(null);
      setSelectedDeviceDetails(null);
      setResetWarningStep(0);
      setResetConfirmText("");
      setIsSettingsOpen(false);
      
      // Reload from database
      await loadData();
    } catch (err: any) {
      showToast(err.message || "An error occurred during reset.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Helpers
  const formatRON = (val: number) => {
    return new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON" }).format(val);
  };

  const isBatteryPowered = (typeName: string | null | undefined) => {
    if (!typeName) return false;
    const lower = typeName.toLowerCase();
    return !(
      lower === "mains powered" ||
      lower === "mains" ||
      lower === "none" ||
      lower === "not battery powered" ||
      lower === "none (not battery powered)" ||
      lower.includes("not battery") ||
      lower.includes("no battery") ||
      lower.includes("mains") ||
      lower.includes("main powered") ||
      lower.includes("usb") ||
      lower.includes("ac power") ||
      lower.includes("dc power") ||
      lower.includes("grid") ||
      lower.includes("plug") ||
      lower === "external"
    );
  };

  const isIpSupported = (interName: string | null | undefined) => {
    if (!interName) return false;
    const lower = interName.toLowerCase();
    return lower === "wifi" || lower === "wi-fi" || lower === "lan" || lower === "wlan";
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("ro-RO", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("ro-RO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  // Custom values display formatting helper
  const renderCustomValue = (fieldId: number, val: string) => {
    const field = customFields.find(cf => cf.id === fieldId);
    if (!field) return val;

    if (field.type === "boolean") {
      return val === "true" ? (
        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium text-xs bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
          <CheckCircle className="w-3 h-3" /> Yes
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-slate-400 font-medium text-xs bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
          <X className="w-3 h-3" /> No
        </span>
      );
    }
    if (field.type === "number") {
      return <span className="font-mono text-slate-800">{val || "0"}</span>;
    }
    return <span className="text-slate-700">{val || "—"}</span>;
  };

  // Memoized matching suggestions for predictive search
  const predictiveSuggestions = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase();
    return devices.filter((device) => {
      const matchesBin = viewTrashOnly ? device.isDeleted : !device.isDeleted;
      if (!matchesBin) return false;

      return (
        device.name.toLowerCase().includes(query) ||
        device.serialNumber.toLowerCase().includes(query) ||
        device.macAddress.toLowerCase().includes(query) ||
        device.ipAddress.toLowerCase().includes(query) ||
        device.matterCode.toLowerCase().includes(query) ||
        (device.description && device.description.toLowerCase().includes(query))
      );
    }).slice(0, 8);
  }, [searchTerm, devices, viewTrashOnly]);

  // Filter & Search Implementation
  const filteredDevices = devices.filter((device) => {
    const matchesBin = viewTrashOnly ? device.isDeleted : !device.isDeleted;
    if (!matchesBin) return false;

    const matchesSearch =
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.macAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.matterCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.description && device.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLocation = !filterLocation || device.locationId === Number(filterLocation);
    const matchesNetwork = !filterNetwork || device.networkId === Number(filterNetwork);
    const matchesInterface = !filterInterface || device.interface === filterInterface;
    const matchesStatus = !filterStatus || device.status === filterStatus;

    return matchesSearch && matchesLocation && matchesNetwork && matchesInterface && matchesStatus;
  });

  // Reset pagination on filter, search, or trash view changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterLocation, filterNetwork, filterInterface, filterStatus, viewTrashOnly]);

  const isPaginated = filterLocation === "";
  const devicesPerPage = 20;
  const totalPages = Math.ceil(filteredDevices.length / devicesPerPage);
  const paginatedDevices = isPaginated
    ? filteredDevices.slice((currentPage - 1) * devicesPerPage, currentPage * devicesPerPage)
    : filteredDevices;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-900 antialiased selection:bg-indigo-100">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm max-w-sm transition-all transform animate-in fade-in slide-in-from-top-4 duration-300 ${
          toast.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          <p className="font-medium leading-tight">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 p-2.5 rounded-xl text-white shadow-md shadow-indigo-100">
              <Cpu className="w-6 h-6" id="header-logo-icon" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                HomeDome
                <span className="text-[10px] uppercase tracking-wider font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                  SQLite Asset Manager
                </span>
              </h1>
              <p className="text-xs text-slate-500">Track smart home devices, dynamic field configurations & historic comment logs</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Recycle Bin Toggle */}
            <button
              onClick={() => {
                setViewTrashOnly(prev => !prev);
                setSelectedDevice(null);
                setSelectedDeviceDetails(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer border ${
                viewTrashOnly 
                  ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-transparent"
              }`}
              title={viewTrashOnly ? "Return to active devices" : "View deleted devices in Recycle Bin"}
            >
              <Trash2 className={`w-4 h-4 ${viewTrashOnly ? "text-rose-600" : "text-slate-500"}`} />
              Recycle Bin
              {devices.filter(d => d.isDeleted).length > 0 && (
                <span className="ml-0.5 bg-rose-600 text-white rounded-full text-[10px] w-4.5 h-4.5 flex items-center justify-center font-bold">
                  {devices.filter(d => d.isDeleted).length}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              title="Global Predefinitions & Custom fields configuration"
            >
              <SettingsIcon className="w-4 h-4 text-slate-500" />
              Settings
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition-all cursor-pointer"
              title="Export current devices to CSV file"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Export CSV
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md hover:shadow-lg hover:shadow-indigo-100 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Device
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Split Screen */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        
        {/* Left Side: Search, Filters, and Device List */}
        <section className="flex-1 flex flex-col gap-4 min-w-0 md:max-w-xl lg:max-w-2xl xl:max-w-3xl">
          
          {/* Filters Dashboard Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col gap-4">
            
            {/* Search Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search by name, serial number, MAC address, IP, Matter code..."
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-100 outline-hidden transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setShowSuggestions(false);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Floating suggestions dropdown */}
              {showSuggestions && searchTerm.trim() && predictiveSuggestions.length > 0 && (
                <>
                  {/* Invisible backdrop to dismiss dropdown */}
                  <div 
                    className="fixed inset-0 z-[45]"
                    onClick={() => setShowSuggestions(false)}
                  />
                  
                  {/* Dropdown menu */}
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                    {/* Header line */}
                    <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Predictive Matches</span>
                      <span className="text-[9px] text-slate-400 font-medium font-mono">{predictiveSuggestions.length} items found</span>
                    </div>
                    
                    <div className="divide-y divide-slate-100">
                      {predictiveSuggestions.map((dev) => {
                        const query = searchTerm.toLowerCase();
                        
                        // Find matches to highlight and display
                        const matchDetails: { label: string; element: React.ReactNode }[] = [];
                        
                        if (dev.serialNumber && dev.serialNumber.toLowerCase().includes(query)) {
                          matchDetails.push({ label: "S/N", element: highlightMatch(dev.serialNumber, searchTerm) });
                        }
                        if (dev.macAddress && dev.macAddress.toLowerCase().includes(query)) {
                          matchDetails.push({ label: "MAC", element: highlightMatch(dev.macAddress, searchTerm) });
                        }
                        if (dev.ipAddress && dev.ipAddress.toLowerCase().includes(query)) {
                          matchDetails.push({ label: "IP", element: highlightMatch(dev.ipAddress, searchTerm) });
                        }
                        if (dev.matterCode && dev.matterCode.toLowerCase().includes(query)) {
                          matchDetails.push({ label: "Matter", element: highlightMatch(dev.matterCode, searchTerm) });
                        }
                        if (dev.description && dev.description.toLowerCase().includes(query)) {
                          matchDetails.push({ label: "Desc", element: highlightMatch(dev.description, searchTerm) });
                        }

                        // Determine status colors for indicator dot
                        let statusColor = "bg-slate-300";
                        if (dev.status === "Online") statusColor = "bg-emerald-500";
                        else if (dev.status === "Offline") statusColor = "bg-rose-500";
                        else if (dev.status === "Standby") statusColor = "bg-amber-500";
                        else if (dev.status === "Maintenance") statusColor = "bg-sky-500";

                        return (
                          <div
                            key={dev.id}
                            onClick={() => {
                              setSearchTerm(dev.name);
                              setSelectedDevice(dev);
                              setActiveTabRight("details");
                              setShowSuggestions(false);
                            }}
                            className="px-3.5 py-2.5 hover:bg-indigo-50/50 cursor-pointer transition-colors flex items-center justify-between gap-3 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              {/* Device Name with Highlight */}
                              <div className="font-semibold text-slate-800 text-xs sm:text-sm truncate">
                                {highlightMatch(dev.name, searchTerm)}
                              </div>
                              
                              {/* Location and Network details */}
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5 truncate">
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm flex items-center gap-0.5">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {dev.locationName}
                                </span>
                                <span className="text-slate-300">|</span>
                                <span className="flex items-center gap-0.5">
                                  <Wifi className="w-2.5 h-2.5" />
                                  {dev.networkName}
                                </span>
                              </div>

                              {/* Highlighted matched sub-details if any */}
                              {matchDetails.length > 0 && (
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                  {matchDetails.map((m, idx) => (
                                    <span key={idx} className="inline-flex items-center gap-0.5 text-[9px] bg-slate-50 text-slate-600 px-1 py-0.5 rounded-md border border-slate-150 font-medium">
                                      <span className="text-slate-400 font-bold uppercase">{m.label}:</span>
                                      <span className="font-mono">{m.element}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Right block: Status, Interface */}
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                {dev.interface}
                              </span>
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-600">
                                <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`}></span>
                                {dev.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Collapsible/Grid Dropdown Filters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Location</label>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden focus:bg-white"
                >
                  <option value="">All Locations</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Network</label>
                <select
                  value={filterNetwork}
                  onChange={(e) => setFilterNetwork(e.target.value)}
                  className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden focus:bg-white"
                >
                  <option value="">All Networks</option>
                  {networks.map((net) => (
                    <option key={net.id} value={net.id}>{net.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Interface</label>
                <select
                  value={filterInterface}
                  onChange={(e) => setFilterInterface(e.target.value)}
                  className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden focus:bg-white"
                >
                  <option value="">All Interfaces</option>
                  {interfaces.map((inter) => (
                    <option key={inter.id} value={inter.name}>{inter.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="block w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 outline-hidden focus:bg-white"
                >
                  <option value="">All Statuses</option>
                  {statuses.map((st) => (
                    <option key={st.id} value={st.name}>{st.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter tags / active list reset */}
            {(searchTerm || filterLocation || filterNetwork || filterInterface || filterStatus) && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="text-slate-500">
                  {isPaginated && filteredDevices.length > devicesPerPage ? (
                    <>
                      Showing <b>{(currentPage - 1) * devicesPerPage + 1} - {Math.min(currentPage * devicesPerPage, filteredDevices.length)}</b> of <b>{filteredDevices.length}</b> filtered devices
                    </>
                  ) : (
                    <>
                      Showing <b>{filteredDevices.length}</b> of <b>{devices.length}</b> devices
                    </>
                  )}
                </span>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterLocation("");
                    setFilterNetwork("");
                    setFilterInterface("");
                    setFilterStatus("");
                  }}
                  className="text-indigo-600 font-semibold hover:text-indigo-800 cursor-pointer"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          {/* Devices Grid/List */}
          <div className="flex-1 flex flex-col gap-3 min-h-[400px]">
            {isLoading ? (
              <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-8">
                <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm text-slate-500 mt-3 font-medium">Loading smart devices list...</p>
              </div>
            ) : filteredDevices.length === 0 ? (
              <div className="flex-1 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center p-8">
                <div className="bg-slate-50 p-4 rounded-full text-slate-400 mb-3 border border-slate-100">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-slate-800 text-base">No devices matched your query</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">Try tweaking your search terms, adjusting dropdown filters, or add a brand new device.</p>
                <button
                  onClick={handleOpenAddModal}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Device
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid gap-3 overflow-y-auto max-h-[calc(100vh-340px)] pr-1">
                  {paginatedDevices.map((device) => {
                    const isSelected = selectedDevice?.id === device.id;
                    
                    // Status dot colors
                    let statusDotColor = "bg-slate-400";
                    let statusBadgeStyle = "bg-slate-50 text-slate-700 border-slate-200";
                    if (device.status === "Online") {
                      statusDotColor = "bg-emerald-500";
                      statusBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    } else if (device.status === "Offline") {
                      statusDotColor = "bg-rose-500";
                      statusBadgeStyle = "bg-rose-50 text-rose-700 border-rose-100";
                    } else if (device.status === "Standby") {
                      statusDotColor = "bg-amber-500";
                      statusBadgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
                    } else if (device.status === "Maintenance") {
                      statusDotColor = "bg-sky-500";
                      statusBadgeStyle = "bg-sky-50 text-sky-700 border-sky-100";
                    }

                    return (
                      <div
                        key={device.id}
                        onClick={() => {
                          setSelectedDevice(device);
                          setActiveTabRight("details");
                        }}
                        className={`group relative bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md flex flex-col justify-between gap-3 ${
                          isSelected 
                            ? "border-indigo-600 ring-2 ring-indigo-50/50" 
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {/* Top Row: Name and Quick Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                              {highlightMatch(device.name, searchTerm)}
                            </h4>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{device.locationName}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* Interface Badge */}
                            <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md">
                              {device.interface}
                            </span>
                            {/* Status Badge */}
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadgeStyle}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor}`}></span>
                              {device.status}
                            </span>
                          </div>
                        </div>

                        {/* Middle row: Network & IP */}
                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Network</span>
                            <span className="text-slate-700 font-medium truncate flex items-center gap-1">
                              <Wifi className="w-3 h-3 text-slate-400" />
                              {device.networkName}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">IPv4 Address</span>
                            <span className="text-slate-700 font-mono truncate">
                              {!isIpSupported(device.interface) ? (
                                <span className="text-slate-400 italic font-sans font-normal">N/A</span>
                              ) : device.ipAddress ? (
                                <>
                                  {highlightMatch(device.ipAddress, searchTerm)} <span className="text-[10px] text-slate-400">({device.ipAllocation === "Reserved DHCP" ? "Reserved" : device.ipAllocation})</span>
                                </>
                              ) : (
                                <span className="text-slate-400 italic font-sans">No IP Assigned</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Match details for non-visible fields */}
                        {searchTerm.trim() && (
                          (() => {
                            const q = searchTerm.toLowerCase();
                            const matches: { label: string; value: string }[] = [];
                            if (device.serialNumber && device.serialNumber.toLowerCase().includes(q) && !device.name.toLowerCase().includes(q)) {
                              matches.push({ label: "S/N", value: device.serialNumber });
                            }
                            if (device.macAddress && device.macAddress.toLowerCase().includes(q) && !device.name.toLowerCase().includes(q)) {
                              matches.push({ label: "MAC", value: device.macAddress });
                            }
                            if (device.matterCode && device.matterCode.toLowerCase().includes(q) && !device.name.toLowerCase().includes(q)) {
                              matches.push({ label: "Matter Code", value: device.matterCode });
                            }
                            if (device.description && device.description.toLowerCase().includes(q) && !device.name.toLowerCase().includes(q)) {
                              matches.push({ label: "Description", value: device.description });
                            }
                            if (matches.length > 0) {
                              return (
                                <div className="text-[11px] bg-amber-50/60 text-amber-900 px-2 py-1.5 rounded-lg border border-amber-100/70 flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-amber-950 uppercase tracking-wider text-[9px]">Matched Criteria:</span>
                                  {matches.map((m, idx) => (
                                    <span key={idx} className="font-medium bg-white px-1.5 py-0.5 rounded-md border border-amber-100 font-mono shadow-2xs">
                                      {m.label}: {highlightMatch(m.value, searchTerm)}
                                    </span>
                                  ))}
                                </div>
                              );
                            }
                            return null;
                          })()
                        )}

                        {/* Bottom row: Pricing, Comments Counter & Action buttons */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-0.5 text-xs">
                          <div className="flex items-center gap-3.5 text-slate-500">
                            {/* Price Metadata */}
                            <div className="flex items-center gap-1 text-slate-500" title="Estimated Price">
                              <span className="font-medium text-slate-600">{formatRON(device.price)}</span>
                            </div>
                            
                            {/* Comments Trigger Badge */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDevice(device);
                                setActiveTabRight("logs");
                              }}
                              className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-slate-600 hover:text-indigo-600 transition-all cursor-pointer group/cmt"
                              title={`${device.commentCount} comments/logs in history. Click to view detailed history log.`}
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400 group-hover/cmt:text-indigo-500 transition-colors" />
                              <span className="font-semibold text-[11px] group-hover/cmt:text-indigo-600 transition-colors">{device.commentCount}</span>
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {viewTrashOnly ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRestoreDevice(device.id);
                                  }}
                                  className="px-2 py-1 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer flex items-center gap-1 text-[11px] font-bold border border-emerald-100 bg-white"
                                  title="Restore Device from Recycle Bin"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Restore
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeviceToDelete(device);
                                  }}
                                  className="px-2 py-1 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 cursor-pointer flex items-center gap-1 text-[11px] font-bold border border-rose-100 bg-white"
                                  title="Permanently Delete Device"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Erase
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(device);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-50 cursor-pointer"
                                  title="Edit Device Specifications"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeviceToDelete(device);
                                  }}
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-50 cursor-pointer"
                                  title="Delete Device Profile"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {isPaginated && totalPages > 1 && (
                  <div className="flex items-center justify-between bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-xs">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-slate-500" /> Previous
                    </button>
                    
                    <span className="text-xs font-medium text-slate-500">
                      Page <span className="font-semibold text-slate-800">{currentPage}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
                      <span className="text-slate-400 font-normal"> ({filteredDevices.length} total)</span>
                    </span>
                    
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Device Detail View & Historic comment logs */}
        <section className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col max-h-[calc(100vh-130px)] md:sticky md:top-[84px]">
          {/* Section Mode Switcher (Tab Bar) */}
          <div className="flex border-b border-slate-200 bg-slate-50/80 flex-shrink-0">
            <button
              type="button"
              onClick={() => setActiveTabRight("details")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTabRight === "details"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/30"
              }`}
              disabled={!selectedDevice}
              title={selectedDevice ? "View current device specifications" : "Please select a device to see details"}
            >
              <Cpu className="w-4 h-4" />
              <span>Details</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTabRight("logs")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTabRight === "logs"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/30"
              }`}
              disabled={!selectedDevice}
              title={selectedDevice ? "View full maintenance logs and comments history" : "Please select a device to see details"}
            >
              <Clock className="w-4 h-4" />
              <span>Log & History</span>
              {selectedDevice && (
                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {selectedDevice.commentCount || 0}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTabRight("stats")}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTabRight === "stats"
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/30"
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Statistics</span>
            </button>
          </div>

          {(activeTabRight === "details" || activeTabRight === "logs") && selectedDevice ? (
            <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-200">
              {/* Detail Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between gap-4 flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">{selectedDevice.name}</h3>
                    <button
                      onClick={() => handleOpenEditModal(selectedDevice)}
                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
                      title="Edit Device Specifications"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700">{selectedDevice.locationName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500">Commissioned {formatDate(selectedDevice.commissioningDate)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    selectedDevice.status === "Online" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    selectedDevice.status === "Offline" ? "bg-rose-50 text-rose-700 border-rose-100" :
                    selectedDevice.status === "Standby" ? "bg-amber-50 text-amber-700 border-amber-100" :
                    "bg-sky-50 text-sky-700 border-sky-100"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      selectedDevice.status === "Online" ? "bg-emerald-500" :
                      selectedDevice.status === "Offline" ? "bg-rose-500" :
                      selectedDevice.status === "Standby" ? "bg-amber-500" : "bg-sky-500"
                    }`}></span>
                    {selectedDevice.status}
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    {formatRON(selectedDevice.price)}
                  </span>
                </div>
              </div>

              {activeTabRight === "details" ? (
                /* Scrollable details tab */
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  
                  {/* Core Specifications Grid */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Core Specifications</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Serial Number</span>
                        <span className="text-xs font-mono font-medium text-slate-800 truncate block bg-white px-2 py-1 rounded-md border border-slate-150">
                          {selectedDevice.serialNumber ? highlightMatch(selectedDevice.serialNumber, searchTerm) : <span className="text-slate-400 italic font-sans font-normal">Not Provided</span>}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">MAC / IEEE Address</span>
                        <span className="text-xs font-mono font-medium text-slate-800 truncate block bg-white px-2 py-1 rounded-md border border-slate-150">
                          {selectedDevice.macAddress ? highlightMatch(selectedDevice.macAddress, searchTerm) : <span className="text-slate-400 italic font-sans font-normal">Not Provided</span>}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Matter Code</span>
                        <span className="text-xs font-mono font-medium text-slate-800 truncate block bg-white px-2 py-1 rounded-md border border-slate-150">
                          {selectedDevice.matterCode ? highlightMatch(selectedDevice.matterCode, searchTerm) : <span className="text-slate-400 italic font-sans font-normal">Not Matter Cert</span>}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Network SSID</span>
                        <span className="text-xs font-medium text-slate-800 truncate block bg-white px-2 py-1 rounded-md border border-slate-150">
                          {selectedDevice.networkName}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">IPv4 Address</span>
                        <span className="text-xs font-medium text-slate-800 truncate block bg-white px-2 py-1 rounded-md border border-slate-150">
                          {!isIpSupported(selectedDevice.interface) ? (
                            <span className="text-slate-400 italic font-normal">N/A</span>
                          ) : selectedDevice.ipAddress ? (
                            <span className="font-mono">{highlightMatch(selectedDevice.ipAddress, searchTerm)} <span className="text-[9px] text-slate-400">({selectedDevice.ipAllocation})</span></span>
                          ) : (
                            <span className="text-slate-400 italic font-normal">No Connection</span>
                          )}
                        </span>
                      </div>

                      <div className="min-w-0 flex flex-col justify-between">
                        <div>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">
                            {isBatteryPowered(selectedDevice.batteryTypeName) ? "Battery Specification" : "Power Specification"}
                          </span>
                          <span className="text-xs font-medium text-slate-800 truncate block bg-white px-2 py-1 rounded-md border border-slate-150">
                            {selectedDevice.batteryTypeName}
                          </span>
                        </div>
                        {selectedDevice.batteryTypeName && isBatteryPowered(selectedDevice.batteryTypeName) && (
                          <button
                            onClick={handleLogBatterySwap}
                            disabled={isLoggingBatterySwap}
                            className="mt-1.5 flex items-center justify-center gap-1.5 px-2 py-1 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-700 hover:text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                            title="Log a battery swap event for this device"
                          >
                            <BatteryCharging className={`w-3.5 h-3.5 ${isLoggingBatterySwap ? "animate-spin" : ""}`} />
                            {isLoggingBatterySwap ? "Logging..." : "Log Battery Swap"}
                          </button>
                        )}
                      </div>

                      <div className="min-w-0">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Hardware Interface</span>
                        <span className="text-xs font-bold text-slate-700 truncate block bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {selectedDevice.interface}
                        </span>
                      </div>

                      <div className="col-span-2 sm:col-span-3 min-w-0 border-t border-slate-150 pt-3 mt-1">
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Description / Notes</span>
                        <div className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-150 leading-relaxed whitespace-pre-wrap max-h-[120px] overflow-y-auto">
                          {selectedDevice.description ? highlightMatch(selectedDevice.description, searchTerm) : <span className="text-slate-400 italic font-normal text-slate-400">No description provided</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Dynamics values */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        Custom Configurations
                      </h4>
                      {customFields.length === 0 && (
                        <button
                          onClick={() => {
                            setIsSettingsOpen(true);
                            setSettingsTab("custom_fields");
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                        >
                          + Create dynamic field
                        </button>
                      )}
                    </div>

                    {customFields.length === 0 ? (
                      <div className="text-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <p className="text-xs text-slate-400">No dynamic custom fields configured yet.</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Add custom fields in settings to track arbitrary parameters like firmware version, warranty details, etc.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {customFields.map((field) => {
                          const rawValue = selectedDevice.customValues[field.id];
                          return (
                            <div key={field.id} className="border border-slate-150 bg-white p-2.5 rounded-lg flex flex-col justify-between min-h-[54px]">
                              <span className="text-[10px] font-bold text-slate-400 uppercase truncate" title={field.name}>{field.name}</span>
                              <div className="mt-1 text-xs font-medium text-slate-900 truncate">
                                {renderCustomValue(field.id, rawValue)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Recent Logs Summary Card */}
                  <div className="border-t border-slate-100 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Recent Log Summary
                      </h4>
                      <button
                        onClick={() => setActiveTabRight("logs")}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        View & Post Comments ({selectedDevice.commentCount}) &rarr;
                      </button>
                    </div>

                    {!selectedDeviceDetails ? (
                      <div className="py-4 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                      </div>
                    ) : !selectedDeviceDetails.comments || selectedDeviceDetails.comments.length === 0 ? (
                      <div className="p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
                        <p className="text-xs text-slate-400">No log entries or comments found.</p>
                        <button
                          onClick={() => setActiveTabRight("logs")}
                          className="mt-1 text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Write the first note
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedDeviceDetails.comments.slice(0, 2).map((comment) => {
                          const isSystem = comment.content === "Device profile created." || comment.content === "Device specifications updated.";
                          return (
                            <div 
                              key={comment.id} 
                              className={`p-3 rounded-xl text-xs border ${
                                isSystem 
                                  ? "bg-indigo-50/40 border-indigo-100 text-slate-600" 
                                  : "bg-white border-slate-150 text-slate-700"
                              }`}
                            >
                              <p className="leading-relaxed line-clamp-2">{comment.content}</p>
                              <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                                <span className="font-semibold uppercase tracking-wider">
                                  {isSystem ? "✨ System Log" : "💬 Comment"}
                                </span>
                                <span>{formatTimestamp(comment.createdAt)}</span>
                              </div>
                            </div>
                          );
                        })}
                        {selectedDeviceDetails.comments.length > 2 && (
                          <button
                            onClick={() => setActiveTabRight("logs")}
                            className="w-full text-center py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            Show all {selectedDeviceDetails.comments.length} log entries
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* Scrollable FULL HEIGHT logs & comments tab */
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
                  <div className="p-4 pb-3 border-b border-slate-150 bg-white flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Full Maintenance History & Log
                      </h4>
                    </div>
                    <span className="bg-slate-100 text-slate-600 text-[10px] font-mono px-2 py-0.5 rounded-full border border-slate-200">
                      {selectedDeviceDetails?.comments?.length || 0} Entries
                    </span>
                  </div>

                  {/* Complete Log List */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {!selectedDeviceDetails ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                      </div>
                    ) : !selectedDeviceDetails.comments || selectedDeviceDetails.comments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-12 bg-white rounded-2xl border border-slate-100 p-6">
                        <MessageSquare className="w-8 h-8 mb-2 text-slate-300" />
                        <p className="text-xs font-medium text-slate-700">No log entries or comments found.</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs">Use the editor below to document hardware setup, firmware updates, or physical maintenance.</p>
                      </div>
                    ) : (
                      selectedDeviceDetails.comments.map((comment) => {
                        const isSystem = comment.content === "Device profile created." || comment.content === "Device specifications updated.";
                        const isConfirming = commentIdConfirmDelete === comment.id;
                        return (
                          <div 
                            key={comment.id} 
                            className={`p-4 rounded-xl text-xs border transition-all relative group ${
                              isSystem 
                                ? "bg-indigo-50/40 border-indigo-100 text-slate-700" 
                                : "bg-white border-slate-150 text-slate-800 shadow-xs"
                            }`}
                          >
                            {isConfirming ? (
                              <div className="flex items-center justify-between bg-rose-50 p-1.5 rounded-lg border border-rose-100 animate-in fade-in duration-200">
                                <span className="text-rose-700 font-semibold text-[11px]">Delete this entry?</span>
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-sm"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    onClick={() => setCommentIdConfirmDelete(null)}
                                    className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Keep
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="leading-relaxed whitespace-pre-line pr-6 text-slate-800">{comment.content}</p>
                                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                  <span className="font-bold text-[9px] uppercase tracking-wider text-indigo-600">
                                    {isSystem ? "✨ System Log" : "💬 Comment Note"}
                                  </span>
                                  <span>{formatTimestamp(comment.createdAt)}</span>
                                </div>
                                <button
                                  onClick={() => setCommentIdConfirmDelete(comment.id)}
                                  className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add comment form */}
                  <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
                    <form onSubmit={handleAddComment} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Post Status Update / Log Entry</span>
                        <button
                          type="button"
                          onClick={() => setIsLogCommentExpanded(true)}
                          className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer font-bold uppercase tracking-wider"
                          title="Expand comments field to larger window"
                        >
                          <Maximize2 className="w-3 h-3" />
                          Expand Field
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add multiple lines of status update or comment to logs..."
                          disabled={isSubmittingComment}
                          rows={2}
                          className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50 resize-y min-h-[44px]"
                        />
                        <button
                          type="submit"
                          disabled={!newComment.trim() || isSubmittingComment}
                          className="px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl flex items-center justify-center shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:shadow-none self-end h-[44px] flex-shrink-0 font-bold text-xs"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" /> Post
                        </button>
                      </div>
                    </form>
                  </div>

                </div>
              )}

            </div>
          ) : (
            <DeviceStatistics devices={devices.filter(d => !d.isDeleted)} locations={locations} networks={networks} />
          )}
        </section>

      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500">
          <div>
            Built with <b>SQLite</b>, <b>Express</b>, <b>React</b> & <b>Tailwind CSS</b>.
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">
              v1.0.1
            </span>
          </div>
        </div>
      </footer>

      {/* --- SETTINGS SLIDE-OVER PANEL --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            onClick={() => setIsSettingsOpen(false)} 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer"
          />

          {/* Panel Sheet */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-55 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">System Settings</h3>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs Selection */}
            <div className="flex flex-wrap border-b border-slate-100 px-2 bg-slate-50/60">
              <button
                onClick={() => setSettingsTab("locations")}
                className={`px-3 py-2 text-xs font-bold border-b-2 tracking-wide cursor-pointer transition-all ${
                  settingsTab === "locations" 
                    ? "border-indigo-600 text-indigo-650" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Locations
              </button>
              <button
                onClick={() => setSettingsTab("networks")}
                className={`px-3 py-2 text-xs font-bold border-b-2 tracking-wide cursor-pointer transition-all ${
                  settingsTab === "networks" 
                    ? "border-indigo-600 text-indigo-655" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Networks
              </button>
              <button
                onClick={() => setSettingsTab("battery_types")}
                className={`px-3 py-2 text-xs font-bold border-b-2 tracking-wide cursor-pointer transition-all ${
                  settingsTab === "battery_types" 
                    ? "border-indigo-600 text-indigo-655" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Batteries
              </button>
              <button
                onClick={() => setSettingsTab("interfaces")}
                className={`px-3 py-2 text-xs font-bold border-b-2 tracking-wide cursor-pointer transition-all ${
                  settingsTab === "interfaces" 
                    ? "border-indigo-600 text-indigo-655" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Interfaces
              </button>
              <button
                onClick={() => setSettingsTab("statuses")}
                className={`px-3 py-2 text-xs font-bold border-b-2 tracking-wide cursor-pointer transition-all ${
                  settingsTab === "statuses" 
                    ? "border-indigo-600 text-indigo-655" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Statuses
              </button>
              <button
                onClick={() => setSettingsTab("custom_fields")}
                className={`px-3 py-2 text-xs font-bold border-b-2 tracking-wide cursor-pointer transition-all ${
                  settingsTab === "custom_fields" 
                    ? "border-indigo-600 text-indigo-655" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                Custom Fields
              </button>
              <button
                onClick={() => {
                  setSettingsTab("reset");
                  setResetWarningStep(0);
                  setResetConfirmText("");
                }}
                className={`px-3 py-2 text-xs font-bold border-b-2 tracking-wide cursor-pointer transition-all ${
                  settingsTab === "reset" 
                    ? "border-rose-600 text-rose-600 bg-rose-50/50" 
                    : "border-transparent text-rose-500 hover:text-rose-700 hover:bg-rose-50/10"
                }`}
              >
                Reset App
              </button>
            </div>

            {/* Scrollable Settings Content */}
            <div className="flex-1 overflow-y-auto p-5">
              
              {/* LOCATIONS TAB */}
              {settingsTab === "locations" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddLocation} className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500">Create New Location</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLocationName}
                        onChange={(e) => setNewLocationName(e.target.value)}
                        placeholder="e.g. Attic, Dining Room..."
                        className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!newLocationName.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Configured Locations</h4>
                    <div className="divide-y divide-slate-100 border border-slate-150 rounded-xl bg-slate-50 overflow-hidden">
                      {locations.map((loc) => {
                        const isConfirming = settingToDelete?.type === "location" && settingToDelete?.id === loc.id;
                        return (
                          <div key={loc.id} className="p-2.5 text-xs bg-white font-medium flex items-center justify-between transition-all">
                            {isConfirming ? (
                              <div className="flex items-center justify-between w-full bg-rose-50 p-1 rounded-lg border border-rose-100 animate-in fade-in duration-200">
                                <span className="text-rose-700 font-semibold text-[10px]">Delete "{loc.name}"?</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDeleteLocation(loc.id, loc.name)}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setSettingToDelete(null)}
                                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-slate-700">{loc.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                    ID: {loc.id}
                                  </span>
                                  <button
                                    onClick={() => setSettingToDelete({ type: "location", id: loc.id, name: loc.name })}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-all"
                                    title="Delete Location"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* NETWORKS TAB */}
              {settingsTab === "networks" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddNetwork} className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500">Add New Network</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNetworkName}
                        onChange={(e) => setNewNetworkName(e.target.value)}
                        placeholder="e.g. Guest WiFi, Zigbee Extended..."
                        className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!newNetworkName.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Available Networks</h4>
                    <div className="divide-y divide-slate-100 border border-slate-150 rounded-xl bg-slate-50 overflow-hidden">
                      {networks.map((net) => {
                        const isConfirming = settingToDelete?.type === "network" && settingToDelete?.id === net.id;
                        return (
                          <div key={net.id} className="p-2.5 text-xs bg-white font-medium flex items-center justify-between transition-all">
                            {isConfirming ? (
                              <div className="flex items-center justify-between w-full bg-rose-50 p-1 rounded-lg border border-rose-100 animate-in fade-in duration-200">
                                <span className="text-rose-700 font-semibold text-[10px]">Delete "{net.name}"?</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDeleteNetwork(net.id, net.name)}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setSettingToDelete(null)}
                                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="flex items-center gap-1.5 text-slate-700">
                                  <Wifi className="w-3.5 h-3.5 text-slate-400" />
                                  {net.name}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                    ID: {net.id}
                                  </span>
                                  <button
                                    onClick={() => setSettingToDelete({ type: "network", id: net.id, name: net.name })}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-50 cursor-pointer transition-all"
                                    title="Delete Network"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* BATTERY TYPES TAB */}
              {settingsTab === "battery_types" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddBatteryType} className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500">Create Battery Power Profile</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newBatteryTypeName}
                        onChange={(e) => setNewBatteryTypeName(e.target.value)}
                        placeholder="e.g. CR2450, Rechargeable Pack..."
                        className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!newBatteryTypeName.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Battery specs</h4>
                    <div className="divide-y divide-slate-100 border border-slate-150 rounded-xl bg-slate-50 overflow-hidden">
                      {batteryTypes.map((bat) => {
                        const isConfirming = settingToDelete?.type === "battery_type" && settingToDelete?.id === bat.id;
                        return (
                          <div key={bat.id} className="p-2.5 text-xs bg-white font-medium flex items-center justify-between transition-all">
                            {isConfirming ? (
                              <div className="flex items-center justify-between w-full bg-rose-50 p-1 rounded-lg border border-rose-100 animate-in fade-in duration-200">
                                <span className="text-rose-700 font-semibold text-[10px]">Delete "{bat.name}"?</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDeleteBatteryType(bat.id, bat.name)}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setSettingToDelete(null)}
                                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-slate-700">{bat.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                    ID: {bat.id}
                                  </span>
                                  <button
                                    onClick={() => setSettingToDelete({ type: "battery_type", id: bat.id, name: bat.name })}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-50 cursor-pointer transition-all"
                                    title="Delete Battery Type"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* CUSTOM DYNAMIC FIELDS TAB */}
              {settingsTab === "custom_fields" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddCustomField} className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configure Dynamic Asset Parameter</h4>
                    
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Field Name</label>
                      <input
                        type="text"
                        value={newCustomFieldName}
                        onChange={(e) => setNewCustomFieldName(e.target.value)}
                        placeholder="e.g. Firmware Version, Warranty, Is Outdoor..."
                        className="block w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs px-2.5 py-1.5 outline-hidden"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Value Type</label>
                      <select
                        value={newCustomFieldType}
                        onChange={(e) => setNewCustomFieldType(e.target.value as any)}
                        className="block w-full bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 focus:border-indigo-500 outline-hidden"
                      >
                        <option value="text">Text string</option>
                        <option value="number">Numeric value</option>
                        <option value="boolean">Boolean (Yes / No)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!newCustomFieldName.trim()}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg cursor-pointer shadow-sm transition-all mt-1"
                    >
                      + Create Schema Attribute
                    </button>
                  </form>

                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Dynamic Attributes</h4>
                    <div className="divide-y divide-slate-100 border border-slate-150 rounded-xl bg-slate-50 overflow-hidden">
                      {customFields.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 bg-white italic">
                          No customized device fields configured yet.
                        </div>
                      ) : (
                        customFields.map((field) => {
                          const isConfirming = settingToDelete?.type === "custom_field" && settingToDelete?.id === field.id;
                          return (
                            <div key={field.id} className="p-2.5 text-xs bg-white font-medium flex items-center justify-between transition-all">
                              {isConfirming ? (
                                <div className="flex items-center justify-between w-full bg-rose-50 p-1 rounded-lg border border-rose-100 animate-in fade-in duration-200">
                                  <span className="text-rose-700 font-semibold text-[10px]">Delete "{field.name}"?</span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleDeleteCustomField(field.id, field.name)}
                                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      onClick={() => setSettingToDelete(null)}
                                      className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                    >
                                      No
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className="text-slate-700">{field.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                                      {field.type}
                                    </span>
                                    <button
                                      onClick={() => setSettingToDelete({ type: "custom_field", id: field.id, name: field.name })}
                                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-all"
                                      title="Delete Custom Field"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* INTERFACES TAB */}
              {settingsTab === "interfaces" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddInterface} className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500">Create New Connection Interface</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newInterfaceName}
                        onChange={(e) => setNewInterfaceName(e.target.value)}
                        placeholder="e.g. LoRaWAN, Cellular, Thread..."
                        className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!newInterfaceName.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Interfaces</h4>
                    <div className="divide-y divide-slate-100 border border-slate-150 rounded-xl bg-slate-50 overflow-hidden max-h-[300px] overflow-y-auto">
                      {interfaces.map((inter) => {
                        const isConfirming = settingToDelete?.type === "interface" && settingToDelete?.id === inter.id;
                        return (
                          <div key={inter.id} className="p-2.5 text-xs bg-white font-medium flex items-center justify-between transition-all">
                            {isConfirming ? (
                              <div className="flex items-center justify-between w-full bg-rose-50 p-1 rounded-lg border border-rose-100 animate-in fade-in duration-200">
                                <span className="text-rose-700 font-semibold text-[10px]">Delete "{inter.name}"?</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDeleteInterface(inter.id, inter.name)}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setSettingToDelete(null)}
                                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-slate-700">{inter.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                    ID: {inter.id}
                                  </span>
                                  <button
                                    onClick={() => setSettingToDelete({ type: "interface", id: inter.id, name: inter.name })}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-50 cursor-pointer transition-all"
                                    title="Delete Interface"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* STATUSES TAB */}
              {settingsTab === "statuses" && (
                <div className="space-y-4">
                  <form onSubmit={handleAddStatus} className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500">Create New Device Status</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newStatusName}
                        onChange={(e) => setNewStatusName(e.target.value)}
                        placeholder="e.g. Idle, Calibrating, Error..."
                        className="flex-1 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!newStatusName.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-all"
                      >
                        Add
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-slate-100 pt-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Registered Statuses</h4>
                    <div className="divide-y divide-slate-100 border border-slate-150 rounded-xl bg-slate-50 overflow-hidden max-h-[300px] overflow-y-auto">
                      {statuses.map((st) => {
                        const isConfirming = settingToDelete?.type === "status" && settingToDelete?.id === st.id;
                        return (
                          <div key={st.id} className="p-2.5 text-xs bg-white font-medium flex items-center justify-between transition-all">
                            {isConfirming ? (
                              <div className="flex items-center justify-between w-full bg-rose-50 p-1 rounded-lg border border-rose-100 animate-in fade-in duration-200">
                                <span className="text-rose-700 font-semibold text-[10px]">Delete "{st.name}"?</span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleDeleteStatus(st.id, st.name)}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setSettingToDelete(null)}
                                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[10px] font-bold cursor-pointer transition-all"
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-slate-700">{st.name}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                    ID: {st.id}
                                  </span>
                                  <button
                                    onClick={() => setSettingToDelete({ type: "status", id: st.id, name: st.name })}
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-50 cursor-pointer transition-all"
                                    title="Delete Status"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* RESET TAB */}
              {settingsTab === "reset" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-rose-700">
                      <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      <h4 className="font-bold text-xs uppercase tracking-wider">Destructive Operation: System Reset</h4>
                    </div>
                    <p className="text-xs text-slate-650 leading-relaxed">
                      Resetting the application will completely purge the device catalog from the database. This includes:
                    </p>
                    <ul className="list-disc pl-4.5 text-xs text-slate-600 space-y-1">
                      <li>All registered smart devices</li>
                      <li>Custom-configured asset parameters for those devices</li>
                      <li>All historic comment/activity logs and battery swap history</li>
                    </ul>
                    <p className="text-xs text-slate-500 italic border-t border-rose-100/60 pt-2.5">
                      Note: Your system presets (locations, networks, batteries, connection interfaces, statuses, and custom attribute definitions) will remain intact so you don't have to recreate them from scratch.
                    </p>
                  </div>

                  {resetWarningStep === 0 && (
                    <button
                      onClick={() => setResetWarningStep(1)}
                      className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete All Devices & Reset App</span>
                    </button>
                  )}

                  {resetWarningStep === 1 && (
                    <div className="border border-amber-200 bg-amber-50/70 p-4 rounded-xl space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 text-amber-800">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 animate-pulse" />
                        <span className="font-bold text-xs uppercase tracking-wider">⚠️ Warning 1 of 2: Confirm Deletion</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-normal font-medium">
                        Are you sure you want to proceed? This will wipe your entire device catalog. There is no backup or recovery option!
                      </p>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setResetWarningStep(2)}
                          className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Yes, I understand. Continue
                        </button>
                        <button
                          onClick={() => {
                            setResetWarningStep(0);
                            setResetConfirmText("");
                          }}
                          className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {resetWarningStep === 2 && (
                    <div className="border border-rose-200 bg-rose-50/70 p-4 rounded-xl space-y-3.5 animate-in fade-in duration-200">
                      <div className="flex items-center gap-1.5 text-rose-800">
                        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 animate-bounce" />
                        <span className="font-bold text-xs uppercase tracking-wider">🚨 Final Warning 2 of 2: Irreversible</span>
                      </div>
                      <p className="text-xs text-rose-800 font-semibold leading-normal">
                        This action cannot be undone! To prevent accidental triggers, please type the word <strong className="underline text-rose-900">RESET</strong> in the input field below to unlock the final reset button.
                      </p>
                      
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={resetConfirmText}
                          onChange={(e) => setResetConfirmText(e.target.value)}
                          placeholder="Type 'RESET' in uppercase..."
                          className="w-full bg-white border border-rose-200 focus:border-rose-500 rounded-lg text-xs px-2.5 py-1.5 font-bold outline-hidden text-center placeholder:font-normal placeholder:text-rose-300"
                        />
                        
                        <div className="flex gap-2">
                          <button
                            onClick={handleResetApplication}
                            disabled={resetConfirmText !== "RESET" || isLoading}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg cursor-pointer transition-all uppercase tracking-wide flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Confirm & Wipe All Devices</span>
                          </button>
                          <button
                            onClick={() => {
                              setResetWarningStep(0);
                              setResetConfirmText("");
                            }}
                            className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-all"
                          >
                            Abort
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* CSV Import Footer Section */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <Upload className="w-3.5 h-3.5 text-indigo-600" />
                <span>Import Devices from CSV</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Upload a CSV file containing your smart devices. Missing locations, networks, battery specifications, statuses, or interfaces will be automatically registered dynamically.
              </p>
              <label className="flex flex-col items-center justify-center border border-dashed border-slate-200 bg-white hover:bg-slate-50/50 hover:border-indigo-400 p-3 rounded-xl cursor-pointer transition-all shadow-xs">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600">Select exported CSV file...</span>
                </div>
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleImportCSV} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT DEVICE MODAL DIALOG --- */}
      {isDeviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200 p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setIsDeviceModalOpen(false)} 
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingDevice ? `Modify Device Profile: ${editingDevice.name}` : "Commission New Smart Device"}
                </h3>
              </div>
              <button 
                onClick={() => setIsDeviceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-150 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner inside form */}
            {formError && (
              <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitDevice} className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* SECTION 1: Identity & Location */}
              <div className="space-y-3.5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">1. Identity & Context</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 col-span-1 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Device Name *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Living Room AC, Smart Lock"
                      required
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Device Status *</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden"
                    >
                      {statuses.map(st => (
                        <option key={st.id} value={st.name}>{st.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Location *</label>
                    <select
                      value={formLocationId}
                      onChange={(e) => setFormLocationId(e.target.value)}
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden"
                    >
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Commissioning Date *</label>
                    <input
                      type="date"
                      value={formCommissioningDate}
                      onChange={(e) => setFormCommissioningDate(e.target.value)}
                      required
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Price (RON) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      min="0"
                      required
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Connectivity & Network */}
              <div className="space-y-3.5 pt-1">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">2. Network & Connections</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Network *</label>
                    <select
                      value={formNetworkId}
                      onChange={(e) => setFormNetworkId(e.target.value)}
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden"
                    >
                      {networks.map(net => (
                        <option key={net.id} value={net.id}>{net.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Interface *</label>
                    <select
                      value={formInterface}
                      onChange={(e) => setFormInterface(e.target.value)}
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden"
                    >
                      {interfaces.map(inter => (
                        <option key={inter.id} value={inter.name}>{inter.name}</option>
                      ))}
                    </select>
                  </div>

                  {isIpSupported(formInterface) && (
                    <>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">IP Allocation *</label>
                        <select
                          value={formIpAllocation}
                          onChange={(e) => setFormIpAllocation(e.target.value)}
                          className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden"
                        >
                          <option value="DHCP">DHCP</option>
                          <option value="Reserved DHCP">Reserved DHCP</option>
                          <option value="Static">Static</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">IPv4 Address</label>
                        <input
                          type="text"
                          value={formIpAddress}
                          onChange={(e) => setFormIpAddress(e.target.value)}
                          placeholder="e.g. 192.168.1.100"
                          className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden font-mono"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1 col-span-1 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">MAC / IEEE Address</label>
                    <input
                      type="text"
                      value={formMacAddress}
                      onChange={(e) => setFormMacAddress(e.target.value)}
                      placeholder="e.g. AA:BB:CC:DD:EE:FF"
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Hardware Specifications */}
              <div className="space-y-3.5 pt-1">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">3. Hardware Specifications</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serial Number</label>
                    <input
                      type="text"
                      value={formSerialNumber}
                      onChange={(e) => setFormSerialNumber(e.target.value)}
                      placeholder="e.g. SN-99814-A"
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Battery / Power Type *</label>
                    <select
                      value={formBatteryTypeId}
                      onChange={(e) => setFormBatteryTypeId(e.target.value)}
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden"
                    >
                      {batteryTypes.map(bat => (
                        <option key={bat.id} value={bat.id}>{bat.name}</option>
                      ))}
                    </select>
                    {(() => {
                      const selectedType = batteryTypes.find(b => b.id.toString() === formBatteryTypeId);
                      if (!selectedType) return null;
                      const isBattery = isBatteryPowered(selectedType.name);
                      return (
                        <span className={`block text-[9px] font-semibold leading-tight mt-1 ${isBattery ? "text-slate-400" : "text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100/50"}`}>
                          {isBattery 
                            ? "🔋 Battery-powered device (Battery Swap logs enabled)" 
                            : "🔌 Mains/External powered (No Battery Swap action)"}
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Matter Code</label>
                    <input
                      type="text"
                      value={formMatterCode}
                      onChange={(e) => setFormMatterCode(e.target.value)}
                      placeholder="Format: xxxx-xxx-xxxx"
                      className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden font-mono"
                    />
                    <span className="block text-[9px] text-slate-400">Matter format: 4-3-4 digits</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Dynamic parameters configured by settings */}
              {customFields.length > 0 && (
                <div className="space-y-3.5 pt-1">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">4. Customized Fields</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/50">
                    {customFields.map((field) => {
                      return (
                        <div key={field.id} className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-650 uppercase tracking-wider">
                            {field.name} <span className="text-[8px] text-slate-400 uppercase font-semibold">({field.type})</span>
                          </label>

                          {field.type === "boolean" ? (
                            <select
                              value={formCustomValues[field.id] || "false"}
                              onChange={(e) => setFormCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                              className="block w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs px-3 py-1.5 outline-hidden"
                            >
                              <option value="false">No (False)</option>
                              <option value="true">Yes (True)</option>
                            </select>
                          ) : field.type === "number" ? (
                            <input
                              type="number"
                              value={formCustomValues[field.id] || ""}
                              onChange={(e) => setFormCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                              placeholder="e.g. 1.2"
                              className="block w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs px-3 py-1.5 outline-hidden font-mono"
                            />
                          ) : (
                            <input
                              type="text"
                              value={formCustomValues[field.id] || ""}
                              onChange={(e) => setFormCustomValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                              placeholder="Type customized text..."
                              className="block w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs px-3 py-1.5 outline-hidden"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION 5: Description (Optional) */}
              <div className="space-y-3.5 pt-1">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">5. Description (Optional)</h4>
                  <button
                    type="button"
                    onClick={() => setIsFormCommentExpanded(true)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    title="Expand description field to larger window"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Expand Field
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    value={formInitialComment}
                    onChange={(e) => setFormInitialComment(e.target.value)}
                    placeholder="Add optional description, notes, or comments about this device's deployment status, location specific nuances, or setup observations..."
                    rows={3}
                    className="block w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs px-3 py-2 outline-hidden resize-y min-h-[72px]"
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2 bg-white sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsDeviceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all cursor-pointer"
                >
                  {editingDevice ? "Save Changes" : "Commission Device"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- DELETE DEVICE CONFIRMATION MODAL --- */}
      {deviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            onClick={() => setDeviceToDelete(null)} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Container */}
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            {/* Warning Icon & Header */}
            <div className="flex items-start gap-4">
              <div className="bg-rose-50 p-3 rounded-full text-rose-600 border border-rose-100 flex-shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base">
                  {deviceToDelete.isDeleted ? "Permanently Delete Device" : "Move Device to Recycle Bin"}
                </h3>
                <p className="text-xs text-slate-500">
                  {deviceToDelete.isDeleted 
                    ? "This action cannot be undone and will delete all associated logs." 
                    : "You can restore this device later from the Recycle Bin."}
                </p>
              </div>
            </div>

            {/* Warning Message details */}
            <div className="bg-rose-50/30 border border-rose-100/50 p-4 rounded-xl text-xs text-slate-700 leading-relaxed">
              {deviceToDelete.isDeleted ? (
                <>
                  Are you sure you want to permanently delete <span className="font-bold text-slate-900">"{deviceToDelete.name}"</span>? 
                  This will erase its specifications, dynamic configurations, and comment logs forever.
                </>
              ) : (
                <>
                  Are you sure you want to move <span className="font-bold text-slate-900">"{deviceToDelete.name}"</span> to the Recycle Bin? 
                  Active statistics and status metrics will exclude this device.
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 mt-2">
              <button
                type="button"
                onClick={() => setDeviceToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                {deviceToDelete.isDeleted ? "No, Keep Device" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deviceToDelete.isDeleted) {
                    handlePermanentDeleteDevice(deviceToDelete.id);
                  } else {
                    handleDeleteDevice(deviceToDelete.id);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-rose-100 hover:shadow-lg transition-all cursor-pointer"
              >
                {deviceToDelete.isDeleted ? "Yes, Delete Permanently" : "Yes, Move to Trash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CSV PREVIEW MODAL --- */}
      {isCsvPreviewOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center animate-in fade-in duration-200 p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setIsCsvPreviewOpen(false)} 
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 animate-pulse" />
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Preview CSV Import
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Verify matched attributes and select devices to include. Missing locations or networks will be registered.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsCsvPreviewOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-150 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mappings Banner info */}
            <div className="bg-indigo-50/50 border-b border-indigo-100/60 p-3.5 px-5 flex items-start gap-2.5 text-xs text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-indigo-950">Auto-Mapped Attributes:</span> HomeDome matched <span className="font-bold text-indigo-900 bg-indigo-100/80 px-1.5 py-0.5 rounded-md font-mono">{csvMatchedCount} columns</span> from your CSV. Non-matching columns are ignored.
              </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-auto p-5">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                    <th className="py-2.5 px-3 text-center w-12">
                      <input 
                        type="checkbox"
                        checked={csvPreviewItems.length > 0 && csvPreviewItems.every(i => i.selected)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setCsvPreviewItems(prev => prev.map(item => ({ ...item, selected: checked })));
                        }}
                        className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3">Device Name</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Interface</th>
                    <th className="py-2.5 px-3">IPv4 Address</th>
                    <th className="py-2.5 px-3">Network</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Specs Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {csvPreviewItems.map((item) => {
                    const isIpOk = isIpSupported(item.interface);
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${!item.selected ? 'opacity-60 bg-slate-50/30' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <input 
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setCsvPreviewItems(prev => prev.map(i => i.id === item.id ? { ...i, selected: checked } : i));
                            }}
                            className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {item.name}
                        </td>
                        <td className="py-3 px-3">
                          {item.location ? (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-amber-100">
                              <MapPin className="w-2.5 h-2.5" />
                              {item.location}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-slate-200">
                            {item.interface}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          {!isIpOk ? (
                            <span className="text-slate-400 italic">N/A</span>
                          ) : item.ipAddress ? (
                            <span>{item.ipAddress} <span className="text-[9px] text-slate-400">({item.ipAllocation})</span></span>
                          ) : (
                            <span className="text-slate-400 italic">DHCP Assign</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.network ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-medium border border-indigo-100">
                              <Wifi className="w-2.5 h-2.5" />
                              {item.network}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                            item.status?.toLowerCase() === "online" 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {item.status || "Online"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px] space-y-0.5 max-w-xs truncate">
                          {item.serialNumber && <div>S/N: <span className="font-mono">{item.serialNumber}</span></div>}
                          {item.macAddress && <div>MAC: <span className="font-mono">{item.macAddress}</span></div>}
                          {item.batteryType && <div>Bat: {item.batteryType}</div>}
                          {item.matterCode && <div>Matter: {item.matterCode}</div>}
                          {item.price > 0 && <div>Price: {item.price} RON</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="text-xs text-slate-600 font-medium">
                Selected: <span className="text-indigo-600 font-bold">{csvPreviewItems.filter(i => i.selected).length}</span> of <span className="font-bold text-slate-700">{csvPreviewItems.length}</span> devices
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isCsvImporting}
                  onClick={() => {
                    setIsCsvPreviewOpen(false);
                    setCsvPreviewItems([]);
                  }}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isCsvImporting || csvPreviewItems.filter(i => i.selected).length === 0}
                  onClick={handleConfirmImportCSV}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-100 hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {isCsvImporting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Confirm & Import"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- FORM COMMENT EXPAND MODAL --- */}
      {isFormCommentExpanded && (
        <div className="fixed inset-0 z-60 flex items-center justify-center animate-in fade-in duration-200 p-4">
          <div 
            onClick={() => setIsFormCommentExpanded(false)} 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Device Description / Notes
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    {editingDevice ? `Editing description for: ${editingDevice.name}` : "Drafting initial setup description"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsFormCommentExpanded(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-150 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-5">
              <textarea
                value={formInitialComment}
                onChange={(e) => setFormInitialComment(e.target.value)}
                placeholder="Write multiple lines of description, detailed notes, deployment nuances, hardware specifications, or context about this device here..."
                rows={12}
                autoFocus
                className="w-full h-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs p-4 outline-hidden resize-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans leading-relaxed"
              />
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">
                {formInitialComment.length} characters | {formInitialComment.split("\n").filter(Boolean).length} paragraphs
              </span>
              <button
                type="button"
                onClick={() => setIsFormCommentExpanded(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- LOG COMMENT EXPAND MODAL --- */}
      {isLogCommentExpanded && (
        <div className="fixed inset-0 z-60 flex items-center justify-center animate-in fade-in duration-200 p-4">
          <div 
            onClick={() => setIsLogCommentExpanded(false)} 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs cursor-pointer"
          />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Detailed Device Log / Status Comment
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                    {selectedDevice ? `Posting to log of: ${selectedDevice.name}` : "Drafting log message"}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsLogCommentExpanded(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-150 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-5">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write multiple lines describing maintenance details, battery swaps, network configuration shifts, or any other dynamic observations..."
                rows={12}
                autoFocus
                className="w-full h-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs p-4 outline-hidden resize-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans leading-relaxed"
              />
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">
                {newComment.length} characters | {newComment.split("\n").filter(Boolean).length} paragraphs
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLogCommentExpanded(false)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newComment.trim() || isSubmittingComment}
                  onClick={async (e) => {
                    setIsLogCommentExpanded(false);
                    await handleAddComment(e);
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
