/**
 * reportService.ts — Waste Report / Pickup Request API service
 * Maps to the backend Report model endpoints.
 */
import { apiClient } from './api';
import { WasteRequest, RequestStatus, Severity } from '../types';

export interface SubmitReportPayload {
  street: string;
  landmark?: string;
  lga?: string;
  ward?: string;
  type?: WasteRequest['type'];
  severity?: Severity;
  notes?: string;
  preferredDate?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
}

// ─── Normalise server → client shape ─────────────────────────────────────────
function normaliseReport(raw: any): WasteRequest {
  return {
    id: raw._id ?? raw.id,
    residentId: raw.residentId?._id ?? raw.residentId,
    driverId: raw.driverId?._id ?? raw.driverId,
    locationId: raw.ward ?? raw.lga ?? '',
    street: raw.street,
    landmark: raw.landmark,
    status: raw.status as RequestStatus,
    severity: raw.severity as Severity,
    type: raw.type,
    requestedDate: raw.requestedDate,
    preferredDate: raw.preferredDate,
    completedDate: raw.completedDate,
    notes: raw.notes,
    imageUrl: raw.imageUrl,
    cost: raw.cost,
  };
}

export const reportService = {
  async submitReport(payload: SubmitReportPayload): Promise<WasteRequest> {
    const { data } = await apiClient.post('/reports', payload);
    return normaliseReport(data.data);
  },

  async getReportsByResident(_id?: string): Promise<WasteRequest[]> {
    const { data } = await apiClient.get('/reports/mine');
    return (data.data as any[]).map(normaliseReport);
  },

  async getAllReports(filters?: { status?: string; ward?: string }): Promise<WasteRequest[]> {
    const { data } = await apiClient.get('/reports', { params: filters });
    return (data.data as any[]).map(normaliseReport);
  },

  async getReportById(id: string): Promise<WasteRequest> {
    const { data } = await apiClient.get(`/reports/${id}`);
    return normaliseReport(data.data);
  },

  async updateReportStatus(reportId: string, status: RequestStatus, driverId?: string): Promise<WasteRequest> {
    const { data } = await apiClient.patch(`/reports/${reportId}/status`, { status, driverId });
    return normaliseReport(data.data);
  },
};
