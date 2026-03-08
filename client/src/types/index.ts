export type Role = 'Resident' | 'Collector' | 'Admin';

export interface Location {
  id: string;
  lga: string; // Local Government Area
  ward: string;
  street: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: Role;
  locationId?: string; // Optional for Admins sometimes, but mostly used for Residents
  createdAt: string;
}

export type RequestStatus = 'Pending' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'Payment Pending' | 'Declined';

export type Severity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface WasteRequest {
  id: string;
  residentId: string;
  collectorId?: string;
  locationId: string;
  street: string;
  landmark?: string;
  status: RequestStatus;
  severity: Severity;
  type: 'General' | 'Recyclables' | 'Hazardous' | 'Bulky';
  requestedDate: string;
  preferredDate?: string; // New field for missed schedule requests
  completedDate?: string;
  notes?: string;
  imageUrl?: string;
  cost?: number; // Added for payment flow
}

export type NotificationType = 'StatusUpdate' | 'Reminder' | 'System';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  date: string;
  type: NotificationType;
  read: boolean;
}

export interface CollectionSchedule {
  id: string;
  locationId: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  nextPickup: string;
}

export type RouteStatus = 'Pending' | 'InProgress' | 'Paused' | 'Completed';
export type StopStatus = 'Pending' | 'Completed' | 'Skipped';

export interface TrafficSummary {
  condition: 'Clear' | 'Moderate' | 'Heavy';
  delay: string; // e.g., '+5 mins'
  message: string;
}

export interface WeatherSummary {
  condition: 'Sunny' | 'Cloudy' | 'Rain' | 'Storm';
  temperature: string;
  warning?: string;
}

export interface RouteStop {
  id: string;
  address: string;
  landmark?: string;
  street: string;
  ward: string;
  lga: string;
  coordinates: { latitude: number; longitude: number };
  wasteType: WasteRequest['type'];
  severity: Severity;
  status: StopStatus;
  residentNote?: string;
  collectionNote?: string;
  reportsCount: number; // For grouping multiple bags/reports at one stop
}

export interface AssignmentRoute {
  id: string;
  collectorId: string;
  title: string;
  area: string;
  collectionDate: string;
  estimatedDistance: string; // e.g., "12 km"
  estimatedDuration: string; // e.g., "2 hours"
  actualDuration?: string;
  traffic: TrafficSummary;
  weather: WeatherSummary;
  stops: RouteStop[];
  status: RouteStatus;
}

export interface AdminStats {
  totalReports: number;
  pendingReports: number;
  resolvedReports: number;
  totalCollectors: number;
  activeRoutes: number;
  activeSchedules: number;
}

export interface AreaNode {
  lga: string;
  wards: {
    name: string;
    streets: {
      name: string;
      houseCount: number;
    }[];
  }[];
}

export interface CollectorStats {
  collectorId: string;
  name: string;
  activeRoutesCount: number;
  completedRoutesCount: number;
  assignedAreas: string[];
}
