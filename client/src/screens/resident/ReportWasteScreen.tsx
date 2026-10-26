import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  Truck,
  AlertCircle,
  ArrowLeft,
} from "lucide-react-native";
import * as Animatable from "react-native-animatable";
import DateTimePicker from "@react-native-community/datetimepicker";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppInput } from "../../components/AppInput";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { ImagePickerField } from "../../components/ImagePickerField";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { pickupService } from "../../services/pickupService";
import {
  availabilityService,
  ResidentAvailabilityResponse,
  ResidentAvailableSlot,
} from "../../services/availabilityService";
import { parseApiError } from "../../services/api";
import { WasteRequest } from "../../types";

const WASTE_TYPES: WasteRequest["type"][] = [
  "General",
  "Recyclables",
  "Hazardous",
  "Bulky",
];

export const RequestPickupScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [form, setForm] = useState({
    type: "General" as WasteRequest["type"],
    notes: "",
    scheduledDate: "",
    scheduledTime: "08:00 AM",
    amount: "",
  });

  const [availabilityData, setAvailabilityData] =
    useState<ResidentAvailabilityResponse | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTimeDate, setSelectedTimeDate] = useState(new Date());
  const [image, setImage] = useState<string | null>(null);

  const loadAvailableDates = async () => {
    setLoadingAvailability(true);
    try {
      const res = await availabilityService.getResidentAvailableDates();
      setAvailabilityData(res);
      if (res.availableSlots && res.availableSlots.length > 0) {
        const first = res.availableSlots[0];
        setForm((prev) => ({
          ...prev,
          scheduledDate: prev.scheduledDate || first.date,
          scheduledTime: prev.scheduledTime || first.timeSlot || "08:00 AM",
        }));
      }
    } catch (e) {
      console.error("Failed to load available pickup dates:", e);
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    loadAvailableDates();
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.notes.trim()) newErrors.notes = "Description is required";
    if (!form.scheduledDate.trim()) {
      newErrors.scheduledDate =
        "Please select one of your collector's available pickup days";
    }
    if (!form.scheduledTime.trim()) {
      newErrors.scheduledTime = "Time is required";
    }
    return newErrors;
  };

  const handleSelectSlot = (slot: ResidentAvailableSlot) => {
    setForm((prev) => ({
      ...prev,
      scheduledDate: slot.date,
      scheduledTime: slot.timeSlot || prev.scheduledTime || "08:00 AM",
    }));
    if (errors.scheduledDate) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.scheduledDate;
        return copy;
      });
    }
  };

  const handleSubmit = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      await pickupService.createPickupRequest(form.type, form.notes, {
        scheduledDate: form.scheduledDate,
        scheduledTime: form.scheduledTime,
        amount: form.amount ? parseFloat(form.amount) : 0,
        image,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.replace("ResidentTabs");
      }, 1500);
    } catch (e) {
      Alert.alert("Submission Failed", parseApiError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const Selector = ({ label, options, value, onChange }: any) => (
    <View style={styles.selectorContainer}>
      <AppText
        variant="bodySmall"
        weight="600"
        color={theme.colors.textSecondary}
        style={styles.label}
      >
        {label}
      </AppText>
      <View style={styles.chipsRow}>
        {options.map((opt: string) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onChange(opt)}
          >
            <AppText
              variant="caption"
              weight={value === opt ? "600" : "400"}
              color={value === opt ? theme.colors.primary : theme.colors.text}
            >
              {opt}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const availableSlots = availabilityData?.availableSlots || [];
  const assignedDrivers = availabilityData?.assignedDrivers || [];

  return (
    <ScreenContainer scrollable>
      {showSuccess && (
        <View style={StyleSheet.absoluteFill}>
          <Animatable.View
            animation="fadeIn"
            duration={300}
            style={styles.successOverlay}
          />
          <Animatable.View
            animation="zoomIn"
            duration={500}
            style={styles.successContent}
          >
            <CheckCircle color={theme.colors.surface} size={80} />
            <AppText
              variant="h2"
              color={theme.colors.surface}
              style={{ marginTop: 24, textAlign: "center" }}
            >
              Pickup Requested!
            </AppText>
            <AppText
              variant="body"
              color={theme.colors.surface}
              style={{ marginTop: 8, textAlign: "center", opacity: 0.9 }}
            >
              Scheduled for {form.scheduledDate}. Thank you for keeping our city
              clean.
            </AppText>
          </Animatable.View>
        </View>
      )}

      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {navigation.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ padding: 6, marginRight: 8, marginLeft: -6 }}
            >
              <ArrowLeft color={theme.colors.text} size={22} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <AppText variant="h2">Request Pickup</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Select one of your assigned collector's weekly pickup days.
            </AppText>
          </View>
        </View>
      </Animatable.View>

      {/* Resident Polling Unit & Assigned Driver Card */}
      <AppCard style={styles.areaCard}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MapPin color={theme.colors.primary} size={18} />
          <AppText
            variant="bodySmall"
            weight="600"
            color={theme.colors.primary}
            style={{ marginLeft: 6 }}
          >
            Your Polling Unit & Collector
          </AppText>
        </View>
        <AppText variant="bodySmall" weight="600" style={{ marginTop: 4 }}>
          {user?.localGovt || "LGA N/A"} • {user?.ward || "Ward N/A"}
        </AppText>
        <AppText variant="caption" color={theme.colors.textSecondary}>
          Polling Unit: {user?.pollingUnit || "Not set"}
        </AppText>
        {assignedDrivers.length > 0 && (
          <View style={styles.driverRow}>
            <Truck color={theme.colors.success} size={15} />
            <AppText
              variant="caption"
              weight="600"
              color={theme.colors.success}
              style={{ marginLeft: 6 }}
            >
              Assigned Collector:{" "}
              {assignedDrivers.map((d) => d.name).join(", ")}
            </AppText>
          </View>
        )}
      </AppCard>

      <Animatable.View animation="fadeInUp" delay={200}>
        <Selector
          label="Waste Type"
          options={WASTE_TYPES}
          value={form.type}
          onChange={(val: any) => setForm({ ...form, type: val })}
        />
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={300}>
        <AppInput
          label="Description"
          value={form.notes}
          onChangeText={(val) => setForm({ ...form, notes: val })}
          error={errors.notes}
          placeholder="Describe the waste needing collection..."
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: "top" }}
        />
      </Animatable.View>

      {/* Collector's Available Pickup Days (1 Day Per Week) */}
      <Animatable.View
        animation="fadeInUp"
        delay={400}
        style={{ marginBottom: 16 }}
      >
        <AppText
          variant="bodySmall"
          weight="600"
          color={theme.colors.textSecondary}
          style={{ marginBottom: 8 }}
        >
          Collector's Available Pickup Days (1 Day / Week)
        </AppText>

        {loadingAvailability ? (
          <AppCard style={{ alignItems: "center", padding: 20 }}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <AppText
              variant="caption"
              color={theme.colors.textSecondary}
              style={{ marginTop: 8 }}
            >
              Loading collector availability for your polling unit...
            </AppText>
          </AppCard>
        ) : availableSlots.length === 0 ? (
          <AppCard style={styles.unavailableCard}>
            <AlertCircle color={theme.colors.warning} size={22} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <AppText variant="bodySmall" weight="600">
                No Available Pickup Days Yet
              </AppText>
              <AppText
                variant="caption"
                color={theme.colors.textSecondary}
                style={{ marginTop: 2 }}
              >
                {availabilityData?.message ||
                  "Your assigned collector has not set their monthly pickup availability yet. Please check back soon."}
              </AppText>
            </View>
          </AppCard>
        ) : (
          <View>
            {availableSlots.map((slot) => {
              const isSelected = form.scheduledDate === slot.date;
              const readableDate = new Date(
                `${slot.date}T12:00:00`
              ).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <TouchableOpacity
                  key={`${slot.date}_${slot.driverId}`}
                  activeOpacity={0.8}
                  onPress={() => handleSelectSlot(slot)}
                >
                  <AppCard
                    style={[
                      styles.slotCard,
                      isSelected && styles.slotCardSelected,
                    ]}
                  >
                    <View style={styles.slotCardTop}>
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 4,
                          }}
                        >
                          <View
                            style={[
                              styles.weekTag,
                              isSelected && {
                                backgroundColor: theme.colors.primary,
                              },
                            ]}
                          >
                            <AppText
                              variant="caption"
                              weight="600"
                              color={
                                isSelected
                                  ? theme.colors.surface
                                  : theme.colors.primary
                              }
                            >
                              Week {slot.weekNumber}
                            </AppText>
                          </View>
                          {slot.bookedResidentsCount > 0 && (
                            <AppText
                              variant="caption"
                              color={theme.colors.textSecondary}
                              style={{ marginLeft: 8 }}
                            >
                              • {slot.bookedResidentsCount} neighbor
                              {slot.bookedResidentsCount === 1 ? "" : "s"}{" "}
                              scheduled
                            </AppText>
                          )}
                        </View>

                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Calendar
                            color={
                              isSelected
                                ? theme.colors.primary
                                : theme.colors.textSecondary
                            }
                            size={16}
                          />
                          <AppText
                            variant="body"
                            weight="600"
                            color={
                              isSelected
                                ? theme.colors.primary
                                : theme.colors.text
                            }
                            style={{ marginLeft: 6 }}
                          >
                            {readableDate}
                          </AppText>
                        </View>

                        <AppText
                          variant="caption"
                          color={theme.colors.textSecondary}
                          style={{ marginTop: 4 }}
                        >
                          Collector: {slot.driverName} • Time:{" "}
                          {slot.timeSlot || "08:00 AM"}
                        </AppText>
                      </View>

                      <View
                        style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterActive,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </View>
                  </AppCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {errors.scheduledDate && (
          <AppText
            variant="caption"
            color={theme.colors.error}
            style={{ marginTop: 4 }}
          >
            {errors.scheduledDate}
          </AppText>
        )}
      </Animatable.View>

      {/* Preferred Time Window */}
      <Animatable.View
        animation="fadeInUp"
        delay={450}
        style={{ marginBottom: 16 }}
      >
        <AppText
          variant="caption"
          weight="600"
          color={theme.colors.textSecondary}
          style={{ marginBottom: 6 }}
        >
          Preferred Time on Selected Day
        </AppText>
        <TouchableOpacity
          style={[
            styles.chip,
            {
              margin: 0,
              height: 48,
              flexDirection: "row",
              alignItems: "center",
            },
            errors.scheduledTime && { borderColor: theme.colors.error },
          ]}
          onPress={() => setShowTimePicker(true)}
        >
          <Clock color={theme.colors.textSecondary} size={18} />
          <AppText
            variant="body"
            color={
              form.scheduledTime
                ? theme.colors.text
                : theme.colors.textSecondary
            }
            style={{ marginLeft: 8 }}
          >
            {form.scheduledTime || "Select Time"}
          </AppText>
        </TouchableOpacity>
        {errors.scheduledTime && (
          <AppText
            variant="caption"
            color={theme.colors.error}
            style={{ marginTop: 4 }}
          >
            {errors.scheduledTime}
          </AppText>
        )}
        {showTimePicker && (
          <DateTimePicker
            value={selectedTimeDate}
            mode="time"
            display="default"
            onChange={(e, date) => {
              setShowTimePicker(false);
              if (date) {
                setSelectedTimeDate(date);
                setForm({
                  ...form,
                  scheduledTime: date.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                });
              }
            }}
          />
        )}
      </Animatable.View>

      {/* Fee field commented out per requirements
      <AppInput
        label="Penalty / Extra Fee You Want to Pay (₦)"
        value={form.amount}
        onChangeText={(val) => setForm({ ...form, amount: val })}
        error={errors.amount}
        placeholder="Enter Amount (₦), e.g. 1500"
        keyboardType="numeric"
      />
      */}

      <Animatable.View animation="zoomIn" delay={500}>
        <ImagePickerField value={image} onChange={setImage} />
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={600}>
        <AppButton
          title="Submit Request"
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={availableSlots.length === 0 || !form.scheduledDate}
          style={styles.submitBtn}
        />
      </Animatable.View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.md,
  },
  areaCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.primary + "08",
    borderColor: theme.colors.primary + "30",
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  driverRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  selectorContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    marginBottom: theme.spacing.xs,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    margin: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "10",
  },
  unavailableCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.warning + "12",
    borderColor: theme.colors.warning + "40",
    borderWidth: 1,
    padding: theme.spacing.md,
  },
  slotCard: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  slotCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "08",
    borderWidth: 1.5,
  },
  slotCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weekTag: {
    backgroundColor: theme.colors.primary + "15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  radioOuterActive: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  submitBtn: {
    marginBottom: theme.spacing.xl,
  },
  successOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.colors.primary,
    opacity: 0.95,
    zIndex: 10,
  },
  successContent: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 11,
    padding: 32,
  },
});
