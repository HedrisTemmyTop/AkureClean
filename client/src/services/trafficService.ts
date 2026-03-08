import { TrafficSummary } from '../types';

export const trafficService = {
  async getTrafficConditions(area: string): Promise<TrafficSummary> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // In a real app, this would hit a maps/traffic API
    if (area.includes('South Gate')) {
      return {
        condition: 'Clear',
        delay: '+0 mins',
        message: 'No delays reported.'
      };
    }
    
    return {
      condition: 'Moderate',
      delay: '+10 mins',
      message: 'Typical traffic for this time of day.'
    };
  }
};
