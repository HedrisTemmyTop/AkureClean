import { apiClient } from "./api";

export type StructuredLocationsMap = Record<
  string,
  Record<
    string,
    Array<{ _id?: string; name: string; coordinates: [number, number] }>
  >
>;

export const locationService = {
  async getStructuredLocations(): Promise<StructuredLocationsMap> {
    const { data } = await apiClient.get("/locations/structured");
    return data?.data?.structured || {};
  },
};

export default locationService;
