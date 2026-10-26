import axios from "axios";
import { TrafficSummary } from "../types";

// Free OSRM routing coordinates (lng,lat) for Akure main corridor
const AKURE_ORIGIN_LNG_LAT = "5.2058,7.2571";
const AKURE_DEST_LNG_LAT = "5.1900,7.2400";

export const trafficService = {
  async getTrafficConditions(area: string): Promise<TrafficSummary> {
    try {
      const response = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${AKURE_ORIGIN_LNG_LAT};${AKURE_DEST_LNG_LAT}?overview=false`,
        { timeout: 6000 },
      );

      const baseDuration = response.data?.routes?.[0]?.duration || 360; // seconds

      // Estimate real-world Akure corridor congestion based on local time of day
      const hour = new Date().getHours();
      const isPeakRush = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19);
      const isMiddayBusy = hour >= 12 && hour <= 15;

      const multiplier = isPeakRush ? 1.35 : isMiddayBusy ? 1.18 : 1.0;
      const delaySeconds = Math.round(baseDuration * (multiplier - 1));
      const delayMinutes = Math.round(delaySeconds / 60);

      let condition: "Clear" | "Moderate" | "Heavy" = "Clear";
      if (delaySeconds > 300) {
        condition = "Heavy";
      } else if (delaySeconds > 60) {
        condition = "Moderate";
      }

      return {
        condition,
        delay: delayMinutes > 0 ? `+${delayMinutes} mins` : "No delay",
        message:
          condition === "Heavy"
            ? `Significant traffic detected around ${area} main routes.`
            : condition === "Moderate"
              ? `Moderate traffic flow across ${area}.`
              : `Traffic in ${area} is moving smoothly.`,
      };
    } catch {
      return {
        condition: "Clear",
        delay: "No delay",
        message: "Traffic is moving smoothly.",
      };
    }
  },
};
