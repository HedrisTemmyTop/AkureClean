import { apiClient, BASE_URL } from "./api";
import { tokenStorage } from "../utils/tokenStorage";

export interface DriverLocationPayload {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp?: number;
  taskId?: string | null;
}

class DriverLocationSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: any = null;
  private heartbeatInterval: any = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 15000;
  private isExplicitlyClosed = false;
  private latestPendingUpdate: DriverLocationPayload | null = null;
  private lastSentPayload: DriverLocationPayload | null = null;
  private statusListeners: Set<(connected: boolean) => void> = new Set();

  private urlIndex = 0;

  /**
   * Derive candidate tracking URLs from BASE_URL with local fallbacks
   */
  private getTrackingUrls(token: string): string[] {
    const urls: string[] = [];
    const encodedToken = encodeURIComponent(token);
    
    // Primary from configured BASE_URL
    const wsBase = BASE_URL.replace(/^http:\/\//i, "ws://")
      .replace(/^https:\/\//i, "wss://")
      .replace(/\/api\/?$/, "");
    urls.push(`${wsBase}/ws/tracking?token=${encodedToken}`);

    // Localhost fallbacks for simulator / physical test on local machine
    urls.push(`ws://127.0.0.1:5001/ws/tracking?token=${encodedToken}`);
    urls.push(`ws://localhost:5001/ws/tracking?token=${encodedToken}`);
    urls.push(`ws://10.0.2.2:5001/ws/tracking?token=${encodedToken}`);

    return Array.from(new Set(urls));
  }

  public subscribeStatus(listener: (connected: boolean) => void) {
    this.statusListeners.add(listener);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      listener(true);
    } else {
      listener(false);
    }
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (err) {
        console.warn("[DriverSocket] Listener error:", err);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(
            JSON.stringify({
              type: "HEARTBEAT",
              timestamp: Date.now(),
              taskId: this.lastSentPayload?.taskId || null,
            })
          );
        } catch (err) {
          console.warn("[DriverSocket] Heartbeat send error:", err);
        }
      }
    }, 10000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public async connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;

    const token = await tokenStorage.getAccessToken();
    if (!token) {
      console.warn("[DriverSocket] Cannot connect: No access token");
      return;
    }

    const candidateUrls = this.getTrackingUrls(token);
    const wsUrl = candidateUrls[this.urlIndex % candidateUrls.length];

    try {
      let didOpen = false;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        didOpen = true;
        console.log(`[DriverSocket] Connected to tracking WebSocket at ${wsUrl}`);
        this.reconnectDelay = 1000;
        this.notifyStatus(true);
        this.startHeartbeat();

        // If there was a pending latest update buffered while disconnected, send it immediately
        if (this.latestPendingUpdate) {
          const update = this.latestPendingUpdate;
          this.latestPendingUpdate = null;
          this.sendLocationUpdate(update);
        }
      };

      this.ws.onmessage = (event) => {
        // Driver socket currently sends telemetry upstream; can handle pings/acks here
      };

      this.ws.onerror = (error) => {
        console.warn("[DriverSocket] WebSocket error:", error);
      };

      this.ws.onclose = async (event) => {
        console.log(`[DriverSocket] Closed with code ${event.code}: ${event.reason}`);
        this.stopHeartbeat();
        this.notifyStatus(false);
        this.ws = null;

        if (!this.isExplicitlyClosed) {
          // If the token expired (4401), trigger an authenticated API call so the
          // Axios interceptor refreshes the access token in tokenStorage before reconnecting.
          if (event.code === 4401) {
            try {
              await apiClient.get("/auth/me");
            } catch (refreshErr) {
              console.warn("[DriverSocket] Token refresh on 4401 failed:", refreshErr);
            }
          }
          this.scheduleReconnect(!didOpen);
        }
      };
    } catch (err) {
      console.warn("[DriverSocket] Error initializing WebSocket:", err);
      this.scheduleReconnect(true);
    }
  }

  private scheduleReconnect(rotateUrl = false) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (rotateUrl) {
      this.urlIndex += 1;
    }
    console.log(`[DriverSocket] Scheduling reconnect in ${this.reconnectDelay}ms (candidate index ${this.urlIndex})`);
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  /**
   * Sends location update to tracking server.
   * If offline, buffers only the latest update (lossy buffer of 1)
   * to avoid flooding stale GPS readings upon reconnection.
   */
  public sendLocationUpdate(payload: DriverLocationPayload): void {
    this.lastSentPayload = payload;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const message = {
          type: "LOCATION_UPDATE",
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed || 0,
          heading: payload.heading || 0,
          timestamp: payload.timestamp || Date.now(),
          taskId: payload.taskId || null,
        };
        this.ws.send(JSON.stringify(message));
      } catch (err) {
        console.warn("[DriverSocket] Error sending location update:", err);
        this.latestPendingUpdate = payload;
      }
    } else {
      // Buffer ONLY the latest update
      this.latestPendingUpdate = payload;
      if (!this.ws && !this.isExplicitlyClosed) {
        this.connect();
      }
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {
        console.warn("[DriverSocket] Error closing socket:", err);
      }
      this.ws = null;
    }
    this.latestPendingUpdate = null;
    this.lastSentPayload = null;
    this.notifyStatus(false);
  }
}

export const driverLocationSocket = new DriverLocationSocketService();
