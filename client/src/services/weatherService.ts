import axios from "axios";
import { WeatherSummary } from "../types";

const WEATHER_API_KEY = "271a9f95dee7410ab57201727260705";
const AKURE_COORDS = "7.2571,5.2058";

export const weatherService = {
  async getWeatherConditions(area: string): Promise<WeatherSummary> {
    try {
      const response = await axios.get(
        `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${AKURE_COORDS}`,
      );

      const { current } = response.data;
      const isRaining =
        current.condition.text.toLowerCase().includes("rain") ||
        current.condition.text.toLowerCase().includes("shower") ||
        current.precip_mm > 0;

      return {
        condition: current.condition.text,
        temperature: `${Math.round(current.temp_c)}°C`,
        warning: isRaining
          ? "Precipitation detected. Expect slippery roads."
          : current.vis_km < 5
            ? "Low visibility detected (Mist/Fog). Drive with caution."
            : undefined,
      };
    } catch (error) {
      console.error("Weather API Error:", error);
      // Fallback
      return {
        condition: "Cloudy",
        temperature: "26°C",
      };
    }
  },
};
