import { WasteRequest, RequestStatus } from '../types';
import { mockRequests } from '../data/mockData';

let currentReports = [...mockRequests];

export const reportService = {
  async getReportsByResident(residentId: string): Promise<WasteRequest[]> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return currentReports.filter(r => r.residentId === residentId);
  },

  async getAllReports(): Promise<WasteRequest[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return [...currentReports].sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime());
  },

  async getReportById(id: string): Promise<WasteRequest | undefined> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return currentReports.find(r => r.id === id);
  },

  async submitReport(data: Omit<WasteRequest, 'id' | 'status' | 'requestedDate'>): Promise<WasteRequest> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newReport: WasteRequest = {
      ...data,
      id: `req_${Date.now()}`,
      status: 'Pending',
      requestedDate: new Date().toISOString()
    };
    
    currentReports = [newReport, ...currentReports];
    return newReport;
  },

  async assignCollectorToReport(reportId: string, collectorId: string): Promise<WasteRequest | undefined> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = currentReports.findIndex(r => r.id === reportId);
    if (index === -1) return undefined;
    
    currentReports[index] = { ...currentReports[index], collectorId, status: 'Scheduled' };
    return currentReports[index];
  },

  async updateReportStatus(reportId: string, status: RequestStatus): Promise<WasteRequest | undefined> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const index = currentReports.findIndex(r => r.id === reportId);
    if (index === -1) return undefined;
    
    currentReports[index] = { ...currentReports[index], status };
    if (status === 'Completed') {
      currentReports[index].completedDate = new Date().toISOString();
    }
    return currentReports[index];
  },

  async processPayment(reportId: string): Promise<WasteRequest | undefined> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const index = currentReports.findIndex(r => r.id === reportId);
    if (index === -1) return undefined;

    // After payment, standard flow is to mark it Scheduled for pickup
    currentReports[index] = { ...currentReports[index], status: 'Scheduled' };
    return currentReports[index];
  }
};
