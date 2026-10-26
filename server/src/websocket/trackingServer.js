const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../models/User");
const Assignment = require("../models/Assignment");

// In-memory telemetry cache: driverId -> DriverTelemetry
const driverTelemetryMap = new Map();

// Active socket collections
const adminSockets = new Set();
const driverSocketsMap = new Map(); // driverId -> Set<WebSocket>

/**
 * Validates latitude and longitude ranges
 */
function isValidCoordinates(lat, lng) {
  return (
    typeof lat === "number" &&
    !isNaN(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === "number" &&
    !isNaN(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Broadcasts a JSON message to all subscribed admin clients
 */
function broadcastToAdmins(payload) {
  const messageStr = JSON.stringify(payload);
  for (const client of adminSockets) {
    if (client.readyState === client.OPEN) {
      try {
        client.send(messageStr);
      } catch (err) {
        console.error("[WS] Error sending to admin client:", err.message);
      }
    }
  }
}

/**
 * Initializes WebSocket Server for real-time driver tracking
 * @param {import('http').Server} server - HTTP Server instance
 */
function initTrackingServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/tracking",
  });

  console.log("[WS] Real-time Tracking WebSocket server initialized on /ws/tracking");

  wss.on("connection", async (ws, req) => {
    try {
      // 1. Extract and verify JWT token from query string
      const urlObj = new URL(req.url, "http://localhost");
      const token = urlObj.searchParams.get("token");

      if (!token) {
        console.warn("[WS] Connection rejected: No token provided");
        ws.close(4401, "Authentication token required");
        return;
      }

      let decoded;
      try {
        decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
      } catch (err) {
        console.warn("[WS] Connection rejected: Invalid JWT token");
        ws.close(4401, "Invalid or expired token");
        return;
      }

      const user = await User.findById(decoded.id).select(
        "_id name email role vehiclePlate truckPlateNumber phone"
      );

      if (!user) {
        ws.close(4401, "User not found");
        return;
      }

      ws.userId = user._id.toString();
      ws.userRole = user.role;
      ws.userName = user.name;
      ws.isAlive = true;

      ws.on("pong", () => {
        ws.isAlive = true;
        if (ws.userRole === "driver" || ws.userRole === "collector") {
          const existing = driverTelemetryMap.get(ws.userId);
          if (existing && !existing.isOnline) {
            existing.isOnline = true;
            driverTelemetryMap.set(ws.userId, existing);
            broadcastToAdmins({
              type: "DRIVER_LOCATION_UPDATE",
              data: existing,
            });
          }
        }
      });

      // 2. Handle ADMIN Connection
      if (user.role === "admin") {
        console.log(`[WS] Admin connected: ${user.name} (${user._id})`);
        adminSockets.add(ws);

        // Prepopulate telemetry from active tasks and fleet drivers if not yet populated
        try {
          const activeAssignments = await Assignment.find({
            status: { $in: ["InProgress", "Pending", "Paused", "in_progress", "planned"] },
          })
            .populate("driverId", "_id name phone vehiclePlate truckPlateNumber location")
            .sort({ updatedAt: -1 });

          for (const assign of activeAssignments) {
            if (!assign.driverId) continue;
            const did = assign.driverId._id.toString();
            const isOnline = driverSocketsMap.has(did) && driverSocketsMap.get(did).size > 0;
            if (!driverTelemetryMap.has(did)) {
              let lat = 7.2571;
              let lng = 5.2058;
              if (
                assign.stops &&
                assign.stops.length > 0 &&
                assign.stops[0].location?.coordinates?.length === 2
              ) {
                lng = assign.stops[0].location.coordinates[0];
                lat = assign.stops[0].location.coordinates[1];
              } else if (assign.driverId.location?.coordinates?.length === 2) {
                lng = assign.driverId.location.coordinates[0];
                lat = assign.driverId.location.coordinates[1];
              }

              driverTelemetryMap.set(did, {
                driverId: did,
                driverName: assign.driverId.name,
                phone: assign.driverId.phone || "",
                truckPlate:
                  assign.driverId.vehiclePlate ||
                  assign.driverId.truckPlateNumber ||
                  "AKR-TRUCK",
                taskId: assign._id.toString(),
                latitude: lat,
                longitude: lng,
                speed: 0,
                heading: 0,
                timestamp: Date.now(),
                updatedAt: assign.updatedAt
                  ? assign.updatedAt.toISOString()
                  : new Date().toISOString(),
                isOnline,
              });
            } else {
              const existing = driverTelemetryMap.get(did);
              existing.isOnline = isOnline;
              if (!existing.taskId) existing.taskId = assign._id.toString();
              driverTelemetryMap.set(did, existing);
            }
          }

          const allFleetDrivers = await User.find({
            role: { $in: ["driver", "collector"] },
            isDeactivated: { $ne: true },
          }).select("_id name phone vehiclePlate truckPlateNumber location updatedAt");

          for (const drv of allFleetDrivers) {
            const did = drv._id.toString();
            const isOnline = driverSocketsMap.has(did) && driverSocketsMap.get(did).size > 0;
            if (!driverTelemetryMap.has(did)) {
              let lat = 7.2571;
              let lng = 5.2058;
              if (drv.location?.coordinates?.length === 2) {
                lng = drv.location.coordinates[0];
                lat = drv.location.coordinates[1];
              }
              driverTelemetryMap.set(did, {
                driverId: did,
                driverName: drv.name,
                phone: drv.phone || "",
                truckPlate:
                  drv.vehiclePlate || drv.truckPlateNumber || "AKR-TRUCK",
                taskId: null,
                latitude: lat,
                longitude: lng,
                speed: 0,
                heading: 0,
                timestamp: Date.now(),
                updatedAt: drv.updatedAt
                  ? drv.updatedAt.toISOString()
                  : new Date().toISOString(),
                isOnline,
              });
            } else {
              const existing = driverTelemetryMap.get(did);
              existing.isOnline = isOnline;
              driverTelemetryMap.set(did, existing);
            }
          }
        } catch (err) {
          console.warn("[WS] Error preloading telemetry on admin connect:", err.message);
        }

        // Immediately send snapshot of all current driver locations
        const currentDrivers = Array.from(driverTelemetryMap.values());
        ws.send(
          JSON.stringify({
            type: "INITIAL_DRIVER_LOCATIONS",
            data: currentDrivers,
          })
        );

        ws.on("close", () => {
          console.log(`[WS] Admin disconnected: ${user.name}`);
          adminSockets.delete(ws);
        });

        return;
      }

      // 3. Handle DRIVER Connection
      if (user.role === "driver" || user.role === "collector") {
        const driverId = user._id.toString();
        console.log(`[WS] Driver connected: ${user.name} (${driverId})`);

        if (!driverSocketsMap.has(driverId)) {
          driverSocketsMap.set(driverId, new Set());
        }
        driverSocketsMap.get(driverId).add(ws);

        // Immediately register driver in telemetry map as online
        if (!driverTelemetryMap.has(driverId)) {
          let initialLat = 7.2571;
          let initialLng = 5.2058;
          let activeTaskId = null;

          try {
            const activeTask = await Assignment.findOne({
              driverId: user._id,
              status: { $in: ["InProgress", "Pending", "Paused", "in_progress"] },
            }).sort({ updatedAt: -1 });

            if (activeTask) {
              activeTaskId = activeTask._id.toString();
              if (activeTask.stops && activeTask.stops.length > 0 && activeTask.stops[0].location?.coordinates?.length === 2) {
                initialLng = activeTask.stops[0].location.coordinates[0];
                initialLat = activeTask.stops[0].location.coordinates[1];
              }
            } else if (user.location?.coordinates?.length === 2) {
              initialLng = user.location.coordinates[0];
              initialLat = user.location.coordinates[1];
            }
          } catch (e) {
            console.warn("[WS] Error fetching active task on driver connect:", e.message);
          }

          const initialTelemetry = {
            driverId,
            driverName: user.name,
            phone: user.phone || "",
            truckPlate: user.vehiclePlate || user.truckPlateNumber || "AKR-TRUCK",
            taskId: activeTaskId,
            latitude: initialLat,
            longitude: initialLng,
            speed: 0,
            heading: 0,
            timestamp: Date.now(),
            updatedAt: new Date().toISOString(),
            isOnline: true,
          };
          driverTelemetryMap.set(driverId, initialTelemetry);
        } else {
          const existing = driverTelemetryMap.get(driverId);
          existing.isOnline = true;
          existing.timestamp = Date.now();
          existing.updatedAt = new Date().toISOString();
          driverTelemetryMap.set(driverId, existing);
        }

        // Broadcast driver online update to all admins immediately
        broadcastToAdmins({
          type: "DRIVER_LOCATION_UPDATE",
          data: driverTelemetryMap.get(driverId),
        });

        // Listen for location updates and heartbeats from driver
        ws.on("message", (rawMessage) => {
          try {
            const message = JSON.parse(rawMessage.toString());

            if (message.type === "HEARTBEAT") {
              const existing = driverTelemetryMap.get(driverId);
              if (existing) {
                const wasOffline = !existing.isOnline;
                existing.isOnline = true;
                if (message.taskId !== undefined && message.taskId !== null) {
                  existing.taskId = message.taskId;
                }
                driverTelemetryMap.set(driverId, existing);
                if (wasOffline) {
                  broadcastToAdmins({
                    type: "DRIVER_LOCATION_UPDATE",
                    data: existing,
                  });
                }
              }
              return;
            }

            if (message.type === "LOCATION_UPDATE") {
              const { latitude, longitude, speed, heading, timestamp, taskId } = message;

              if (!isValidCoordinates(Number(latitude), Number(longitude))) {
                console.warn(`[WS] Invalid coordinates received from driver ${driverId}:`, latitude, longitude);
                return;
              }

              const existing = driverTelemetryMap.get(driverId);

              // Update in-memory telemetry cache
              const telemetry = {
                driverId,
                driverName: user.name,
                phone: user.phone || "",
                truckPlate: user.vehiclePlate || user.truckPlateNumber || "AKR-TRUCK",
                taskId: taskId || existing?.taskId || null,
                latitude: Number(latitude),
                longitude: Number(longitude),
                speed: Number(speed || 0),
                heading: Number(heading || 0),
                timestamp: Number(timestamp || Date.now()),
                updatedAt: new Date().toISOString(),
                isOnline: true,
              };

              driverTelemetryMap.set(driverId, telemetry);

              // Broadcast update to all connected admins
              broadcastToAdmins({
                type: "DRIVER_LOCATION_UPDATE",
                data: telemetry,
              });
            }
          } catch (err) {
            console.error(`[WS] Error parsing message from driver ${driverId}:`, err.message);
          }
        });

        ws.on("close", () => {
          console.log(`[WS] Driver disconnected: ${user.name} (${driverId})`);
          const socketSet = driverSocketsMap.get(driverId);
          if (socketSet) {
            socketSet.delete(ws);
            if (socketSet.size === 0) {
              driverSocketsMap.delete(driverId);

              // Mark driver as offline in telemetry cache
              const existing = driverTelemetryMap.get(driverId);
              if (existing) {
                existing.isOnline = false;
                existing.updatedAt = new Date().toISOString();
                driverTelemetryMap.set(driverId, existing);

                broadcastToAdmins({
                  type: "DRIVER_OFFLINE",
                  data: {
                    driverId,
                    lastTelemetry: existing,
                  },
                });
              }
            }
          }
        });

        return;
      }

      // Reject non-admin, non-driver roles (e.g., residents)
      console.warn(`[WS] Rejected unauthorized role: ${user.role} for user ${user._id}`);
      ws.close(4403, "Access restricted to authorized drivers and administrators");
    } catch (err) {
      console.error("[WS] Connection error:", err);
      ws.close(4500, "Internal Server Error");
    }
  });

  // Keep-alive heartbeat: ping sockets every 30 seconds
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(pingInterval);
  });

  return wss;
}

module.exports = {
  initTrackingServer,
  getLatestDriverLocations: () => Array.from(driverTelemetryMap.values()),
  isDriverConnected: (driverId) =>
    driverSocketsMap.has(driverId) && driverSocketsMap.get(driverId).size > 0,
};
