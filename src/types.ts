export interface Comment {
  id: number;
  content: string;
  createdAt: string;
}

export interface Location {
  id: number;
  name: string;
}

export interface Network {
  id: number;
  name: string;
}

export interface BatteryType {
  id: number;
  name: string;
}

export interface DeviceInterface {
  id: number;
  name: string;
}

export interface DeviceStatus {
  id: number;
  name: string;
}

export interface CustomField {
  id: number;
  name: string;
  type: "text" | "number" | "boolean";
}

export interface DeviceRelation {
  id: number;
  name: string;
  serialNumber?: string;
}

export interface Device {
  id: number;
  name: string;
  locationId: number | null;
  locationName: string;
  status: string;
  serialNumber: string;
  macAddress: string;
  networkId: number | null;
  networkName: string;
  ipAddress: string;
  ipAllocation: string;
  interface: string;
  price: number;
  commissioningDate: string;
  batteryTypeId: number | null;
  batteryTypeName: string;
  matterCode: string;
  customValues: Record<number, string>; // keyed by custom_field.id
  commentCount: number;
  comments?: Comment[];
  description?: string;
  isDeleted?: boolean;
  relatedDeviceId?: number | null;
  relatedDeviceName?: string;
  relatedDevices?: DeviceRelation[];
  referencedByDevices?: DeviceRelation[];
}
