import React, { useEffect, useState } from "react";
import {
  Alert,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Map,
  Truck,
  List,
  CloudRain,
  AlertTriangle,
  Navigation,
  Clock,
  LogOut,
  CheckCircle,
  Calendar,
} from "lucide-react-native";
import * as Animatable from "react-native-animatable";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { pickupService } from "../../services/pickupService";
import { driverService } from "../../services/driverService";
import { weatherService } from "../../services/weatherService";
import { trafficService } from "../../services/trafficService";
import { driverLocationSocket } from "../../services/driverLocationSocket";
import * as Location from "expo-location";
import { DriverStackParamList } from "../../navigation/RoleNavigator";

type NavigationProp = NativeStackNavigationProp<
  DriverStackParamList,
  "DriverTabs"
>;

export const DriverDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [traffic, setTraffic] = useState<any>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    if (!user) return;
    try {
      console.log("DriverDashboard loadDashboard");
      const [routeData, weatherData, trafficData, pickups] = await Promise.all([
        driverService.getMyRoute(),
        weatherService.getWeatherConditions("Akure"),
        trafficService.getTrafficConditions("Akure"),
        pickupService.getDriverPickups(),
      ]);

      setActiveRoute(routeData);
      setWeather(weatherData);
      setTraffic(trafficData);
      setPendingRequests(pickups.data?.length || 0);
    } catch (e) {
      console.error("DriverDashboard load error:", e);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user]);

  // Connect to tracking socket and transmit collector position
  useEffect(() => {
    if (!user) return;

    let locationSub: any = null;
    let isMounted = true;

    const initTracking = async () => {
      try {
        await driverLocationSocket.connect();
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const isSimUS =
          pos.coords.latitude > 37 &&
          pos.coords.latitude < 38 &&
          pos.coords.longitude < -122 &&
          pos.coords.longitude > -123;

        const coords = isSimUS
          ? { latitude: 7.2507, longitude: 5.2103 }
          : { latitude: pos.coords.latitude, longitude: pos.coords.longitude };

        if (!isMounted) return;

        driverLocationSocket.sendLocationUpdate({
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: 0,
          heading: 0,
          timestamp: Date.now(),
          taskId: activeRoute?._id || null,
        });

        locationSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 10,
          },
          (loc) => {
            if (!isMounted) return;
            const isUS =
              loc.coords.latitude > 37 &&
              loc.coords.latitude < 38 &&
              loc.coords.longitude < -122 &&
              loc.coords.longitude > -123;

            const curCoords = isUS
              ? { latitude: 7.2507, longitude: 5.2103 }
              : {
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                };

            const rawSpeed = loc.coords.speed || 0;
            driverLocationSocket.sendLocationUpdate({
              latitude: curCoords.latitude,
              longitude: curCoords.longitude,
              speed: rawSpeed > 0 ? rawSpeed * 3.6 : 0,
              heading: loc.coords.heading || 0,
              timestamp: loc.timestamp || Date.now(),
              taskId: activeRoute?._id || null,
            });
          },
        );
      } catch (err) {
        console.warn("[DriverDashboard] Location init error:", err);
      }
    };

    initTracking();

    return () => {
      isMounted = false;
      if (locationSub) {
        locationSub.remove();
      }
    };
  }, [user, activeRoute?._id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const stops = activeRoute?.route || [];
  const completedStops = stops.filter(
    (s: any) => s.status === "Completed",
  ).length;

  return (
    <ScreenContainer
      scrollable
      scrollViewProps={{
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ),
      }}
    >
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <AppText variant="h2">Collector Shift</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </AppText>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut color={theme.colors.status.cancelled} size={22} />
          </TouchableOpacity>
        </View>
      </Animatable.View>

      {pendingRequests > 0 && (
        <Animatable.View animation="fadeIn" delay={150}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate("DriverTabs" as any, {
                screen: "Requests",
              })
            }
          >
            <View style={styles.alertCard}>
              <AlertTriangle
                color={theme.colors.warning}
                size={24}
                style={{ marginRight: theme.spacing.md }}
              />
              <View style={{ flex: 1 }}>
                <AppText
                  variant="body"
                  weight="600"
                  color={theme.colors.warning}
                >
                  New Ad-hoc Requests
                </AppText>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  There are {pendingRequests} paid pickup requests in your area.
                </AppText>
              </View>
            </View>
          </TouchableOpacity>
        </Animatable.View>
      )}

      {/* Monthly Pickup Availability Card */}
      <Animatable.View animation="fadeInUp" delay={180}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate("DriverAvailability")}
        >
          <AppCard
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.primary + "35",
              backgroundColor: theme.colors.primary + "08",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.colors.primary + "20",
                alignItems: "center",
                justifyContent: "center",
                marginRight: theme.spacing.md,
              }}
            >
              <Calendar color={theme.colors.primary} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="600" color={theme.colors.primary}>
                Monthly Pickup Availability
              </AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                Pick 1 day per week for this month so residents can book pickups.
              </AppText>
            </View>
          </AppCard>
        </TouchableOpacity>
      </Animatable.View>

      {/* Hero Active Route Section */}
      {activeRoute ? (
        <AppCard
          style={styles.activeRouteCard}
          elevation="md"
          animation="fadeInUp"
          delay={200}
        >
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.badge,
                activeRoute.status === "Completed" && {
                  backgroundColor: theme.colors.success + "20",
                },
                activeRoute.status === "Paused" && {
                  backgroundColor: theme.colors.warning + "20",
                },
              ]}
            >
              {activeRoute.status !== "Completed" &&
                activeRoute.status !== "Paused" && (
                  <View style={styles.pulseDot} />
                )}
              <AppText
                variant="caption"
                color={
                  activeRoute.status === "Completed"
                    ? theme.colors.success
                    : activeRoute.status === "Paused"
                      ? theme.colors.warning
                      : theme.colors.primary
                }
                weight="600"
              >
                {activeRoute.status === "Completed"
                  ? "TASK COMPLETED"
                  : activeRoute.status === "Paused"
                    ? "TASK PAUSED"
                    : "ACTIVE TASK"}
              </AppText>
            </View>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {activeRoute.status === "Completed"
                ? "Finished"
                : activeRoute.status === "Paused"
                  ? "On Break"
                  : "En Route"}
            </AppText>
          </View>
          <AppText variant="h2" style={styles.routeTitle}>
            {activeRoute.title || "Daily Zone Collection"}
          </AppText>

          <View style={styles.routeMeta}>
            <View style={styles.metaItem}>
              <Map color={theme.colors.textSecondary} size={16} />
              <AppText
                variant="bodySmall"
                color={theme.colors.textSecondary}
                style={styles.metaText}
              >
                {completedStops}/{stops.length} Stops
              </AppText>
            </View>
            <View style={styles.metaItem}>
              <Clock color={theme.colors.textSecondary} size={16} />
              <AppText
                variant="bodySmall"
                color={theme.colors.textSecondary}
                style={styles.metaText}
              >
                {new Date(activeRoute.collectionDate).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric" },
                )}{" "}
                • {activeRoute.collectionTime || "08:00 AM"}
              </AppText>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              activeRoute.status === "Completed" && {
                backgroundColor: theme.colors.success,
              },
              activeRoute.status === "Paused" && {
                backgroundColor: theme.colors.warning,
              },
            ]}
            onPress={() =>
              navigation.navigate(
                activeRoute.status === "Completed" ? "RouteSummary" : "Route",
                { routeId: activeRoute._id },
              )
            }
          >
            {activeRoute.status === "Completed" ? (
              <CheckCircle color={theme.colors.surface} size={20} />
            ) : activeRoute.status === "Paused" ? (
              <Navigation color={theme.colors.surface} size={20} />
            ) : (
              <Navigation color={theme.colors.surface} size={20} />
            )}
            <AppText
              variant="body"
              weight="600"
              color={theme.colors.surface}
              style={{ marginLeft: 8 }}
            >
              {activeRoute.status === "Completed"
                ? "View Summary"
                : activeRoute.status === "Paused"
                  ? "Resume Navigation"
                  : "Resume Navigation"}
            </AppText>
          </TouchableOpacity>
        </AppCard>
      ) : (
        <AppCard
          style={styles.activeRouteCard}
          elevation="md"
          animation="fadeInUp"
          delay={200}
        >
          <View style={styles.iconCircle}>
            <Truck color={theme.colors.primary} size={32} />
          </View>
          <AppText variant="h3" align="center" style={{ marginTop: 16 }}>
            Ready to Work?
          </AppText>
          <AppText
            variant="bodySmall"
            align="center"
            color={theme.colors.textSecondary}
            style={{ marginBottom: 16, marginTop: 4 }}
          >
            You have no active routes assigned right now.
          </AppText>
        </AppCard>
      )}

      {/* Env Conditions */}
      <View style={styles.conditionsRow}>
        <AppCard
          style={styles.conditionCard}
          animation="slideInLeft"
          delay={300}
        >
          <View style={styles.conditionHeader}>
            <CloudRain color={theme.colors.info} size={24} />
            <AppText
              variant="caption"
              color={theme.colors.textSecondary}
              style={{ flex: 1, textAlign: "right" }}
            >
              Weather
            </AppText>
          </View>
          <AppText variant="h3">{weather?.temperature || "--"}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {weather?.condition || "Loading..."}
          </AppText>
        </AppCard>

        <AppCard
          style={styles.conditionCard}
          animation="slideInRight"
          delay={400}
        >
          <View style={styles.conditionHeader}>
            <AlertTriangle
              color={
                traffic?.condition === "Heavy"
                  ? theme.colors.warning
                  : theme.colors.success
              }
              size={24}
            />
            <AppText
              variant="caption"
              color={theme.colors.textSecondary}
              style={{ flex: 1, textAlign: "right" }}
            >
              Traffic
            </AppText>
          </View>
          <AppText variant="h3">{traffic?.condition || "--"}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {traffic?.delay || ""}
          </AppText>
        </AppCard>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutBtn: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.status.cancelled + "10",
    borderRadius: theme.borderRadius.md,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.warning + "15",
    borderColor: theme.colors.warning,
    borderWidth: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  activeRouteCard: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary + "20",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: 6,
  },
  routeTitle: {
    marginBottom: theme.spacing.md,
  },
  routeMeta: {
    flexDirection: "row",
    marginBottom: theme.spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: theme.spacing.lg,
  },
  metaText: {
    marginLeft: 6,
  },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  conditionsRow: {
    flexDirection: "row",
    marginHorizontal: -theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  conditionCard: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  conditionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
});
