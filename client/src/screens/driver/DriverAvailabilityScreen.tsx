import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  ArrowLeft,
  Info,
  Lock,
  XCircle,
} from "lucide-react-native";
import * as Animatable from "react-native-animatable";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { theme } from "../../theme";
import {
  availabilityService,
  DriverMyAvailabilityResponse,
  MonthWeek,
} from "../../services/availabilityService";
import { parseApiError } from "../../services/api";

const TIME_SLOTS = [
  "08:00 AM",
  "10:00 AM",
  "12:00 PM",
  "02:00 PM",
  "04:00 PM",
];

const pad2 = (n: number) => String(n).padStart(2, "0");

const getMonthOptions = () => {
  const now = new Date();
  const y1 = now.getFullYear();
  const m1 = now.getMonth() + 1;
  const key1 = `${y1}-${pad2(m1)}`;
  const label1 = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const next = new Date(y1, m1, 1);
  const y2 = next.getFullYear();
  const m2 = next.getMonth() + 1;
  const key2 = `${y2}-${pad2(m2)}`;
  const label2 = next.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return [
    { key: key1, label: `${label1} (This Month)` },
    { key: key2, label: `${label2} (Next Month)` },
  ];
};

export const DriverAvailabilityScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(
    monthOptions[0].key
  );

  const [data, setData] = useState<DriverMyAvailabilityResponse | null>(null);
  const [selectedByWeek, setSelectedByWeek] = useState<Record<number, string>>(
    {}
  );
  const [timeSlot, setTimeSlot] = useState("08:00 AM");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAvailability = async (monthKey = selectedMonthKey) => {
    try {
      const res = await availabilityService.getMyAvailability(monthKey);
      setData(res);

      const weekMap: Record<number, string> = {};
      if (res.availability?.slots) {
        for (const slot of res.availability.slots) {
          weekMap[slot.weekNumber] = slot.date;
        }
        if (res.availability.slots[0]?.timeSlot) {
          setTimeSlot(res.availability.slots[0].timeSlot);
        }
      }
      setSelectedByWeek(weekMap);
      setNotes(res.availability?.notes || "");
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadAvailability(selectedMonthKey);
  }, [selectedMonthKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAvailability(selectedMonthKey);
    setRefreshing(false);
  };

  const isLocked = !!data?.isLocked;

  const handleSelectDay = (weekNumber: number, dateStr: string) => {
    if (isLocked) return;
    setSelectedByWeek((prev) => {
      const next = { ...prev };
      if (next[weekNumber] === dateStr) {
        delete next[weekNumber];
      } else {
        next[weekNumber] = dateStr;
      }
      return next;
    });
  };

  const selectedDatesList = useMemo(() => {
    return Object.values(selectedByWeek).sort();
  }, [selectedByWeek]);

  const handleSave = async () => {
    if (isLocked) return;
    if (selectedDatesList.length === 0) {
      Alert.alert(
        "Selection Required",
        "Please select one day per week for the remaining weeks of the month."
      );
      return;
    }

    setSaving(true);
    try {
      await availabilityService.saveMyAvailability({
        monthKey: selectedMonthKey,
        dates: selectedDatesList,
        timeSlot,
        notes: notes.trim(),
      });
      await loadAvailability(selectedMonthKey);
      Alert.alert(
        "Submitted for Approval",
        `Your monthly pickup schedule (${selectedDatesList.length} day${
          selectedDatesList.length === 1 ? "" : "s"
        }) has been submitted. Residents in your assigned polling units will see these dates once the admin approves them. After approval you won't be able to change them.`
      );
    } catch (e) {
      Alert.alert("Save Failed", parseApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const getWeekBadgeLabel = (week: MonthWeek, allWeeks: MonthWeek[]) => {
    if (week.isCurrentWeek) return "THIS WEEK";
    const currentIdx = allWeeks.findIndex((w) => w.isCurrentWeek);
    if (currentIdx !== -1 && week.weekNumber === allWeeks[currentIdx].weekNumber + 1) {
      return "NEXT WEEK";
    }
    if (week.isPastWeek) return "PAST WEEK";
    return `WEEK ${week.weekNumber}`;
  };

  const formatShortRange = (start: string, end: string) => {
    const d1 = new Date(`${start}T12:00:00`);
    const d2 = new Date(`${end}T12:00:00`);
    return `${d1.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${d2.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  };

  if (loading && !data) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const weeks = data?.weeks || [];
  const coverage = data?.coverage;

  return (
    <ScreenContainer
      scrollable
      scrollViewProps={{
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ),
      }}
    >
      <View style={styles.topBar}>
        {navigation.canGoBack() && (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <ArrowLeft color={theme.colors.text} size={22} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="h2">Pickup Availability</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Select 1 day per week so residents in your area can book pickups on
            that day.
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

      {/* Approval Status Banner */}
      {isLocked ? (
        <AppCard style={styles.lockedBanner}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Lock color={theme.colors.success} size={18} />
            <AppText
              variant="bodySmall"
              weight="600"
              color={theme.colors.success}
              style={{ marginLeft: 6 }}
            >
              Approved & Locked
            </AppText>
          </View>
          <AppText
            variant="caption"
            color={theme.colors.textSecondary}
            style={{ marginTop: 4 }}
          >
            Admin has approved this schedule. Residents can now book these
            days and you can no longer change them.
          </AppText>
        </AppCard>
      ) : data?.availability?.status === "rejected" ? (
        <AppCard style={styles.rejectedBanner}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <XCircle color={theme.colors.error} size={18} />
            <AppText
              variant="bodySmall"
              weight="600"
              color={theme.colors.error}
              style={{ marginLeft: 6 }}
            >
              Availability Rejected
            </AppText>
          </View>
          <AppText
            variant="bodySmall"
            weight="600"
            color={theme.colors.text}
            style={{ marginTop: 6 }}
          >
            Reason: "{data.availability.rejectionReason || "No reason specified"}"
          </AppText>
          <AppText
            variant="caption"
            color={theme.colors.textSecondary}
            style={{ marginTop: 4 }}
          >
            Please adjust your weekly pickup days or note below, then tap
            "Update & Resubmit for Approval".
          </AppText>
        </AppCard>
      ) : data?.availability?.status === "pending" &&
        (data?.availability?.slots?.length || 0) > 0 ? (
        <AppCard style={styles.pendingBanner}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Clock color={theme.colors.warning} size={18} />
            <AppText
              variant="bodySmall"
              weight="600"
              color={theme.colors.warning}
              style={{ marginLeft: 6 }}
            >
              Pending Admin Approval
            </AppText>
          </View>
          <AppText
            variant="caption"
            color={theme.colors.textSecondary}
            style={{ marginTop: 4 }}
          >
            Residents can't see these days until admin approves. You can still
            edit until then.
          </AppText>
        </AppCard>
      ) : null}

      {/* Assigned Area Info Card */}
      <AppCard style={styles.coverageCard}>
        <View style={styles.coverageHeader}>
          <MapPin color={theme.colors.primary} size={18} />
          <AppText
            variant="bodySmall"
            weight="600"
            color={theme.colors.primary}
            style={{ marginLeft: 6 }}
          >
            Your Assigned Area (LGA & Polling Units)
          </AppText>
        </View>
        {coverage && coverage.pollingUnits.length > 0 ? (
          <View style={{ marginTop: 6 }}>
            <AppText variant="bodySmall" weight="600">
              {coverage.localGovts.join(", ") || "Akure"} •{" "}
              {coverage.wards.join(", ")}
            </AppText>
            <AppText
              variant="caption"
              color={theme.colors.textSecondary}
              style={{ marginTop: 4 }}
            >
              Polling Units ({coverage.pollingUnits.length}):{" "}
              {coverage.pollingUnits.slice(0, 4).join(", ")}
              {coverage.pollingUnits.length > 4
                ? ` +${coverage.pollingUnits.length - 4} more`
                : ""}
            </AppText>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <Info color={theme.colors.warning} size={16} />
            <AppText
              variant="caption"
              color={theme.colors.textSecondary}
              style={{ marginLeft: 6, flex: 1 }}
            >
              You can set your availability now. Once Admin assigns you a task
              in a Polling Unit & LGA, residents there will see these dates.
            </AppText>
          </View>
        )}
      </AppCard>

      {/* Weekly 1-Day-Per-Week Picker */}
      <AppText variant="h3" style={styles.sectionTitle}>
        Select 1 Day Per Week
      </AppText>

      {weeks.map((week, idx) => {
        const pickedDate = selectedByWeek[week.weekNumber];
        const pickedDayObj = week.days.find((d) => d.date === pickedDate);
        const badgeLabel = getWeekBadgeLabel(week, weeks);
        const bookedCount =
          pickedDate && data?.pickupCountsByDate?.[pickedDate]
            ? data.pickupCountsByDate[pickedDate]
            : 0;

        return (
          <Animatable.View
            key={week.weekNumber}
            animation="fadeInUp"
            delay={Math.min(idx * 80, 400)}
          >
            <AppCard
              style={[
                styles.weekCard,
                week.isPastWeek && !pickedDate && { opacity: 0.55 },
                pickedDate && styles.weekCardSelected,
              ]}
            >
              <View style={styles.weekHeader}>
                <View>
                  <View style={styles.weekTitleRow}>
                    <View
                      style={[
                        styles.weekBadge,
                        week.isCurrentWeek && styles.weekBadgeCurrent,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight="600"
                        color={
                          week.isCurrentWeek
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                      >
                        {badgeLabel}
                      </AppText>
                    </View>
                    <AppText
                      variant="caption"
                      color={theme.colors.textSecondary}
                      style={{ marginLeft: 8 }}
                    >
                      {formatShortRange(week.weekStart, week.weekEnd)}
                    </AppText>
                  </View>
                  {pickedDayObj ? (
                    <AppText
                      variant="bodySmall"
                      weight="600"
                      color={theme.colors.success}
                      style={{ marginTop: 4 }}
                    >
                      Selected: {pickedDayObj.dayOfWeek} ({pickedDayObj.date})
                      {bookedCount > 0
                        ? ` • ${bookedCount} pickup${bookedCount > 1 ? "s" : ""} booked`
                        : ""}
                    </AppText>
                  ) : (
                    <AppText
                      variant="caption"
                      color={theme.colors.textSecondary}
                      style={{ marginTop: 4 }}
                    >
                      {week.isPastWeek
                        ? "This week has elapsed"
                        : "Tap one day below for this week"}
                    </AppText>
                  )}
                </View>
                {pickedDayObj && (
                  <CheckCircle color={theme.colors.success} size={20} />
                )}
              </View>

              <View style={styles.daysGrid}>
                {week.days.map((day) => {
                  const isSelected = pickedDate === day.date;
                  const disabled = isLocked || (day.isPast && !isSelected);

                  return (
                    <TouchableOpacity
                      key={day.date}
                      disabled={disabled}
                      onPress={() => handleSelectDay(week.weekNumber, day.date)}
                      style={[
                        styles.dayChip,
                        isSelected && styles.dayChipSelected,
                        disabled && !isSelected && styles.dayChipDisabled,
                        day.isToday && !isSelected && styles.dayChipToday,
                      ]}
                    >
                      <AppText
                        variant="caption"
                        weight="600"
                        color={
                          isSelected
                            ? theme.colors.surface
                            : disabled
                              ? theme.colors.textSecondary
                              : theme.colors.text
                        }
                      >
                        {day.shortDay}
                      </AppText>
                      <AppText
                        variant="bodySmall"
                        weight="700"
                        color={
                          isSelected
                            ? theme.colors.surface
                            : disabled
                              ? theme.colors.textSecondary
                              : theme.colors.primary
                        }
                      >
                        {day.dayOfMonth}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </AppCard>
          </Animatable.View>
        );
      })}

      {/* Preferred Time Slot */}
      <AppCard style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Clock color={theme.colors.primary} size={18} />
          <AppText
            variant="bodySmall"
            weight="600"
            style={{ marginLeft: 6 }}
          >
            Default Pickup Time Window
          </AppText>
        </View>
        <View style={styles.timeChipsRow}>
          {TIME_SLOTS.map((slot) => {
            const active = timeSlot === slot;
            return (
              <TouchableOpacity
                key={slot}
                disabled={isLocked}
                style={[styles.timeChip, active && styles.timeChipActive]}
                onPress={() => setTimeSlot(slot)}
              >
                <AppText
                  variant="caption"
                  weight={active ? "600" : "400"}
                  color={active ? theme.colors.primary : theme.colors.text}
                >
                  {slot}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ marginTop: 12 }}>
          <AppInput
            label="Schedule Note (Optional)"
            placeholder="e.g. Bins must be placed outside before 8:00 AM"
            value={notes}
            onChangeText={setNotes}
            editable={!isLocked}
          />
        </View>
      </AppCard>

      {/* Summary & Save */}
      <AppCard style={styles.summaryCard}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
          <Calendar color={theme.colors.primary} size={18} />
          <AppText
            variant="bodySmall"
            weight="600"
            style={{ marginLeft: 6 }}
          >
            Selected Pickup Days ({selectedDatesList.length})
          </AppText>
        </View>
        {selectedDatesList.length > 0 ? (
          <AppText variant="caption" color={theme.colors.textSecondary}>
            {selectedDatesList
              .map((d) =>
                new Date(`${d}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              )
              .join("  •  ")}
          </AppText>
        ) : (
          <AppText variant="caption" color={theme.colors.textSecondary}>
            No dates selected yet. Pick 1 day per week above.
          </AppText>
        )}
      </AppCard>

      {isLocked ? (
        <View style={{ marginBottom: theme.spacing.xxl }} />
      ) : (
        <AppButton
          title={
            (data?.availability?.status === "pending" ||
              data?.availability?.status === "rejected") &&
            selectedDatesList.length > 0
              ? "Update & Resubmit for Approval"
              : "Submit for Approval"
          }
          onPress={handleSave}
          loading={saving}
          style={{ marginBottom: theme.spacing.xxl }}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  lockedBanner: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.success + "10",
    borderColor: theme.colors.success + "40",
    borderWidth: 1,
  },
  rejectedBanner: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.error + "10",
    borderColor: theme.colors.error + "40",
    borderWidth: 1,
  },
  pendingBanner: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.warning + "10",
    borderColor: theme.colors.warning + "40",
    borderWidth: 1,
  },
  topBar: {
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
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.sm,
  },
  monthTabActive: {
    backgroundColor: theme.colors.primary,
  },
  coverageCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary + "08",
    borderColor: theme.colors.primary + "30",
    borderWidth: 1,
  },
  coverageHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  weekCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  weekCardSelected: {
    borderColor: theme.colors.success + "60",
    borderWidth: 1,
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  weekTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  weekBadge: {
    backgroundColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weekBadgeCurrent: {
    backgroundColor: theme.colors.primary + "20",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  dayChip: {
    width: 44,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  dayChipDisabled: {
    opacity: 0.35,
    backgroundColor: theme.colors.background,
  },
  dayChipToday: {
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  timeChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  timeChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "15",
  },
  summaryCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
});
