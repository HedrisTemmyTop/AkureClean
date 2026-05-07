import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { StatusBadge } from "../../components/StatusBadge";
import { theme } from "../../theme";
import { adminService } from "../../services/adminService";
import { routeService } from "../../services/routeService";
import { pickupService, PickupRequestData } from "../../services/pickupService";
import { User, AssignmentRoute } from "../../types";
import {
  Truck,
  Clock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react-native";
import { AdminStackParamList } from "../../navigation/RoleNavigator";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { Modal, Alert as RNAlert } from "react-native";
import * as Animatable from "react-native-animatable";
import { parseApiError } from "../../services/api";

type NavigationProp = NativeStackNavigationProp<
  AdminStackParamList,
  "AdminCollectorDetails"
>;

export const AdminCollectorDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const { driverId } = route.params;
  const navigation = useNavigation<NavigationProp>();

  const [driver, setDriver] = useState<User | null>(null);
  const [assignments, setAssignments] = useState<AssignmentRoute[]>([]);
  const [pickups, setPickups] = useState<PickupRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assignments' | 'pickups'>('assignments');
  const [isDeactivationModalVisible, setIsDeactivationModalVisible] =
    useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadDetails = async () => {
    try {
      const drivers = await adminService.getAllDrivers();
      const foundDriver = drivers.find((d) => String(d.id) === String(driverId));
      if (foundDriver) {
        setDriver(foundDriver);
      }

      const driverAssignments =
        await routeService.getAssignmentsByDriver(driverId);
      setAssignments(driverAssignments);

      const driverPickups = await pickupService.getCollectorPickups(driverId);
      setPickups(driverPickups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [driverId]);

  const handleToggleStatus = async () => {
    if (!driver) return;
    setIsDeactivationModalVisible(true);
  };

  const confirmDeactivation = async () => {
    if (!driver || !deactivationReason.trim()) {
      RNAlert.alert("Error", "Please provide a reason for deactivation");
      return;
    }

    setIsActionLoading(true);
    try {
      const newStatus = !driver.isDeactivated;
      await adminService.updateDriverStatus(driver.id, newStatus, deactivationReason);
      await loadDetails();
      setIsDeactivationModalVisible(false);
      setDeactivationReason("");
      RNAlert.alert("Success", `Collector ${newStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (e) {
      RNAlert.alert("Error", parseApiError(e));
    } finally {
      setIsActionLoading(false);
    }
  };

  const renderAssignment = ({ item }: { item: AssignmentRoute }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("AdminAssignmentDetails", { routeId: item.id })
      }
    >
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <View>
            <AppText variant="body" weight="600" style={styles.cardTitle}>
              {item.area} Street
            </AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {item.title}
            </AppText>
          </View>
          <StatusBadge status={item.status as any} />
        </View>
        <View style={styles.infoRow}>
          <View style={styles.iconRow}>
            <Clock color={theme.colors.textSecondary} size={14} />
            <AppText
              variant="caption"
              color={theme.colors.textSecondary}
              style={{ marginLeft: 6 }}
            >
              {item.collectionDate}
            </AppText>
          </View>
          <View style={styles.iconRow}>
            <MapPin color={theme.colors.textSecondary} size={14} />
            <AppText
              variant="caption"
              color={theme.colors.textSecondary}
              style={{ marginLeft: 6 }}
            >
              {item.stops?.length || 0} stops
            </AppText>
          </View>
        </View>
      </AppCard>
    </TouchableOpacity>
  );

  const renderPickup = ({ item }: { item: PickupRequestData }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate("AdminPickupDetails", { pickupId: item.id })
      }
    >
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <View>
            <AppText variant="body" weight="600" style={styles.cardTitle}>
              {item.type} Pickup
            </AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {(item as any).userId?.name || 'Resident'}
            </AppText>
          </View>
          <StatusBadge status={item.status as any} />
        </View>
        <View style={styles.infoRow}>
          <View style={styles.iconRow}>
            <Clock color={theme.colors.textSecondary} size={14} />
            <AppText
              variant="caption"
              color={theme.colors.textSecondary}
              style={{ marginLeft: 6 }}
            >
              {new Date((item as any).createdAt).toLocaleDateString()}
            </AppText>
          </View>
          <View style={styles.iconRow}>
            <MapPin color={theme.colors.textSecondary} size={14} />
            <AppText
              variant="caption"
              color={theme.colors.textSecondary}
              style={{ marginLeft: 6 }}
            >
              {(item as any).localGovt}
            </AppText>
          </View>
        </View>
      </AppCard>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.pageHeader}>
        <AppText variant="h2">Collector Details</AppText>
        {driver && (
          <>
            <View style={styles.driverProfile}>
            <View style={styles.iconBox}>
              <Truck color={theme.colors.secondary} size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="h3">{driver.name || driver.email}</AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {driver.email}
              </AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                {driver.phone || "No phone"}
              </AppText>
              {driver.isDeactivated && (
                <View style={styles.deactivatedBadge}>
                  <AppText
                    variant="caption"
                    color={theme.colors.status.cancelled}
                    weight="600"
                  >
                    DEACTIVATED: {driver.deactivationReason}
                  </AppText>
                </View>
              )}
            </View>
            <AppButton
              variant="outline"
              size="small"
              onPress={handleToggleStatus}
              title={driver.isDeactivated ? "Activate" : "Deactivate"}
              style={
                driver.isDeactivated ? styles.activateBtn : styles.deactivateBtn
              }
              textStyle={{
                color: driver.isDeactivated
                  ? theme.colors.primary
                  : theme.colors.status.cancelled,
              }}
              icon={
                driver.isDeactivated ? (
                  <ShieldCheck size={16} color={theme.colors.primary} />
                ) : (
                  <ShieldAlert
                    size={16}
                    color={theme.colors.status.cancelled}
                  />
                )
              }
            />
          </View>

          {/* Collector Stats & Info Card */}
          <AppCard style={styles.infoCard} elevation="sm">
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <AppText variant="caption" color={theme.colors.textSecondary}>Truck Plate</AppText>
                <AppText variant="body" weight="600">{driver.truckPlateNumber || 'N/A'}</AppText>
              </View>
              <View style={styles.infoItem}>
                <AppText variant="caption" color={theme.colors.textSecondary}>Capacity</AppText>
                <AppText variant="body" weight="600">{driver.truckCapacity || 'N/A'}</AppText>
              </View>
            </View>
            <View style={[styles.infoGrid, { marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={theme.colors.textSecondary}>Operating Address</AppText>
                <AppText variant="body">{driver.address || 'Not specified'}</AppText>
              </View>
            </View>
            <View style={[styles.infoGrid, { marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={theme.colors.textSecondary}>Joined Date</AppText>
                <AppText variant="body">{new Date(driver.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</AppText>
              </View>
            </View>
          </AppCard>
        </>
      )}
    </View>

      <Modal
        visible={isDeactivationModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <Animatable.View
            animation="zoomIn"
            duration={300}
            style={styles.modalContent}
          >
            <AppText variant="h3">
              {driver?.isDeactivated ? "Activate" : "Deactivate"} Collector
            </AppText>
            <AppText
              variant="body"
              color={theme.colors.textSecondary}
              style={{ marginBottom: 16 }}
            >
              Please provide a reason for{" "}
              {driver?.isDeactivated ? "reactivating" : "deactivating"} this
              collector.
            </AppText>
 
            <AppInput
              placeholder="Enter reason..."
              value={deactivationReason}
              onChangeText={setDeactivationReason}
              multiline
              numberOfLines={4}
              style={{ height: 100, textAlignVertical: "top" }}
            />
 
            <View style={styles.modalButtons}>
              <AppButton
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setIsDeactivationModalVisible(false);
                  setDeactivationReason("");
                }}
                style={{ flex: 1, marginRight: 8 }}
              />
              <AppButton
                title="Confirm"
                loading={isActionLoading}
                onPress={confirmDeactivation}
                style={{
                  flex: 1,
                  backgroundColor: driver?.isDeactivated
                    ? theme.colors.success
                    : theme.colors.status.cancelled,
                }}
              />
            </View>
          </Animatable.View>
        </View>
      </Modal>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assignments' && styles.activeTab]}
          onPress={() => setActiveTab('assignments')}
        >
          <AppText
            variant="bodySmall"
            weight="600"
            color={activeTab === 'assignments' ? theme.colors.primary : theme.colors.textSecondary}
          >
            ASSIGNMENTS
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pickups' && styles.activeTab]}
          onPress={() => setActiveTab('pickups')}
        >
          <AppText
            variant="bodySmall"
            weight="600"
            color={activeTab === 'pickups' ? theme.colors.primary : theme.colors.textSecondary}
          >
            PICKUP HISTORY
          </AppText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <AppText variant="body" color={theme.colors.textSecondary}>
          Loading details...
        </AppText>
      ) : activeTab === 'assignments' ? (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          renderItem={renderAssignment}
          scrollEnabled={false}
          ListEmptyComponent={
            <AppText variant="body" color={theme.colors.textSecondary}>
              No assignments found for this collector.
            </AppText>
          }
        />
      ) : (
        <FlatList
          data={pickups}
          keyExtractor={(item) => item.id}
          renderItem={renderPickup}
          scrollEnabled={false}
          ListEmptyComponent={
            <AppText variant="body" color={theme.colors.textSecondary}>
              No pickup history found for this collector.
            </AppText>
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: theme.spacing.xl,
  },
  driverProfile: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.secondary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deactivateBtn: {
    borderColor: theme.colors.status.cancelled,
  },
  activateBtn: {
    borderColor: theme.colors.primary,
  },
  deactivatedBadge: {
    backgroundColor: theme.colors.status.cancelled + "10",
    padding: 6,
    borderRadius: 4,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    marginTop: theme.spacing.xl,
  },
  infoCard: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  }
});
