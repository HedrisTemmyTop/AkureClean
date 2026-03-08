import { AssignmentRoute, RouteStatus, StopStatus } from '../types';
import { mockAssignmentRoutes } from '../data/mockData';

// Maintain state in memory to simulate database persistence
let currentRoutes = [...mockAssignmentRoutes];

export const routeService = {
  async getAssignments(collectorId: string): Promise<AssignmentRoute[]> {
    await new Promise(resolve => setTimeout(resolve, 600)); // fake network
    return currentRoutes.filter(r => r.collectorId === collectorId);
  },

  async getRouteById(routeId: string): Promise<AssignmentRoute | undefined> {
    await new Promise(resolve => setTimeout(resolve, 400));
    return currentRoutes.find(r => r.id === routeId);
  },

  async updateRouteStatus(routeId: string, status: RouteStatus): Promise<AssignmentRoute | undefined> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = currentRoutes.findIndex(r => r.id === routeId);
    if (index === -1) return undefined;
    
    currentRoutes[index] = { ...currentRoutes[index], status };
    if (status === 'Completed') {
      currentRoutes[index].actualDuration = '1h 10m'; // arbitrary mock stat
    }
    return currentRoutes[index];
  },

  async updateStopStatus(routeId: string, stopId: string, status: StopStatus, notes?: string): Promise<AssignmentRoute | undefined> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const routeIndex = currentRoutes.findIndex(r => r.id === routeId);
    if (routeIndex === -1) return undefined;

    const route = currentRoutes[routeIndex];
    const stops = route.stops.map(stop => {
      if (stop.id === stopId) {
        return { ...stop, status, collectionNote: notes || stop.collectionNote };
      }
      return stop;
    });

    currentRoutes[routeIndex] = { ...route, stops };
    return currentRoutes[routeIndex];
  }
};
