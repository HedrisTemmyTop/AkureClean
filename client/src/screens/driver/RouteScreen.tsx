import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform,
} from "react-native";
import {
  useNavigation,
  useRoute,
  useIsFocused,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  PROVIDER_DEFAULT,
} from "react-native-maps";
import { Pause, CheckCircle } from "lucide-react-native";
import * as Animatable from "react-native-animatable";
import * as Location from "expo-location";

import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { theme } from "../../theme";
import { driverService } from "../../services/driverService";
import { routeService } from "../../services/routeService";
import { DriverStackParamList } from "../../navigation/RoleNavigator";

type NavigationProp = NativeStackNavigationProp<DriverStackParamList, "Route">;

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ── helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract { latitude, longitude } from a stop.
 *
 * Stop shape (new model):
 *   stop.location.coordinates = [lng, lat]   ← flat on the stop document
 *   stop.address                              ← flat string
 *   stop.userId = { name, phone, ... }        ← populated resident
 *
 * Legacy shape (old model, kept for safety):
 *   stop.householdId.location.coordinates = [lng, lat]
 */
function getCoords(stop: any): { latitude: number; longitude: number } | null {
  // Normalised shape (from routeService.getRouteById) — already converted
  if (
    stop?.coordinates?.latitude &&
    stop?.coordinates?.longitude &&
    stop.coordinates.latitude !== 0 &&
    stop.coordinates.longitude !== 0
  ) {
    return {
      latitude: stop.coordinates.latitude,
      longitude: stop.coordinates.longitude,
    };
  }
  // Raw shape (from driverService.getMyRoute) — flat location on stop
  if (stop?.location?.coordinates?.length === 2) {
    const [lng, lat] = stop.location.coordinates;
    if (lng && lat && lng !== 0 && lat !== 0)
      return { latitude: lat, longitude: lng };
  }
  // Legacy shape — coordinates nested under householdId
  if (stop?.householdId?.location?.coordinates?.length === 2) {
    const [lng, lat] = stop.householdId.location.coordinates;
    if (lng && lat && lng !== 0 && lat !== 0)
      return { latitude: lat, longitude: lng };
  }
  return null;
}

function getAddress(stop: any): string {
  console.log("stop===>", stop);
  return stop?.address || stop?.householdId?.address || "Unknown address";
}

function getResidentName(stop: any): string {
  return stop?.userId?.name || stop?.householdId?.userId?.name || "";
}

function getResidentPhone(stop: any): string {
  return stop?.userId?.phone || stop?.householdId?.userId?.phone || "";
}

function getDescription(stop: any): string {
  return (
    stop?.street ||
    stop?.houseDescription ||
    stop?.householdId?.houseDescription ||
    ""
  );
}

/** ID to pass to collectHousehold — userId preferred, householdId fallback */
function getStopResidentId(stop: any): string {
  return (
    stop?.userId?._id ??
    stop?.userId ??
    stop?.householdId?._id ??
    stop?.householdId ??
    stop?._id
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export const RouteScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const routeParams = useRoute<any>();
  const isFocused = useIsFocused();

  // routeId is passed from AssignmentDetailsScreen (preferred)
  // fall back to fetching the driver's active route if not provided
  const routeId: string | undefined = routeParams?.params?.routeId;

  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [routedPolyline, setRoutedPolyline] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const fetchRoute = async () => {
    try {
      let data: any;
      if (routeId) {
        data = await routeService.getRouteById(routeId);
        data._rawStops = data.stops;
      } else {
        data = await driverService.getMyRoute();
        if (data) data._rawStops = data.route ?? data.stops ?? [];
      }
      setRouteData(data);

      // Get current location to start the route from "Where I am"
      let userCoords: { latitude: number; longitude: number } | null = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          userCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        }
      } catch (e) {
        console.warn("Could not get current location for routing", e);
      }

      // Build road-following polyline via OSRM for PENDING stops only
      const rawStops: any[] = data?._rawStops ?? [];
      const pendingCoords = rawStops
        .filter((s: any) => s.status === "Pending")
        .map((s: any) => getCoords(s))
        .filter((c) => c && c.latitude !== 0 && c.longitude !== 0) as {
        latitude: number;
        longitude: number;
      }[];

      // Combine [Current Location] + [Pending Stops]
      // We only include userCoords if they are somewhat valid (not 0,0)
      const waypointsCoords =
        userCoords && userCoords.latitude !== 0
          ? [userCoords, ...pendingCoords]
          : pendingCoords;

      if (waypointsCoords.length >= 2) {
        try {
          const waypoints = waypointsCoords
            .map((c) => `${c.longitude},${c.latitude}`)
            .join(";");

          // Using OSRM 'route' service.
          // Note: overview=full is key for road-following geometry
          const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=false`;

          const res = await fetch(url);
          const json = await res.json();

          if (json.code === "Ok" && json.routes?.[0]?.geometry?.coordinates) {
            const roadCoords = json.routes[0].geometry.coordinates.map(
              ([lng, lat]: [number, number]) => ({
                latitude: lat,
                longitude: lng,
              }),
            );
            setRoutedPolyline(roadCoords);
          } else {
            console.log("OSRM returned non-OK code:", json.code);
            setRoutedPolyline(waypointsCoords);
          }
        } catch (err) {
          console.error("OSRM fetch failed:", err);
          setRoutedPolyline(waypointsCoords);
        }
      } else {
        setRoutedPolyline([]);
      }
    } catch (e) {
      console.error("RouteScreen fetchRoute error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchRoute();
  }, [isFocused]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!routeData) {
    return (
      <View style={[styles.container, styles.centered]}>
        <AppText
          variant="body"
          color={theme.colors.textSecondary}
          align="center"
        >
          No active route found. Ask your admin to assign you a route.
        </AppText>
      </View>
    );
  }

  // _rawStops is always set above regardless of fetch path
  const stops: any[] = routeData._rawStops ?? [];
  const completedCount = stops.filter((s) => s.status === "Completed").length;
  const progressPercent = (completedCount / Math.max(stops.length, 1)) * 100;

  const pendingStops = stops.filter((s) => s.status === "Pending");
  const activeStop = pendingStops[0] ?? null;

  // Map region — center on active stop or first stop with valid coords
  const stopsWithCoords = stops
    .map((s) => ({ stop: s, coords: getCoords(s) }))
    .filter((x) => x.coords);
  const activeCoords = activeStop ? getCoords(activeStop) : null;
  const firstCoords = stopsWithCoords[0]?.coords ?? null;
  const centerCoords = activeCoords ?? firstCoords;
  console.log("stops====>", stopsWithCoords);
  const mapRegion = centerCoords
    ? {
        ...centerCoords,
        latitudeDelta: activeCoords ? 0.01 : 0.05,
        longitudeDelta: activeCoords ? 0.01 : 0.05,
      }
    : null;

  const polylineCoords =
    routedPolyline.length >= 2
      ? routedPolyline
      : stopsWithCoords
          .filter((x) => x.stop.status === "Pending")
          .map((x) => x.coords!);

  // ── handlers ─────────────────────────────────────────────────────────────

  const handlePause = () => navigation.goBack();

  const handleFinish = () => {
    const assignmentId: string = routeData.id ?? routeData._id;
    const remaining = pendingStops.length;
    if (remaining > 0) {
      Alert.alert(
        "Unfinished Stops",
        `You still have ${remaining} stop${remaining > 1 ? "s" : ""} pending. Finish anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Finish Anyway",
            style: "destructive",
            onPress: () =>
              navigation.replace("RouteSummary", { routeId: assignmentId }),
          },
        ],
      );
    } else {
      navigation.replace("RouteSummary", { routeId: assignmentId });
    }
  };

  const handleCollect = async (stop: any) => {
    // Use the assignment-level stop update endpoint: PATCH /assignments/:id/stops/:stopId
    const assignmentId: string = routeData.id ?? routeData._id;
    const stopId: string = stop.id ?? stop._id;

    if (!assignmentId || !stopId) {
      Alert.alert("Error", "Cannot identify stop. Please contact admin.");
      return;
    }
    try {
      setLoading(true);
      await routeService.updateStopStatus(assignmentId, stopId, "Completed");
      await fetchRoute();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e.response?.data?.message || "Could not mark as collected",
      );
      setLoading(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Map Section */}
      <View style={styles.mapContainer}>
        {mapRegion ? (
          <MapView
            provider={
              Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT
            }
            mapType="satellite"
            style={styles.map}
            region={mapRegion}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {polylineCoords.length > 1 && (
              <Polyline
                coordinates={polylineCoords}
                strokeColor="#4D7DFB"
                strokeWidth={5}
                lineJoin="round"
                lineCap="round"
              />
            )}
            {stopsWithCoords.map(({ stop, coords }) => {
              const isCompleted = stop.status === "Completed";
              const isActive = stop._id === activeStop?._id;

              // Optionally hide completed markers or make them very transparent
              if (isCompleted) return null;

              return (
                <Marker
                  key={stop._id}
                  coordinate={coords!}
                  title={getAddress(stop)}
                  description={getResidentName(stop)}
                  opacity={isActive ? 1 : 0.7}
                  pinColor={
                    isActive ? theme.colors.primary : theme.colors.warning
                  }
                />
              );
            })}
          </MapView>
        ) : (
          <View
            style={[
              styles.map,
              styles.centered,
              { backgroundColor: "#e8e8e8" },
            ]}
          >
            <AppText
              variant="body"
              color={theme.colors.textSecondary}
              align="center"
            >
              No map coordinates yet.{"\n"}Stops have been assigned but have no
              GPS data.
            </AppText>
          </View>
        )}
      </View>

      {/* Floating Header */}
      <Animatable.View
        animation="slideInDown"
        duration={600}
        style={styles.headerOverlay}
      >
        <TouchableOpacity style={styles.headerBtn} onPress={handlePause}>
          <Pause color={theme.colors.text} size={20} />
        </TouchableOpacity>

        <AppCard style={styles.progressCard} elevation="md">
          <AppText variant="bodySmall" weight="600" style={{ marginBottom: 4 }}>
            {completedCount} of {stops.length} Stops Completed
          </AppText>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` as any },
              ]}
            />
          </View>
        </AppCard>

        <TouchableOpacity style={styles.headerBtn} onPress={handleFinish}>
          <CheckCircle color={theme.colors.success} size={20} />
        </TouchableOpacity>
      </Animatable.View>

      {/* Bottom Sheet */}
      <Animatable.View
        animation="slideInUp"
        duration={600}
        delay={200}
        style={styles.bottomSheet}
      >
        {activeStop ? (
          <>
            <AppText
              variant="caption"
              color={theme.colors.primary}
              weight="600"
              style={{ marginBottom: 8 }}
            >
              NEXT STOP
            </AppText>

            <AppText variant="h2" style={{ marginBottom: 4 }} numberOfLines={2}>
              {getAddress(activeStop)}
            </AppText>

            {getResidentName(activeStop) || getResidentPhone(activeStop) ? (
              <AppText
                variant="body"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 4 }}
              >
                {getResidentName(activeStop)}
                {getResidentPhone(activeStop)
                  ? ` • ${getResidentPhone(activeStop)}`
                  : ""}
              </AppText>
            ) : null}

            {getDescription(activeStop) ? (
              <AppText
                variant="bodySmall"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 4 }}
              >
                📝 {getDescription(activeStop)}
              </AppText>
            ) : null}

            {activeCoords ? (
              <AppText
                variant="caption"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 4 }}
              >
                📍 Lat: {activeCoords.latitude.toFixed(6)}, Lng:{" "}
                {activeCoords.longitude.toFixed(6)}
              </AppText>
            ) : null}

            {activeStop.pollingUnit ? (
              <AppText
                variant="bodySmall"
                color={theme.colors.textSecondary}
                style={{ marginBottom: theme.spacing.lg }}
              >
                🏛️ {activeStop.pollingUnit}
              </AppText>
            ) : (
              <View style={{ marginBottom: theme.spacing.lg }} />
            )}

            <TouchableOpacity
              style={styles.arriveBtn}
              onPress={() => handleCollect(activeStop)}
              activeOpacity={0.8}
            >
              <AppText
                variant="bodyLarge"
                weight="600"
                color={theme.colors.surface}
              >
                Collected
              </AppText>
              <CheckCircle color={theme.colors.surface} size={24} />
            </TouchableOpacity>

            {pendingStops.length > 1 && (
              <View style={styles.upcomingPreview}>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  Next up: {getAddress(pendingStops[1])}
                </AppText>
              </View>
            )}
          </>
        ) : (
          <View style={styles.centered}>
            <CheckCircle
              color={theme.colors.success}
              size={64}
              style={{ marginBottom: 16 }}
            />
            <AppText variant="h2" align="center">
              All Stops Cleared!
            </AppText>
            <AppText
              variant="body"
              color={theme.colors.textSecondary}
              align="center"
              style={{ marginVertical: 16 }}
            >
              You have completed all pickups on this route.
            </AppText>
            <TouchableOpacity
              style={styles.arriveBtn}
              onPress={handleFinish}
              activeOpacity={0.8}
            >
              <AppText
                variant="bodyLarge"
                weight="600"
                color={theme.colors.surface}
              >
                Finish Route
              </AppText>
            </TouchableOpacity>
          </View>
        )}
      </Animatable.View>
    </View>
  );
};

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  mapContainer: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  headerOverlay: {
    position: "absolute",
    top: 50,
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressCard: {
    flex: 1,
    marginHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: theme.colors.primary },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },

  arriveBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  upcomingPreview: {
    marginTop: theme.spacing.lg,
    alignItems: "center",
  },
});
