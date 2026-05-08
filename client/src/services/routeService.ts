/**
 * assignmentService.ts — Assignment (Route) API service
 * Replaces the old routeService.ts mock; maps to /api/assignments endpoints.
 */
import { apiClient } from './api';
import { AssignmentRoute, RouteStatus, StopStatus } from '../types';

function normaliseStop(raw: any) {
  return {
    id: raw._id ?? raw.id,
    _id: raw._id ?? raw.id,           // keep _id for backward compat
    address: raw.address ?? '',
    landmark: raw.landmark,
    street: raw.street ?? '',
    ward: raw.ward ?? '',
    lga: raw.lga ?? '',
    pollingUnit: raw.pollingUnit ?? '',
    userId: raw.userId ?? null,       // populated resident { name, phone }
    coordinates: raw.location?.coordinates
      ? { latitude: raw.location.coordinates[1], longitude: raw.location.coordinates[0] }
      : { latitude: 0, longitude: 0 },
    // keep raw location so RouteScreen can also access it directly
    location: raw.location ?? null,
    wasteType: raw.wasteType ?? 'General',
    severity: raw.severity ?? 'Medium',
    status: (raw.status ?? 'Pending') as StopStatus,
    residentNote: raw.residentNote,
    collectionNote: raw.collectionNote,
    skipReason: raw.skipReason,
    reportsCount: raw.reportsCount ?? 1,
  };
}

function normaliseAssignment(raw: any): AssignmentRoute {
  return {
    id: raw._id ?? raw.id,
    driverId: raw.driverId?._id ?? raw.driverId ?? '',
    driverName: raw.driverId?.name,
    driverEmail: raw.driverId?.email,
    title: raw.title ?? '',
    area: raw.area ?? '',
    collectionDate: raw.collectionDate,
    estimatedDistance: raw.estimatedDistance ?? '—',
    estimatedDuration: raw.estimatedDuration ?? '—',
    actualDuration: raw.actualDuration,
    traffic: raw.traffic ?? { condition: 'Clear', delay: '', message: '' },
    weather: raw.weather ?? { condition: 'Sunny', temperature: '—' },
    stops: (raw.stops ?? []).map(normaliseStop),
    status: (raw.status ?? 'Pending') as RouteStatus,
  };
}

export const assignmentService = {
  /** Driver: own assignments. Admin: all (filter via query). */
  async getAssignments(filters?: { driverId?: string; status?: string }): Promise<AssignmentRoute[]> {
    const { data } = await apiClient.get('/assignments', { params: filters });
    return (data.data as any[]).map(normaliseAssignment);
  },

  /** Alias kept for backward compat with screens that call routeService.getAssignments(userId) */
  async getAssignmentsByDriver(driverId: string): Promise<AssignmentRoute[]> {
    return assignmentService.getAssignments({ driverId });
  },

  async getRouteById(id: string): Promise<AssignmentRoute> {
    const { data } = await apiClient.get(`/assignments/${id}`);
    return normaliseAssignment(data.data);
  },

  async getNextCollectionDate(): Promise<{ collectionDate: string, collectionTime: string, title: string } | null> {
    try {
      const { data } = await apiClient.get(`/assignments/resident/next-collection`);
      return data.data;
    } catch (error) {
      return null;
    }
  },

  async createAssignment(payload: {
    driverId: string;
    title: string;
    collectionDate: string;
    lga: string;
    ward: string;
    pollingUnits: string[];
  }): Promise<AssignmentRoute> {
    const { data } = await apiClient.post('/assignments', payload);
    return normaliseAssignment(data.data);
  },

  async updateRouteStatus(routeId: string, status: RouteStatus, actualDuration?: string): Promise<AssignmentRoute> {
    const { data } = await apiClient.patch(`/assignments/${routeId}/status`, { status, actualDuration });
    return normaliseAssignment(data.data);
  },

  async updateStopStatus(routeId: string, stopId: string, status: StopStatus, collectionNote?: string): Promise<AssignmentRoute> {
    const { data } = await apiClient.patch(`/assignments/${routeId}/stops/${stopId}`, { status, collectionNote });
    return normaliseAssignment(data.data);
  },

  async generateRoute(zoneId: string): Promise<any> {
    const { data } = await apiClient.post(`/routes/generate/${zoneId}`);
    return data.data;
  }
};

/** Backward-compatible alias — screens importing routeService still work */
export const routeService = assignmentService;
