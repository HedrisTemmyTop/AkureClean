export type Role = 'resident' | 'driver' | 'admin';

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  houseDescription?: string;
  localGovt?: string;
  ward?: string;
  pollingUnit?: string;
  housingType?: string;
  houseType?: string;
  numberOfRooms?: number;
  numberOfShops?: number;
  numberOfWorkersRange?: string;
  truckPlateNumber?: string;
  vehiclePlate?: string;
  vehicleNumber?: string;
  truckCapacity?: string;
  status?: string;
  isActive?: boolean;
  isDeactivated?: boolean;
  deactivationReason?: string;
  role: Role;
  location?: {
    type?: string;
    coordinates?: [number, number];
  };
  createdAt?: string;
}

export type RouteStatus = 'Pending' | 'InProgress' | 'Paused' | 'Completed' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type StopStatus = 'Pending' | 'Completed' | 'Skipped' | 'pending' | 'completed' | 'skipped';

export interface RouteStop {
  id: string;
  _id?: string;
  address?: string;
  landmark?: string;
  street?: string;
  ward?: string;
  lga?: string;
  pollingUnit?: string;
  coordinates?: { latitude: number; longitude: number };
  location?: { type: string; coordinates: [number, number] };
  wasteType?: string;
  severity?: string;
  status: any;
  resident?: any;
  residentNote?: string;
  collectionNote?: string;
  skipReason?: string;
  reportsCount?: number;
  verificationStatus?: any;
  adminNote?: string;
  adminReviewedAt?: string;
  adminReviewedBy?: any;
  collectedAt?: string;
  residentConfirmedAt?: string;
  residentPhone?: string;
  residentName?: string;
  residentEmail?: string;
  residentImage?: string;
  houseType?: string;
  housingType?: string;
  houseDescription?: string;
  numberOfRooms?: number;
  numberOfShops?: number;
  numberOfWorkersRange?: string;
  userId?: any;
  householdId?: any;
}

export interface AssignmentRoute {
  id: string;
  _id?: string;
  driverId?: string;
  driver?: any;
  driverName?: string;
  driverEmail?: string;
  title: string;
  area?: string;
  collectionDate?: string;
  scheduledDate?: string;
  collectionTime?: string;
  estimatedDistance?: string;
  estimatedDuration?: string | number;
  totalDistance?: number;
  actualDuration?: string;
  stops: RouteStop[];
  status: any;
  createdAt?: string;
}

export type VerificationStatus =
  | 'None'
  | 'AwaitingResident'
  | 'ResidentConfirmed'
  | 'Disputed'
  | 'Approved'
  | 'Rejected'
  | string;

export interface VerificationItem {
  kind?: 'stop' | 'pickup';
  id?: string;
  _id?: string;
  assignmentId: string;
  stopId: string;
  assignmentTitle?: string;
  address?: string;
  ward?: string;
  pollingUnit?: string;
  wasteType?: string;
  collectedAt?: string;
  collectionDate?: string;
  driver?: any;
  resident?: any;
  residentName?: string;
  verificationStatus: any;
  readyForAdminReview?: boolean;
  residentConfirmedAt?: string | null;
  residentNote?: string | null;
  proofPhoto?: string | null;
  residentImage?: string | null;
  adminNote?: string | null;
  collectionNote?: string | null;
  noResponse?: boolean;
  canReview?: boolean;
}

export interface PickupRequestData {
  id: string;
  _id?: string;
  residentId?: string;
  residentName?: string;
  residentPhone?: string;
  residentEmail?: string;
  userId?: any;
  driverId?: any;
  householdId?: any;
  status: string;
  extraFee?: number;
  amount?: number;
  paymentStatus?: string;
  timeSlot?: string;
  type?: string;
  wasteType?: string;
  address?: string;
  notes?: string;
  ward?: string;
  localGovt?: string;
  pollingUnit?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt: string;
  collectedAt?: string;
  driverRejectReason?: string;
  verificationStatus?: any;
  residentNote?: string;
  residentImage?: string;
  residentConfirmedAt?: string;
  adminNote?: string;
  adminReviewedAt?: string;
  image?: string;
  proofImage?: string;
  assignedCollectorName?: string;
  assignedCollectorPhone?: string;
}

export interface Bill {
  id: string;
  _id?: string;
  userId: any;
  amount: number;
  year?: number;
  month?: number;
  status: string;
  billingPeriod?: string;
  paymentReference?: string;
  paystackReference?: string;
  paidAt?: string;
  paymentDate?: string;
  dueDate?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  billDetails?: any;
}

export interface AdminStats {
  totalReports?: number;
  pendingReports?: number;
  completedReports?: number;
  totalDrivers?: number;
  activeRoutes?: number;
  activeSchedules?: number;
  totalResidents?: number;
  totalPayments?: number;
  totalRevenue?: number;
  totalPickups?: number;
  pendingPickups?: number;
  completedPickups?: number;
  pendingVerifications?: number;
  unverifiedPickups?: number;
  totalCollectors?: number;
  dateRange?: {
    startDate?: string | null;
    endDate?: string | null;
  };
  collectionsBreakdown?: {
    totalHouses: number;
    completedHouses: number;
    pendingHouses: number;
    skippedHouses: number;
  };
  pickupsBreakdown?: {
    totalPickups: number;
    completedPickups: number;
    pendingPickups: number;
    rejectedPickups: number;
    cancelledPickups?: number;
  };
  rejectedPickups?: number;
  statusDistribution?: Array<{ name: string; value: number }>;
  weeklyTrendData?: Array<{ day: string; collections: number; requests: number }>;
}

export interface ActivityLog {
  id: string;
  _id?: string;
  action: string;
  description?: string;
  timestamp?: string;
  userId?: any;
  user?: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
    phone?: string;
  };
  ipAddress?: string;
  details?: any;
  createdAt: string;
}

export interface Zone {
  id: string;
  _id?: string;
  name: string;
  description?: string;
  assignedDriverId?: any;
  assignedDriver?: any;
  boundary?: {
    type: string;
    coordinates: number[][][];
  };
  polygon?: {
    coordinates: number[][][];
  };
  coordinates?: any;
  createdAt?: string;
}

export interface CollectionSchedule {
  id: string;
  _id?: string;
  title?: string;
  frequency?: string;
  timeSlot?: string;
  area?: string;
  driver?: any;
  driverId?: string;
  active?: boolean;
  zoneId?: any;
  lga?: string;
  ward?: string;
  dayOfWeek?: string;
  nextPickup?: string;
  createdAt?: string;
}

export interface DriverTelemetry {
  driverId: string;
  driverName: string;
  phone: string;
  truckPlate: string;
  taskId?: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  timestamp: number;
  updatedAt: string;
  isOnline: boolean;
}

export interface ResidentBillingSummary {
  resident: User;
  monthlyTariff: number;
  lastPaymentDate?: string | null;
  lastPaymentReference?: string | null;
  totalPaid: number;
  outstandingMonths: number;
  outstandingAmount: number;
  totalBillsCount: number;
  paidBillsCount: number;
  unpaidBillsCount: number;
  status: 'in_arrears' | 'up_to_date';
}

export interface ResidentBillingLedger {
  resident: User;
  monthlyTariff: number;
  lastPaymentDate?: string | null;
  totalPaid: number;
  outstandingMonths: number;
  outstandingAmount: number;
  bills: Bill[];
}

export interface Broadcast {
  id: string;
  _id?: string;
  senderId?: any;
  senderName?: string;
  title: string;
  message: string;
  priority: 'normal' | 'urgent' | 'info';
  targetAudience: 'all_residents' | 'all_users' | 'ward' | 'pollingUnit' | 'drivers';
  targetFilter?: {
    localGovt?: string;
    ward?: string;
    pollingUnit?: string;
  };
  recipientsCount: number;
  createdAt: string;
  updatedAt?: string;
}

