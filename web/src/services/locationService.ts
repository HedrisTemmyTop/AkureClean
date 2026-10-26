import { apiClient } from "./api";

export interface LocalGovtItem {
  _id: string;
  name: string;
  state: string;
  isActive: boolean;
  createdAt?: string;
}

export interface WardItem {
  _id: string;
  name: string;
  localGovtId: string;
  localGovtName: string;
  isActive: boolean;
  createdAt?: string;
}

export interface PollingUnitItem {
  _id: string;
  name: string;
  wardId: string;
  localGovtId: string;
  wardName: string;
  localGovtName: string;
  coordinates: [number, number] | number[];
  isActive: boolean;
  createdAt?: string;
}

export type StructuredLocationsMap = Record<
  string,
  Record<string, Array<{ _id?: string; name: string; coordinates: [number, number] }>>
>;

export interface StructuredLocationsResponse {
  structured: StructuredLocationsMap;
  lgas: LocalGovtItem[];
  wards: WardItem[];
  pollingUnits: PollingUnitItem[];
  counts: {
    lgas: number;
    wards: number;
    pollingUnits: number;
  };
}

export interface BulkUploadResult {
  totalRows: number;
  lgasCreated: number;
  wardsCreated: number;
  pollingUnitsCreated: number;
  pollingUnitsUpdated: number;
  errors: string[];
}

export const locationService = {
  async getStructuredLocations(): Promise<StructuredLocationsResponse> {
    const { data } = await apiClient.get("/locations/structured");
    return data.data;
  },

  async getLocalGovts(): Promise<LocalGovtItem[]> {
    const { data } = await apiClient.get("/locations/lgas");
    return data.data;
  },

  async createLocalGovt(payload: { name: string; state?: string }): Promise<LocalGovtItem> {
    const { data } = await apiClient.post("/locations/lgas", payload);
    return data.data;
  },

  async updateLocalGovt(id: string, payload: { name: string; state?: string }): Promise<LocalGovtItem> {
    const { data } = await apiClient.put(`/locations/lgas/${id}`, payload);
    return data.data;
  },

  async deleteLocalGovt(id: string): Promise<void> {
    await apiClient.delete(`/locations/lgas/${id}`);
  },

  async getWards(params?: { localGovtId?: string; lga?: string }): Promise<WardItem[]> {
    const { data } = await apiClient.get("/locations/wards", { params });
    return data.data;
  },

  async createWard(payload: {
    name: string;
    localGovtId?: string;
    localGovtName?: string;
  }): Promise<WardItem> {
    const { data } = await apiClient.post("/locations/wards", payload);
    return data.data;
  },

  async updateWard(id: string, payload: { name: string }): Promise<WardItem> {
    const { data } = await apiClient.put(`/locations/wards/${id}`, payload);
    return data.data;
  },

  async deleteWard(id: string): Promise<void> {
    await apiClient.delete(`/locations/wards/${id}`);
  },

  async getPollingUnits(params?: {
    localGovtId?: string;
    wardId?: string;
    lga?: string;
    ward?: string;
    search?: string;
  }): Promise<PollingUnitItem[]> {
    const { data } = await apiClient.get("/locations/polling-units", { params });
    return data.data;
  },

  async createPollingUnit(payload: {
    name: string;
    wardId?: string;
    localGovtId?: string;
    wardName?: string;
    localGovtName?: string;
    longitude?: number | string;
    latitude?: number | string;
    coordinates?: [number, number];
  }): Promise<PollingUnitItem> {
    const { data } = await apiClient.post("/locations/polling-units", payload);
    return data.data;
  },

  async updatePollingUnit(
    id: string,
    payload: {
      name?: string;
      longitude?: number | string;
      latitude?: number | string;
      coordinates?: [number, number];
    }
  ): Promise<PollingUnitItem> {
    const { data } = await apiClient.put(`/locations/polling-units/${id}`, payload);
    return data.data;
  },

  async deletePollingUnit(id: string): Promise<void> {
    await apiClient.delete(`/locations/polling-units/${id}`);
  },

  async bulkUploadCsv(csvText: string): Promise<{ message: string; data: BulkUploadResult }> {
    const { data } = await apiClient.post("/locations/bulk-upload", { csvText });
    return { message: data.message, data: data.data };
  },

  async seedDefaults(): Promise<{ message: string; data: any }> {
    const { data } = await apiClient.post("/locations/seed-defaults");
    return { message: data.message, data: data.data };
  },
};

export default locationService;
