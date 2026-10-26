import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Calendar,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Users,
  XCircle,
} from "lucide-react-native";
import * as Animatable from "react-native-animatable";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { theme } from "../../theme";
import {
  availabilityService,
  AdminAvailabilityResponse,
  AdminDriverAvailabilityItem,
} from "../../services/availabilityService";

const pad2 = (n: number) => String(n).padStart(2, "0");

const getMonthOptions = () => {
  const now = new Date();
  const y1 = now.getFullYear();
  const m1 = now.getMonth() + 1;
  const key1 = `${y1}-${pad2(m1)}`;
  const label1 = now.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  const next = new Date(y1, m1, 1);
  const y2 = next.getFullYear();
  const m2 = next.getMonth() + 1;
  const key2 = `${y2}-${pad2(m2)}`;
  const label2 = next.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return [
    { key: key1, label: `${label1} (This Month)` },
    { key: key2, label: `${label2} (Next Month)` },
  ];
};

export const AdminDriverAvailabilityScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(
    monthOptions[0].key
  );
  const [filterMode, setFilterMode] = useState<
    "all" | "awaiting" | "approved" | "rejected" | "pending"
  >("all");
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectModalItem, setRejectModalItem] =
    useState<AdminDriverAvailabilityItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const [data, setData] = useState<AdminAvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (monthKey = selectedMonthKey) => {
    try {
      const res = await availabilityService.getAllDriversAvailability(monthKey);
      setData(res);
    } catch (e) {
      console.error("AdminDriverAvailability load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData(selectedMonthKey);
  }, [selectedMonthKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(selectedMonthKey);
    setRefreshing(false);
  };

  const filteredDrivers = useMemo(() => {
    const list = data?.drivers || [];
    if (filterMode === "awaiting") {
      return list.filter(
        (d) => d.hasAvailability && d.approvalStatus === "pending"
      );
    }
    if (filterMode === "approved") {
      return list.filter((d) => d.approvalStatus === "approved");
    }
    if (filterMode === "rejected") {
      return list.filter((d) => d.approvalStatus === "rejected");
    }
    if (filterMode === "pending") {
      return list.filter((d) => !d.hasAvailability);
    }
    return list;
  }, [data, filterMode]);

  const doApprove = async (item: AdminDriverAvailabilityItem) => {
    if (!item.availabilityId) return;
    setApprovingId(item.availabilityId);
    try {
      await availabilityService.approveAvailability(item.availabilityId);
      await loadData(selectedMonthKey);
      Alert.alert(
        "Approved",
        `${item.driver.name}'s availability is now visible to residents.`
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to approve availability."
      );
    } finally {
      setApprovingId(null);
    }
  };

  const confirmApprove = (item: AdminDriverAvailabilityItem) => {
    Alert.alert(
      "Approve Availability",
      `Approving publishes ${item.driver.name}'s days to residents and locks the driver from changing them. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve", onPress: () => doApprove(item) },
      ]
    );
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem?.availabilityId || !rejectReason.trim()) {
      Alert.alert("Reason Required", "Please enter a reason for rejection.");
      return;
    }
    setRejecting(true);
    try {
      await availabilityService.rejectAvailability(
        rejectModalItem.availabilityId,
        rejectReason.trim()
      );
      setRejectModalItem(null);
      setRejectReason("");
      await loadData(selectedMonthKey);
      Alert.alert(
        "Rejected",
        `${rejectModalItem.driver.name}'s availability has been rejected. They have been notified to update it.`
      );
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.message || "Failed to reject availability."
      );
    } finally {
      setRejecting(false);
    }
  };

  const renderDriverCard = ({
    item,
    index,
  }: {
    item: AdminDriverAvailabilityItem;
    index: number;
  }) => {
    const delay = Math.min(index * 80, 400);

    return (
      <Animatable.View animation="fadeInUp" delay={delay}>
        <AppCard style={styles.driverCard}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View style={styles.avatarBox}>
                <Truck color={theme.colors.primary} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="600">
                  {item.driver.name}
                </AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {item.driver.phone || item.driver.email} •{" "}
                  {item.driver.truckPlateNumber}
                </AppText>
              </View>
            </View>
            {(() => {
              const isApproved = item.approvalStatus === "approved";
              const isRejected = item.approvalStatus === "rejected";
              const pillColor = isApproved
                ? theme.colors.success
                : isRejected
                  ? theme.colors.error
                  : item.hasAvailability
                    ? theme.colors.warning
                    : theme.colors.textSecondary;
              const pillLabel = isApproved
                ? "Approved"
                : isRejected
                  ? "Rejected"
                  : item.hasAvailability
                    ? "Awaiting Approval"
                    : "Not Set";
              return (
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: pillColor + "15" },
                  ]}
                >
                  <AppText variant="caption" weight="600" color={pillColor}>
                    {pillLabel}
                  </AppText>
                </View>
              );
            })()}
          </View>

          {/* Assigned Area */}
          <View style={styles.areaSection}>
            <MapPin color={theme.colors.textSecondary} size={14} />
            <View style={{ marginLeft: 6, flex: 1 }}>
              {item.coverage.pollingUnits.length > 0 ? (
                <>
                  <AppText variant="caption" weight="600">
                    {item.coverage.localGovts.join(", ")} •{" "}
                    {item.coverage.wards.join(", ")}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    Polling Units ({item.coverage.pollingUnits.length}):{" "}
                    {item.coverage.pollingUnits.slice(0, 3).join(", ")}
                    {item.coverage.pollingUnits.length > 3
                      ? ` +${item.coverage.pollingUnits.length - 3} more`
                      : ""}
                  </AppText>
                </>
              ) : (
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  No Polling Units assigned yet
                </AppText>
              )}
            </View>
          </View>

          {/* Monthly Weekly Slots */}
          {item.hasAvailability ? (
            <View style={styles.slotsContainer}>
              <AppText
                variant="caption"
                weight="600"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 6 }}
              >
                WEEKLY PICKUP SCHEDULE ({item.monthKey})
              </AppText>
              {item.slots.map((slot) => {
                const formattedDate = new Date(
                  `${slot.date}T12:00:00`
                ).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <View key={slot.date} style={styles.slotRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <View style={styles.weekMiniTag}>
                          <AppText
                            variant="caption"
                            weight="600"
                            color={theme.colors.primary}
                          >
                            Week {slot.weekNumber}
                          </AppText>
                        </View>
                        <AppText
                          variant="bodySmall"
                          weight="600"
                          style={{ marginLeft: 8 }}
                        >
                          {formattedDate}
                        </AppText>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 2,
                        }}
                      >
                        <Clock color={theme.colors.textSecondary} size={12} />
                        <AppText
                          variant="caption"
                          color={theme.colors.textSecondary}
                          style={{ marginLeft: 4 }}
                        >
                          {slot.timeSlot || "08:00 AM"}
                        </AppText>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.bookingBadge,
                        (slot.pickupsCount || 0) > 0 && {
                          backgroundColor: theme.colors.primary + "15",
                        },
                      ]}
                    >
                      <Users
                        color={
                          (slot.pickupsCount || 0) > 0
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                        size={12}
                      />
                      <AppText
                        variant="caption"
                        weight="600"
                        color={
                          (slot.pickupsCount || 0) > 0
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                        style={{ marginLeft: 4 }}
                      >
                        {slot.pickupsCount || 0} Pickup
                        {(slot.pickupsCount || 0) === 1 ? "" : "s"}
                      </AppText>
                    </View>
                  </View>
                );
              })}

              {item.notes ? (
                <AppText
                  variant="caption"
                  color={theme.colors.textSecondary}
                  style={{ marginTop: 6, fontStyle: "italic" }}
                >
                  Note: "{item.notes}"
                </AppText>
              ) : null}

              {item.approvalStatus === "rejected" && (
                <View style={styles.rejectionCard}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <XCircle color={theme.colors.error} size={14} />
                    <AppText
                      variant="caption"
                      weight="600"
                      color={theme.colors.error}
                      style={{ marginLeft: 4 }}
                    >
                      Rejected by Admin
                    </AppText>
                  </View>
                  <AppText
                    variant="caption"
                    color={theme.colors.text}
                    style={{ marginTop: 2 }}
                  >
                    "{item.rejectionReason || "No reason specified"}"
                  </AppText>
                </View>
              )}

              {item.approvalStatus === "pending" && item.availabilityId ? (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title="Approve"
                      size="small"
                      loading={approvingId === item.availabilityId}
                      disabled={approvingId !== null || rejecting}
                      onPress={() => confirmApprove(item)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title="Reject"
                      size="small"
                      variant="outline"
                      disabled={approvingId !== null || rejecting}
                      onPress={() => {
                        setRejectModalItem(item);
                        setRejectReason("");
                      }}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.emptyScheduleBox}>
              <AlertTriangle color={theme.colors.warning} size={16} />
              <AppText
                variant="caption"
                color={theme.colors.textSecondary}
                style={{ marginLeft: 6, flex: 1 }}
              >
                Collector has not selected their 1-day-per-week availability for{" "}
                {item.monthKey} yet.
              </AppText>
            </View>
          )}
        </AppCard>
      </Animatable.View>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <ArrowLeft color={theme.colors.text} size={22} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="h2">Collector Availability</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Review and approve drivers' monthly pickup schedules.
          </AppText>
        </View>
      </View>

      {/* Month Switcher */}
      <View style={styles.monthTabs}>
        {monthOptions.map((opt) => {
          const active = opt.key === selectedMonthKey;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.monthTab, active && styles.monthTabActive]}
              onPress={() => setSelectedMonthKey(opt.key)}
            >
              <AppText
                variant="caption"
                weight="600"
                color={active ? theme.colors.surface : theme.colors.text}
              >
                {opt.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* KPI Summary Row */}
      {data?.summary && (
        <View style={styles.summaryRow}>
          <AppCard style={styles.summaryBox}>
            <AppText variant="h3" color={theme.colors.primary}>
              {data.summary.driversWithAvailability}/{data.summary.totalDrivers}
            </AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              Submitted
            </AppText>
          </AppCard>
          <AppCard style={styles.summaryBox}>
            <AppText variant="h3" color={theme.colors.warning}>
              {data.summary.awaitingApproval}
            </AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              Awaiting
            </AppText>
          </AppCard>
          <AppCard style={styles.summaryBox}>
            <AppText variant="h3" color={theme.colors.success}>
              {data.summary.approvedCount}
            </AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              Approved
            </AppText>
          </AppCard>
          <AppCard style={styles.summaryBox}>
            <AppText variant="h3" color={theme.colors.error}>
              {data.summary.rejectedCount || 0}
            </AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              Rejected
            </AppText>
          </AppCard>
        </View>
      )}

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {(["all", "awaiting", "approved", "rejected", "pending"] as const).map((mode) => {
          const active = filterMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilterMode(mode)}
            >
              <AppText
                variant="caption"
                weight="600"
                color={active ? theme.colors.primary : theme.colors.textSecondary}
              >
                {mode === "all"
                  ? "All"
                  : mode === "awaiting"
                    ? "Awaiting"
                    : mode === "approved"
                      ? "Approved"
                      : mode === "rejected"
                        ? "Rejected"
                        : "Not Set"}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !data ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredDrivers}
          keyExtractor={(item) => item.driver.id}
          renderItem={renderDriverCard}
          contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={{ padding: 24, alignItems: "center" }}>
              <AppText variant="body" color={theme.colors.textSecondary}>
                No collectors match this filter.
              </AppText>
            </View>
          }
        />
      )}

      {/* Rejection Modal */}
      <Modal
        visible={!!rejectModalItem}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!rejecting) setRejectModalItem(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText variant="h3">Reject Availability</AppText>
            <AppText
              variant="bodySmall"
              color={theme.colors.textSecondary}
              style={{ marginTop: 4 }}
            >
              State the reason for rejecting {rejectModalItem?.driver.name}'s schedule. They will be notified to update and resubmit.
            </AppText>

            <TextInput
              style={styles.reasonInput}
              multiline
              numberOfLines={3}
              editable={!rejecting}
              placeholder="e.g. Please select another day due to truck route conflict."
              placeholderTextColor={theme.colors.textSecondary}
              value={rejectReason}
              onChangeText={setRejectReason}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  title="Cancel"
                  variant="outline"
                  disabled={rejecting}
                  onPress={() => setRejectModalItem(null)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  title={rejecting ? "Rejecting..." : "Confirm Rejection"}
                  loading={rejecting}
                  disabled={rejecting || !rejectReason.trim()}
                  onPress={handleConfirmReject}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  monthTabs: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  monthTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: theme.borderRadius.sm,
  },
  monthTabActive: {
    backgroundColor: theme.colors.primary,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  summaryBox: {
    flex: 1,
    padding: theme.spacing.xs + 2,
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: theme.spacing.md,
    flexWrap: "wrap",
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "15",
  },
  driverCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  areaSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 8,
  },
  slotsContainer: {
    marginTop: 4,
  },
  slotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    marginBottom: 6,
  },
  weekMiniTag: {
    backgroundColor: theme.colors.primary + "15",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bookingBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.border,
  },
  emptyScheduleBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.warning + "10",
  },
  rejectionCard: {
    marginTop: 8,
    padding: 10,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.error + "10",
    borderWidth: 1,
    borderColor: theme.colors.error + "30",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: 12,
    marginTop: 12,
    color: theme.colors.text,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
});
