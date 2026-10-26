import { apiClient } from './api';
import { AssignmentRoute, RouteStop, RouteStatus, StopStatus } from '../types';

function normaliseStop(raw: any): RouteStop {
  const residentObj = raw.userId || raw.householdId?.userId || null;
  return {
    id: String(raw._id ?? raw.id),
    _id: String(raw._id ?? raw.id),
    address: raw.address ?? 'Unknown Address',
    landmark: raw.landmark,
    street: raw.street ?? '',
    ward: raw.ward ?? '',
    lga: raw.lga ?? '',
    pollingUnit: raw.pollingUnit ?? '',
    userId: residentObj,
    householdId: raw.householdId ?? null,
    coordinates: raw.location?.coordinates?.length === 2
      ? { latitude: raw.location.coordinates[1], longitude: raw.location.coordinates[0] }
      : { latitude: raw.coordinates?.latitude || 0, longitude: raw.coordinates?.longitude || 0 },
    location: raw.location ?? null,
    wasteType: raw.wasteType ?? 'General',
    severity: raw.severity ?? 'Medium',
    status: (raw.status ?? 'Pending') as StopStatus,
    residentNote: raw.residentNote,
    collectionNote: raw.collectionNote,
    skipReason: raw.skipReason,
    reportsCount: raw.reportsCount ?? 1,
    verificationStatus: raw.verificationStatus ?? 'None',
    adminNote: raw.adminNote,
    adminReviewedAt: raw.adminReviewedAt,
    adminReviewedBy: raw.adminReviewedBy,
    collectedAt: raw.collectedAt,
    residentConfirmedAt: raw.residentConfirmedAt,
    residentName: residentObj?.name || raw.residentName || 'N/A',
    residentPhone: residentObj?.phone || raw.residentPhone || 'N/A',
    residentEmail: residentObj?.email || raw.residentEmail || '',
    residentImage: raw.residentImage,
    houseType: residentObj?.houseType || residentObj?.housingType || raw.houseType || raw.housingType || 'Residential building',
    houseDescription: residentObj?.houseDescription || raw.houseDescription || '',
    numberOfRooms: residentObj?.numberOfRooms ?? raw.numberOfRooms,
    numberOfShops: residentObj?.numberOfShops ?? raw.numberOfShops,
    numberOfWorkersRange: residentObj?.numberOfWorkersRange ?? raw.numberOfWorkersRange,
  };
}

function normaliseAssignment(raw: any): AssignmentRoute {
  return {
    id: String(raw._id ?? raw.id),
    _id: String(raw._id ?? raw.id),
    driverId: String(raw.driverId?._id ?? raw.driverId ?? ''),
    driver: raw.driverId || raw.driver,
    driverName: raw.driverId?.name || raw.driverName || 'Unassigned',
    driverEmail: raw.driverId?.email || raw.driverEmail,
    title: raw.title ?? '',
    area: raw.area ?? '',
    collectionDate: raw.collectionDate ? new Date(raw.collectionDate).toISOString().split('T')[0] : '—',
    scheduledDate: raw.collectionDate || raw.scheduledDate || new Date().toISOString(),
    collectionTime: raw.collectionTime || '08:00 AM',
    estimatedDistance: raw.estimatedDistance ?? '—',
    estimatedDuration: raw.estimatedDuration ?? '—',
    totalDistance: raw.totalDistance,
    actualDuration: raw.actualDuration,
    stops: (raw.stops ?? []).map(normaliseStop),
    status: (raw.status ?? 'Pending') as RouteStatus,
    createdAt: raw.createdAt,
  };
}

export const taskService = {
  async getAssignments(filters?: { driverId?: string; status?: string }): Promise<AssignmentRoute[]> {
    const { data } = await apiClient.get('/assignments', { params: filters });
    return (data.data as any[]).map(normaliseAssignment);
  },

  async getAssignmentById(id: string): Promise<AssignmentRoute> {
    const { data } = await apiClient.get(`/assignments/${id}`);
    return normaliseAssignment(data.data);
  },

  async createAssignment(payload: {
    driverId: string;
    title: string;
    collectionDate: string;
    collectionTime?: string;
    lga: string;
    ward: string;
    pollingUnits: string[];
    pollingUnitLocations?: Array<{ name: string; coordinates: [number, number] | null }>;
  }): Promise<AssignmentRoute> {
    const { data } = await apiClient.post('/assignments', payload);
    return normaliseAssignment(data.data);
  },

  async updateRouteStatus(
    routeId: string,
    status: RouteStatus,
    actualDuration?: string
  ): Promise<AssignmentRoute> {
    const { data } = await apiClient.patch(`/assignments/${routeId}/status`, {
      status,
      actualDuration,
    });
    return normaliseAssignment(data.data);
  },

  async updateAssignmentStatus(
    routeId: string,
    status: RouteStatus,
    actualDuration?: string
  ): Promise<AssignmentRoute> {
    return this.updateRouteStatus(routeId, status, actualDuration);
  },

  async updateStopStatus(
    routeId: string,
    stopId: string,
    status: StopStatus,
    skipReasonOrNote?: string
  ): Promise<AssignmentRoute> {
    const { data } = await apiClient.patch(`/assignments/${routeId}/stops/${stopId}`, {
      status,
      collectionNote: skipReasonOrNote,
      skipReason: skipReasonOrNote,
    });
    return normaliseAssignment(data.data);
  },
};

export default taskService;
