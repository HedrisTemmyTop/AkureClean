import { apiClient } from './api';
import { PickupRequestData } from '../types';

export const pickupService = {
  async getAllPickups(filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PickupRequestData[]> {
    const { data } = await apiClient.get('/pickup', { params: filters });
    const rawList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
    return rawList.map((raw: any) => ({
      ...raw,
      id: String(raw._id ?? raw.id),
      residentName: raw.userId?.name || raw.residentName || 'Resident',
      residentPhone: raw.userId?.phone || raw.residentPhone,
      residentEmail: raw.userId?.email || raw.residentEmail,
      address: raw.address || raw.userId?.address || '',
      wasteType: raw.type || raw.wasteType || 'General',
      image: raw.image || raw.proofImage || raw.proofPhoto || null,
      proofImage: raw.proofImage || raw.image || null,
    }));
  },

  async getPickups(filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PickupRequestData[]> {
    return pickupService.getAllPickups(filters);
  },

  async getPickupById(id: string): Promise<PickupRequestData> {
    const { data } = await apiClient.get(`/pickup/${id}`);
    const raw = data.data;
    return {
      ...raw,
      id: String(raw._id ?? raw.id),
      residentName: raw.userId?.name || raw.residentName || 'Resident',
      residentPhone: raw.userId?.phone || raw.residentPhone,
      residentEmail: raw.userId?.email || raw.residentEmail,
      address: raw.address || raw.userId?.address || '',
      wasteType: raw.type || raw.wasteType || 'General',
      image: raw.image || raw.proofImage || raw.proofPhoto || null,
      proofImage: raw.proofImage || raw.image || null,
    };
  },

  async getCollectorPickups(driverId: string): Promise<PickupRequestData[]> {
    const { data } = await apiClient.get(`/pickup/collector/${driverId}`);
    const rawList = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
    return rawList.map((raw: any) => ({
      ...raw,
      id: String(raw._id ?? raw.id),
    }));
  },
};

export default pickupService;
