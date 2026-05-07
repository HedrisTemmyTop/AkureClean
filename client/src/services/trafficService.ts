import axios from "axios";
import { TrafficSummary } from "../types";

const GOOGLE_MAPS_API_KEY = "AIzaSyAQdeXGkqghgJhYHsiPiHeiu-Hz_x8pQzc";

const AKURE_ORIGIN = "7.2571,5.2058";
const AKURE_DEST = "7.2400,5.1900";

export const trafficService = {
  async getTrafficConditions(area: string): Promise<TrafficSummary> {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${AKURE_ORIGIN}&destination=${AKURE_DEST}&departure_time=now&key=${GOOGLE_MAPS_API_KEY}`,
      );

      if (response.data.status !== "OK") {
        throw new Error(
          response.data.error_message || "Failed to fetch directions",
        );
      }

      const leg = response.data.routes[0].legs[0];
      const duration = leg.duration.value; // seconds
      const durationInTraffic = leg.duration_in_traffic?.value || duration;

      const delaySeconds = durationInTraffic - duration;
      const delayMinutes = Math.round(delaySeconds / 60);

      let condition: "Clear" | "Moderate" | "Heavy" = "Clear";
      if (delaySeconds > 300)
        condition = "Heavy"; // > 5 mins delay
      else if (delaySeconds > 60) condition = "Moderate";

      return {
        condition,
        delay: delayMinutes > 0 ? `+${delayMinutes} mins` : "No delay",
        message:
          condition === "Heavy"
            ? "Significant traffic detected on main routes."
            : condition === "Moderate"
              ? "Typical traffic for this time of day."
              : "Traffic is moving smoothly.",
      };
    } catch (error) {
      console.error("Traffic API Error:", error);
      return {
        condition: "Clear",
        delay: "+0 mins",
        message: "Unable to retrieve real-time traffic.",
      };
    }
  },
};
