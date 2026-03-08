import { WeatherSummary } from '../types';

export const weatherService = {
  async getWeatherConditions(area: string): Promise<WeatherSummary> {
    await new Promise(resolve => setTimeout(resolve, 200));

    // Mock API response based loosely on generic area
    if (area.includes('Isikan')) {
      return {
        condition: 'Rain',
        temperature: '22°C',
        warning: 'Heavy showers expected. Drive slowly.'
      };
    }

    return {
      condition: 'Sunny',
      temperature: '29°C'
    };
  }
};
