import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
} from "react-native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { theme } from "../../theme";
import { zoneService } from "../../services/zoneService";
import { routeService } from "../../services/routeService";
import { adminService } from "../../services/adminService";
import { parseApiError } from "../../services/api";
import { MapPin, User, Navigation } from "lucide-react-native";

export const AdminZonesScreen: React.FC = () => {
  const [zones, setZones] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [zonesData, driversData] = await Promise.all([
        zoneService.getZones(),
        adminService.getAllDrivers(),
      ]);
      setZones(zonesData);
      setDrivers(driversData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignDriver = (zone: any) => {
    // A real app would show a modal to select a driver from 'drivers'
    // Here we'll just mock picking the first one or alert if none
    if (drivers.length === 0) {
      Alert.alert("No collectors", "No collectors available to assign.");
      return;
    }
    const driver = drivers[0];

    Alert.alert("Assign Collector", `Assign ${driver.name} to ${zone.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Assign",
        onPress: async () => {
          try {
            await zoneService.assignDriver(zone._id || zone.id, driver.id);
            Alert.alert("Success", "Driver assigned");
            loadData();
          } catch (e) {
            Alert.alert("Error", parseApiError(e));
          }
        },
      },
    ]);
  };

  const handleGenerateRoute = async (zone: any) => {
    try {
      await routeService.generateRoute(zone._id || zone.id);
      Alert.alert("Success", "Route generated successfully!");
    } catch (e) {
      Alert.alert("Error generating route", parseApiError(e));
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <MapPin color={theme.colors.primary} size={20} />
          <AppText variant="h3" style={{ marginLeft: 8 }}>
            {item.name}
          </AppText>
        </View>
      </View>

      <View style={styles.infoRow}>
        <User color={theme.colors.textSecondary} size={16} />
        <AppText
          variant="bodySmall"
          color={theme.colors.textSecondary}
          style={{ marginLeft: 6 }}
        >
          Driver:{" "}
          {item.assignedDriver
            ? item.assignedDriver.name || item.assignedDriver.email
            : "Unassigned"}
        </AppText>
      </View>

      <View style={styles.actions}>
        <AppButton
          title="Assign Collector"
          variant="outline"
          style={styles.actionBtn}
          onPress={() => handleAssignDriver(item)}
        />
        <AppButton
          title="Generate Route"
          style={styles.actionBtn}
          onPress={() => handleGenerateRoute(item)}
          icon={<Navigation color={theme.colors.surface} size={16} />}
        />
      </View>
    </AppCard>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.headerTitle}>
        <AppText variant="h2">Manage Zones</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Assign collector and generate routes.
        </AppText>
      </View>

      {loading ? (
        <AppText variant="body" color={theme.colors.textSecondary}>
          Loading zones...
        </AppText>
      ) : (
        <FlatList
          data={zones}
          keyExtractor={(item) => item._id || item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={<AppText variant="body">No zones found.</AppText>}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    marginBottom: theme.spacing.xl,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
  },
});
