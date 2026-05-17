import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
  Modal,
  TextInput,
  Animated,
} from "react-native";
import {
  useNavigation,
  useIsFocused,
  useRoute,
} from "@react-navigation/native";
import MapView, {
  Marker,
  Polyline,
  Callout,
  PROVIDER_GOOGLE,
  MapType,
} from "react-native-maps";
import {
  CheckCircle,
  Pause,
  AlertCircle,
  MapPin,
  Truck,
  ChevronUp,
  Layers,
  Play,
  Maximize2,
  Minimize2,
} from "lucide-react-native";
import * as Animatable from "react-native-animatable";
import * as Location from "expo-location";
import polylineDecoder from "@mapbox/polyline";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "../../components/AppText";
import { AppButton } from "../../components/AppButton";
import { theme } from "../../theme";
import { driverService } from "../../services/driverService";
import { parseApiError } from "../../services/api";

const { width, height } = Dimensions.get("window");

// ── helpers ───────────────────────────────────────────────────────────────────
const IS_SIMULATOR_US = (lat: number, lng: number) => {
  // Detection for San Francisco / US Default simulator coordinates
  return lat > 30 && lat < 45 && lng < -70 && lng > -130;
};

function getCoords(stop: any): { latitude: number; longitude: number } | null {
  if (stop?.location?.coordinates?.length === 2) {
    const [lng, lat] = stop.location.coordinates;
    if (lng && lat) return { latitude: lat, longitude: lng };
  }
  return null;
}

// ── component ─────────────────────────────────────────────────────────────────

export const RouteScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const { routeId } = route.params || {};
  const mapRef = useRef<MapView>(null);

  const [assignment, setAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Driver Position
  const [driverPos, setDriverPos] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationSubscription, setLocationSubscription] =
    useState<Location.LocationSubscription | null>(null);
  const [hasFollowedInitial, setHasFollowedInitial] = useState(false);

  // Animation logic
  const animatedIndex = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  // Directions
  const [roadPolyline, setRoadPolyline] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [fetchingDirections, setFetchingDirections] = useState(false);

  // Actions
  const [actionLoading, setActionLoading] = useState(false);
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [skipError, setSkipError] = useState("");
  const [activeStopToSkip, setActiveStopToSkip] = useState<any>(null);
  const [mapType, setMapType] = useState<MapType>("standard");
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  useEffect(() => {
    if (isFocused) {
      loadRoute();
      startTracking();
    }
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
      animatedIndex.removeAllListeners();
    };
  }, [isFocused]);

  const loadRoute = async () => {
    try {
      setLoading(true);
      const data = await driverService.getMyRoute(routeId);
      setAssignment(data);
      if (!data) return;

      // If driver doesn't have a GPS lock yet, use the startPoint from the backend
      if (data.startPoint?.coordinates?.length === 2) {
        const [lng, lat] = data.startPoint.coordinates;
        const initialPos = { latitude: lat, longitude: lng };
        setDriverPos(initialPos);

        // Animate map to this position
        mapRef.current?.animateToRegion(
          {
            ...initialPos,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          1000,
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Please enable location permissions to use navigation.",
      );
      return;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const initialCoords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };

      // Simulator Guard: Don't jump to US if we are supposed to be in Akure
      const isUS = IS_SIMULATOR_US(
        initialCoords.latitude,
        initialCoords.longitude,
      );

      if (!isUS) {
        setDriverPos(initialCoords);
        if (!hasFollowedInitial) {
          mapRef.current?.animateToRegion(
            {
              ...initialCoords,
              latitudeDelta: 0.015,
              longitudeDelta: 0.015,
            },
            1000,
          );
          setHasFollowedInitial(true);
        }
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          if (!isAnimating) {
            const newCoords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            if (!IS_SIMULATOR_US(newCoords.latitude, newCoords.longitude)) {
              setDriverPos(newCoords);
            }
          }
        },
      );
      setLocationSubscription(sub);
    } catch (e) {
      console.warn("Location tracking failed", e);
    }
  };

  // When driverPos or pending stops change, fetch Google Directions
  useEffect(() => {
    if (assignment && driverPos) {
      fetchDirections();
    }
  }, [assignment?.stops, driverPos?.latitude, driverPos?.longitude]);

  const fetchDirections = async () => {
    if (!assignment || !driverPos) return;

    const pendingStops = assignment.stops.filter(
      (s: any) => s.status === "Pending",
    );
    if (pendingStops.length === 0) {
      setRoadPolyline([]);
      return;
    }

    const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
    if (!API_KEY) {
      console.warn(
        "EXPO_PUBLIC_GOOGLE_MAPS_KEY is missing. Falling back to straight lines.",
      );
      const coords = [
        driverPos,
        ...pendingStops.map(getCoords).filter(Boolean),
      ] as any;
      setRoadPolyline(coords);
      return;
    }

    try {
      setFetchingDirections(true);

      const origin = `${driverPos.latitude},${driverPos.longitude}`;

      // We will only query up to 23 waypoints at once + destination (API Limit is 25 total)
      const validPendingStops = pendingStops.filter(getCoords);
      if (validPendingStops.length === 0) return;

      const stopsToRoute = validPendingStops.slice(0, 24);
      const destinationCoords = getCoords(
        stopsToRoute[stopsToRoute.length - 1],
      )!;
      const destination = `${destinationCoords.latitude},${destinationCoords.longitude}`;

      const waypoints = stopsToRoute
        .slice(0, -1)
        .map((s: any) => {
          const c = getCoords(s)!;
          return `${c.latitude},${c.longitude}`;
        })
        .join("|");

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ""}&key=${API_KEY}`;

      const response = await fetch(url);
      const json = await response.json();

      if (json.status === "OK" && json.routes.length > 0) {
        const points = polylineDecoder.decode(
          json.routes[0].overview_polyline.points,
        );
        const coords = points.map((point: any) => ({
          latitude: point[0],
          longitude: point[1],
        }));
        setRoadPolyline(coords);
      } else {
        console.warn("Google Directions API failed:", json.status);
        // Fallback to straight lines
        const fallback = [driverPos, ...stopsToRoute.map(getCoords)] as any;
        setRoadPolyline(fallback);
      }
    } catch (e) {
      console.error(e);
      // Fallback
    } finally {
      setFetchingDirections(false);
    }
  };

  const handleCollect = async (stopId: string) => {
    if (isAnimating) return;

    setActionLoading(true);
    try {
      await driverService.collectHousehold(
        assignment._id || assignment.id,
        stopId,
      );

      // Start Animation before updating panel
      if (roadPolyline.length > 1) {
        await runMovementAnimation("Completed", stopId);
      } else {
        // Fallback if no path
        setAssignment((prev: any) => ({
          ...prev,
          stops: prev.stops.map((s: any) =>
            s._id === stopId || s.id === stopId
              ? { ...s, status: "Completed" }
              : s,
          ),
        }));
      }
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const runMovementAnimation = (newStatus: string, stopId: string) => {
    return new Promise<void>((resolve) => {
      const nextStop = pendingStops[0];
      const nextStopCoords = getCoords(nextStop);
      if (!nextStopCoords || !driverPos) {
        resolve();
        return;
      }

      // 1. Extract path coordinates between current location and next stop
      let stopIndex = -1;
      let minDistance = Infinity;

      // Find the point in roadPolyline closest to the next stop
      for (let i = 0; i < roadPolyline.length; i++) {
        const dist = Math.sqrt(
          Math.pow(roadPolyline[i].latitude - nextStopCoords.latitude, 2) +
            Math.pow(roadPolyline[i].longitude - nextStopCoords.longitude, 2),
        );
        if (dist < minDistance) {
          minDistance = dist;
          stopIndex = i;
        }
      }

      // Use the segment to the stop if found, otherwise fallback to straight line
      const path =
        stopIndex !== -1 && minDistance < 0.001
          ? roadPolyline.slice(0, stopIndex + 1)
          : [
              { latitude: driverPos.latitude, longitude: driverPos.longitude },
              nextStopCoords,
            ];

      const fullPathAtStart = [...roadPolyline];

      setIsAnimating(true);
      animatedIndex.setValue(0);

      // 2. Animate the marker along these coordinates
      const listenerId = animatedIndex.addListener(({ value }) => {
        const index = Math.floor(value);
        const nextIndex = Math.min(index + 1, path.length - 1);
        const progress = value - index;

        const lat =
          path[index].latitude +
          (path[nextIndex].latitude - path[index].latitude) * progress;
        const lng =
          path[index].longitude +
          (path[nextIndex].longitude - path[index].longitude) * progress;

        const newPos = { latitude: lat, longitude: lng };
        setDriverPos(newPos);

        // 3. Shrink polyline behind the truck
        if (index > 0) {
          setRoadPolyline(fullPathAtStart.slice(index));
        }

        // 4. Follow the truck with the camera
        mapRef.current?.animateCamera(
          {
            center: { latitude: lat, longitude: lng },
            zoom: 16,
          },
          { duration: 100 },
        );
      });

      Animated.timing(animatedIndex, {
        toValue: path.length - 1,
        duration: path.length * 150,
        useNativeDriver: false,
      }).start(() => {
        // 5. After animation completes
        animatedIndex.removeAllListeners();
        setIsAnimating(false);

        setAssignment((prev: any) => ({
          ...prev,
          stops: prev.stops.map((s: any) =>
            s._id === stopId || s.id === stopId
              ? { ...s, status: newStatus }
              : s,
          ),
        }));
        resolve();
      });
    });
  };

  const handleSkipPrompt = (stop: any) => {
    setActiveStopToSkip(stop);
    setSkipReason("");
    setSkipError("");
    setSkipModalVisible(true);
  };

  const submitSkip = async () => {
    if (!skipReason.trim()) {
      setSkipError("Please provide a reason before skipping");
      return;
    }
    setActionLoading(true);
    try {
      const stopId = activeStopToSkip._id;
      await driverService.skipHousehold(
        assignment._id || assignment.id,
        stopId,
        skipReason,
      );
      setSkipModalVisible(false);

      // Start Animation
      if (roadPolyline.length > 1) {
        await runMovementAnimation("Skipped", stopId);
      } else {
        setAssignment((prev: any) => ({
          ...prev,
          stops: prev.stops.map((s: any) =>
            s._id === stopId || s.id === stopId
              ? { ...s, status: "Skipped" }
              : s,
          ),
        }));
      }
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseToggle = async () => {
    if (!assignment) return;

    const newStatus = assignment.status === "Paused" ? "InProgress" : "Paused";
    setActionLoading(true);
    try {
      await driverService.updateRouteStatus(
        assignment._id || assignment.id,
        newStatus,
      );
      if (newStatus === "Paused") {
        Alert.alert(
          "Task Paused",
          "Your Task has been paused. You can resume it later from the dashboard.",
        );
        navigation.goBack();
      } else {
        await loadRoute();
      }
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const toggleMapType = () => {
    const types: MapType[] = ["standard", "satellite", "terrain", "hybrid"];
    const nextIndex = (types.indexOf(mapType) + 1) % types.length;
    setMapType(types[nextIndex]);
  };

  const recenterMap = () => {
    if (driverPos) {
      mapRef.current?.animateToRegion(
        {
          ...driverPos,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000,
      );
    }
  };

  const stops = assignment?.stops || [];
  const pendingStops = stops.filter((s: any) => s.status === "Pending");
  const isComplete = assignment && pendingStops.length === 0;

  useEffect(() => {
    if (isComplete && assignment) {
      navigation.replace("RouteSummary", {
        routeId: assignment._id || assignment.id,
      });
    }
  }, [isComplete, assignment, navigation]);

  if (loading && !assignment) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!assignment) {
    return (
      <View style={styles.centered}>
        <AppText variant="h3" color={theme.colors.textSecondary}>
          No active task.
        </AppText>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  if (isComplete) return null;

  const nextStop = pendingStops[0];
  const nextStopCoords = getCoords(nextStop);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        mapType={mapType}
        initialRegion={{
          latitude: 7.2507, // Default Akure Center
          longitude: 5.2103,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {driverPos && (
          <Marker coordinate={driverPos} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.driverMarker}>
              <AppText style={{ fontSize: 24 }}>🚛</AppText>
            </View>
          </Marker>
        )}

        {stops.map((stop: any, index: number) => {
          const coords = getCoords(stop);
          if (!coords) return null;
          const markerKey =
            stop._id?.$oid || stop._id || stop.id || `stop-${index}`;

          return (
            <Marker
              key={markerKey}
              coordinate={coords}
              pinColor={
                stop.status === "Completed"
                  ? "#9E9E9E"
                  : stop.status === "Skipped"
                    ? "#FF6D00"
                    : "#F44336"
              }
            >
              <Callout tooltip={false}>
                <View style={{ padding: 10, minWidth: 150 }}>
                  <AppText
                    variant="bodySmall"
                    weight="600"
                    style={{ color: "#000" }}
                  >
                    {stop.address || "Unknown Address"}
                  </AppText>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {roadPolyline.length > 0 && (
          <Polyline
            coordinates={roadPolyline}
            strokeColor="#2196F3"
            strokeWidth={4}
          />
        )}
      </MapView>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={handlePauseToggle}
        disabled={actionLoading}
      >
        {assignment.status === "Paused" ? (
          <Play color="#fff" size={24} />
        ) : (
          <Pause color="#fff" size={24} />
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.mapTypeBtn} onPress={toggleMapType}>
        <Layers color="#fff" size={24} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.recenterBtn} onPress={recenterMap}>
        <MapPin color="#fff" size={24} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.expandBtn}
        onPress={() => setIsMapExpanded(!isMapExpanded)}
      >
        <Ionicons
          name={isMapExpanded ? "contract-outline" : "expand-outline"}
          color="#fff"
          size={24}
        />
      </TouchableOpacity>

      <View style={styles.legend}>
        <AppText style={styles.legendText}>🔴 Pending</AppText>
        <AppText style={styles.legendText}>⚫ Collected</AppText>
        <AppText style={styles.legendText}>🟠 Skipped</AppText>
      </View>

      {!isMapExpanded && (
        <View style={styles.sheetBackground}>
          <View style={styles.sheetContent}>
            <AppText
              variant="caption"
              weight="bold"
              color={theme.colors.primary}
              style={{ marginBottom: 4 }}
            >
              NEXT STOP
            </AppText>
            <AppText variant="h2" numberOfLines={1} style={{ marginBottom: 4 }}>
              {nextStop.address || "Unknown Address"}
            </AppText>
            <AppText
              variant="body"
              color={theme.colors.textSecondary}
              numberOfLines={1}
            >
              {nextStop.userId?.name || "Resident"}
            </AppText>

            <View style={{ marginTop: 12, display: "flex" }}>
              {nextStop.street ? (
                <AppText
                  variant="bodySmall"
                  color={theme.colors.textSecondary}
                  style={{ marginBottom: 4 }}
                >
                  Description: {nextStop.street}
                </AppText>
              ) : null}
              <AppText
                variant="bodySmall"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 4 }}
              >
                Ward: {nextStop.ward} • {nextStop.lga}
              </AppText>
              <AppText
                variant="bodySmall"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 12 }}
              >
                PU: {nextStop.pollingUnit}
              </AppText>
              {nextStopCoords && (
                <AppText
                  variant="caption"
                  color={theme.colors.textSecondary}
                  style={{ marginBottom: 16 }}
                >
                  {nextStopCoords.latitude.toFixed(5)},{" "}
                  {nextStopCoords.longitude.toFixed(5)}
                </AppText>
              )}

              <View style={styles.actionRow}>
                <AppButton
                  title="Mark as Collected"
                  onPress={() => handleCollect(nextStop._id)}
                  loading={actionLoading}
                  style={{ flex: 1, marginRight: 12 }}
                />
                <AppButton
                  title="Skip"
                  variant="outline"
                  onPress={() => handleSkipPrompt(nextStop)}
                  disabled={actionLoading}
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Skip Modal */}
      <Modal visible={skipModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText variant="h3" style={{ marginBottom: 12 }}>
              Reason for skipping
            </AppText>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Nobody home, gate locked..."
              value={skipReason}
              onChangeText={(text) => {
                setSkipReason(text);
                setSkipError("");
              }}
              multiline
              numberOfLines={4}
            />
            {skipError ? (
              <AppText
                variant="caption"
                color={theme.colors.error}
                style={{ marginTop: 4 }}
              >
                {skipError}
              </AppText>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 24,
              }}
            >
              <AppButton
                title="Cancel"
                variant="ghost"
                onPress={() => setSkipModalVisible(false)}
                style={{ marginRight: 12 }}
              />
              <AppButton
                title="Submit"
                onPress={submitSkip}
                loading={actionLoading}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  driverMarker: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stopMarker: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  backBtn: {
    position: "absolute",
    top: 60,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetBackground: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    paddingBottom: 24,
  },
  sheetContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 24,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: "top",
  },
  mapTypeBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  legend: {
    position: "absolute",
    top: 130,
    right: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    padding: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendText: {
    fontSize: 12,
    color: "#333",
    marginBottom: 2,
  },
  recenterBtn: {
    position: "absolute",
    top: 60,
    right: 128,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  expandBtn: {
    position: "absolute",
    top: 60,
    right: 74,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
});
