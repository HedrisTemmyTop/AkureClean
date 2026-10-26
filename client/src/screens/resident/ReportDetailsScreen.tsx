import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  CheckCircle,
  Clock,
  Truck,
  ShieldCheck,
  XCircle,
  AlertCircle,
  User,
  Phone,
} from "lucide-react-native";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { ImagePickerField } from "../../components/ImagePickerField";
import { StatusBadge } from "../../components/StatusBadge";
import { theme } from "../../theme";
import { reportService } from "../../services/reportService";
import { pickupService } from "../../services/pickupService";
import { verificationService } from "../../services/verificationService";
import { parseApiError } from "../../services/api";
import { WasteRequest, RequestStatus } from "../../types";
import * as Animatable from "react-native-animatable";

export const PickupDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { reportId, isSpecialPickup } = route.params;

  const [report, setReport] = useState<WasteRequest | null>(null);
  const [pickupData, setPickupData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Resident Confirmation / Dispute States (Step 3)
  const [confirming, setConfirming] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeNote, setDisputeNote] = useState("");
  const [disputeImage, setDisputeImage] = useState<string | null>(null);
  const [disputing, setDisputing] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      let data: any;
      if (isSpecialPickup || !report) {
        // Always attempt pickup fetch first for special pickup requests
        try {
          const pickup = await pickupService.getPickupById(reportId);
          if (pickup) {
            setPickupData(pickup);
            data = {
              id: pickup.id || pickup._id,
              residentId: pickup.userId?._id || pickup.userId,
              driverId: pickup.driverId?._id || pickup.driverId,
              status: (pickup.status.charAt(0).toUpperCase() +
                pickup.status.slice(1)) as RequestStatus,
              type: pickup.type,
              street:
                pickup.address || pickup.userId?.address || "Special Pickup",
              requestedDate: pickup.createdAt,
              scheduledDate: pickup.scheduledDate,
              scheduledTime: pickup.scheduledTime,
              notes: pickup.notes,
              severity: "Medium",
              locationId: "",
              cost: pickup.extraFee,
            };
          }
        } catch (pickupErr) {
          // If not found in pickup, fallback to generic report
          data = await reportService.getReportById(reportId);
        }
      } else {
        data = await reportService.getReportById(reportId);
      }
      if (data) setReport(data);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [reportId, isSpecialPickup]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleConfirm = async () => {
    const pId = pickupData?._id || pickupData?.id || reportId;
    setConfirming(true);
    try {
      await verificationService.confirm({
        kind: "pickup",
        id: pId,
        assignmentId: null,
      } as any);
      Alert.alert(
        "Collection Confirmed",
        "Thank you! Your confirmation has been recorded. The admin will now give final approval.",
      );
      await fetchReport();
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setConfirming(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeNote.trim()) {
      Alert.alert("Reason required", "Please describe why the pickup was not done.");
      return;
    }
    const pId = pickupData?._id || pickupData?.id || reportId;
    setDisputing(true);
    try {
      await verificationService.dispute(
        {
          kind: "pickup",
          id: pId,
          assignmentId: null,
        } as any,
        disputeNote.trim(),
        disputeImage,
      );
      Alert.alert(
        "Dispute Submitted",
        "Your report has been received and escalated to the Admin for investigation.",
      );
      setShowDisputeForm(false);
      setDisputeNote("");
      setDisputeImage(null);
      await fetchReport();
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setDisputing(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!report) {
    return (
      <ScreenContainer style={styles.centered}>
        <AppText variant="bodyLarge">Pickup not found.</AppText>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16 }}
        />
      </ScreenContainer>
    );
  }

  const normStatus = (pickupData?.status || (report.status as string) || "").toLowerCase();
  const vStatus = (pickupData?.verificationStatus || "").toLowerCase();

  // Step 2: Driver Accepted
  const isDriverAccepted =
    normStatus === "accepted" ||
    normStatus === "collected" ||
    normStatus === "completed" ||
    !!pickupData?.driverId;
  const isDriverRejected =
    normStatus === "rejected" && !!pickupData?.driverRejectReason;

  // Step 3: Driver Picked Up / Resident Confirms or Rejects
  const isDriverCollected =
    normStatus === "collected" ||
    normStatus === "completed" ||
    !!pickupData?.collectedAt ||
    vStatus === "awaitingresident" ||
    vStatus === "residentconfirmed" ||
    vStatus === "disputed" ||
    vStatus === "approved";

  const isResidentConfirmed =
    vStatus === "residentconfirmed" ||
    (normStatus === "completed" && vStatus !== "disputed");

  const isResidentDisputed = vStatus === "disputed";

  // Step 4: Admin Approves
  const isAdminApproved = vStatus === "approved" || normStatus === "completed";
  const isAdminRejected =
    vStatus === "rejected" ||
    (normStatus === "rejected" && !pickupData?.driverRejectReason);

  const requestedDate = new Date(report.requestedDate).toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  const formattedScheduledDate = report.scheduledDate
    ? (() => {
        const parsed = new Date(`${report.scheduledDate}T00:00:00`);
        return isNaN(parsed.getTime())
          ? report.scheduledDate
          : parsed.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            });
      })()
    : "Not specified";

  const driverInfo =
    typeof pickupData?.driverId === "object" ? pickupData.driverId : null;

  return (
    <ScreenContainer scrollable>
      {/* Header */}
      <View style={styles.header}>
        <AppButton
          title="Back"
          variant="ghost"
          size="small"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        />
        <StatusBadge status={report.status} />
      </View>

      <AppText variant="h1" style={styles.title}>
        {report.type} Waste
      </AppText>

      {/* Details Card */}
      <AppCard elevation="sm" style={styles.detailCard}>
        <View style={styles.detailRow}>
          <MapPin color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Location
            </AppText>
            <AppText variant="body">
              {report.street} {report.landmark ? `(${report.landmark})` : ""}
            </AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Calendar color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Requested On
            </AppText>
            <AppText variant="body">{requestedDate}</AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Calendar color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Scheduled Pickup Day
            </AppText>
            <AppText variant="body">{formattedScheduledDate}</AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Clock color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Scheduled Time Slot
            </AppText>
            <AppText variant="body">
              {report.scheduledTime || "08:00 AM - 12:00 PM"}
            </AppText>
          </View>
        </View>

        {report.notes ? (
          <>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <FileText color={theme.colors.textSecondary} size={20} />
              <View style={styles.detailTextContainer}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  Additional Notes
                </AppText>
                <AppText variant="body">{report.notes}</AppText>
              </View>
            </View>
          </>
        ) : null}

        {pickupData?.image ? (
          <>
            <View style={styles.divider} />
            <View style={{ marginTop: theme.spacing.sm }}>
              <AppText
                variant="bodySmall"
                color={theme.colors.textSecondary}
                style={{ marginBottom: 6 }}
              >
                Attached Picture
              </AppText>
              <Image
                source={{ uri: pickupData.image }}
                style={{
                  width: "100%",
                  height: 180,
                  borderRadius: theme.borderRadius.md,
                }}
                resizeMode="cover"
              />
            </View>
          </>
        ) : null}
      </AppCard>

      {/* 4-Step Progress Section */}
      <AppText variant="h3" style={styles.timelineTitle}>
        Pickup Progress
      </AppText>

      <View style={styles.timeline}>
        {/* Step 1: Request Submitted */}
        <View style={styles.timelineStep}>
          <View style={styles.timelineIconWrapperActive}>
            <CheckCircle color={theme.colors.success} size={20} />
          </View>
          <View style={styles.timelineContent}>
            <AppText variant="body" weight="700" color={theme.colors.text}>
              1. Request Submitted
            </AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              We received your {report.type || "waste"} pickup request.
            </AppText>
            <AppText
              variant="caption"
              color={theme.colors.textSecondary}
              style={{ marginTop: 2 }}
            >
              Submitted on {requestedDate}
            </AppText>
          </View>
        </View>

        {/* Step 2: Driver Accepted */}
        <View style={styles.timelineStep}>
          <View
            style={
              isDriverAccepted
                ? styles.timelineIconWrapperActive
                : isDriverRejected
                ? styles.timelineIconWrapperDanger
                : styles.timelineIconWrapperInactive
            }
          >
            {isDriverAccepted ? (
              <CheckCircle color={theme.colors.success} size={20} />
            ) : isDriverRejected ? (
              <XCircle color={theme.colors.status.cancelled} size={20} />
            ) : (
              <Clock color={theme.colors.textSecondary} size={18} />
            )}
          </View>
          <View style={styles.timelineContent}>
            <AppText
              variant="body"
              weight="700"
              color={
                isDriverAccepted
                  ? theme.colors.text
                  : isDriverRejected
                  ? theme.colors.status.cancelled
                  : theme.colors.textSecondary
              }
            >
              2. Driver Accepted
            </AppText>

            {isDriverRejected ? (
              <AppText
                variant="bodySmall"
                color={theme.colors.status.cancelled}
              >
                Driver could not collect:{" "}
                {pickupData?.driverRejectReason || "Request declined"}
              </AppText>
            ) : isDriverAccepted ? (
              <View>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {driverInfo?.name
                    ? `Assigned Collector: ${driverInfo.name}`
                    : "A driver has accepted your pickup and is on their way."}
                </AppText>
                {driverInfo?.phone ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <Phone size={12} color={theme.colors.primary} />
                    <AppText
                      variant="caption"
                      color={theme.colors.primary}
                      weight="600"
                    >
                      {driverInfo.phone}
                    </AppText>
                  </View>
                ) : null}
              </View>
            ) : (
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                Waiting for the collector on your route to accept.
              </AppText>
            )}
          </View>
        </View>

        {/* Step 3: Driver Picked Up (Resident Confirms or Rejects) */}
        <View style={styles.timelineStep}>
          <View
            style={
              isResidentConfirmed
                ? styles.timelineIconWrapperActive
                : isResidentDisputed
                ? styles.timelineIconWrapperDanger
                : isDriverCollected
                ? styles.timelineIconWrapperWarning
                : styles.timelineIconWrapperInactive
            }
          >
            {isResidentConfirmed ? (
              <CheckCircle color={theme.colors.success} size={20} />
            ) : isResidentDisputed ? (
              <XCircle color={theme.colors.status.cancelled} size={20} />
            ) : isDriverCollected ? (
              <Clock color={theme.colors.status.pending} size={18} />
            ) : (
              <Clock color={theme.colors.textSecondary} size={18} />
            )}
          </View>
          <View style={styles.timelineContent}>
            <AppText
              variant="body"
              weight="700"
              color={
                isResidentConfirmed
                  ? theme.colors.text
                  : isResidentDisputed
                  ? theme.colors.status.cancelled
                  : isDriverCollected
                  ? theme.colors.status.pending
                  : theme.colors.textSecondary
              }
            >
              3. Driver Picked Up
            </AppText>

            {isResidentConfirmed ? (
              <View>
                <AppText
                  variant="bodySmall"
                  color={theme.colors.success}
                  weight="600"
                >
                  Confirmed by you
                </AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  You confirmed that your waste was collected.
                </AppText>
              </View>
            ) : isResidentDisputed ? (
              <View>
                <AppText
                  variant="bodySmall"
                  color={theme.colors.status.cancelled}
                  weight="600"
                >
                  Disputed by you
                </AppText>
                <AppText
                  variant="caption"
                  color={theme.colors.status.cancelled}
                >
                  "{pickupData?.residentNote || "Reported uncollected"}"
                </AppText>
                <AppText
                  variant="caption"
                  color={theme.colors.textSecondary}
                  style={{ marginTop: 2 }}
                >
                  Admin has been notified to investigate.
                </AppText>
              </View>
            ) : isDriverCollected ? (
              <View>
                <AppText
                  variant="bodySmall"
                  color={theme.colors.status.pending}
                  weight="600"
                >
                  Driver marked as collected
                </AppText>
                <AppText
                  variant="caption"
                  color={theme.colors.textSecondary}
                  style={{ marginBottom: 8 }}
                >
                  Please confirm whether the driver picked up your waste.
                </AppText>

                {/* Inline Confirmation / Rejection Action Box */}
                {!showDisputeForm ? (
                  <View style={styles.confirmPromptBox}>
                    <AppText
                      variant="bodySmall"
                      weight="700"
                      color={theme.colors.text}
                      style={{ marginBottom: 8 }}
                    >
                      Did the driver collect your waste?
                    </AppText>
                    <View style={styles.confirmButtonsRow}>
                      <AppButton
                        title="Yes, Confirm"
                        size="small"
                        loading={confirming}
                        disabled={confirming}
                        style={{
                          flex: 1,
                          backgroundColor: theme.colors.success,
                        }}
                        onPress={handleConfirm}
                      />
                      <AppButton
                        title="No, Reject"
                        size="small"
                        variant="outline"
                        disabled={confirming}
                        style={{
                          flex: 1,
                          borderColor: theme.colors.status.cancelled,
                        }}
                        textStyle={{ color: theme.colors.status.cancelled }}
                        onPress={() => setShowDisputeForm(true)}
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.disputeBox}>
                    <AppText
                      variant="bodySmall"
                      weight="700"
                      color={theme.colors.status.cancelled}
                    >
                      Report / Reject Collection
                    </AppText>
                    <AppText
                      variant="caption"
                      color={theme.colors.textSecondary}
                      style={{ marginBottom: 8 }}
                    >
                      Please describe what went wrong. The municipal admin will
                      review.
                    </AppText>

                    <AppInput
                      placeholder="e.g. Driver never arrived, waste left behind..."
                      value={disputeNote}
                      onChangeText={setDisputeNote}
                      multiline
                      numberOfLines={3}
                    />

                    <ImagePickerField
                      label="Attach Photo Proof (Optional)"
                      value={disputeImage}
                      onChange={setDisputeImage}
                    />

                    <View style={styles.disputeButtonsRow}>
                      <AppButton
                        title="Cancel"
                        size="small"
                        variant="ghost"
                        onPress={() => setShowDisputeForm(false)}
                      />
                      <AppButton
                        title="Submit Rejection"
                        size="small"
                        loading={disputing}
                        disabled={disputing || !disputeNote.trim()}
                        style={{
                          backgroundColor: theme.colors.status.cancelled,
                        }}
                        onPress={handleDispute}
                      />
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                Driver has not marked waste as collected yet.
              </AppText>
            )}
          </View>
        </View>

        {/* Step 4: Admin Approves */}
        <View style={[styles.timelineStep, { borderLeftWidth: 0 }]}>
          <View
            style={
              isAdminApproved
                ? styles.timelineIconWrapperActive
                : isAdminRejected
                ? styles.timelineIconWrapperDanger
                : styles.timelineIconWrapperInactive
            }
          >
            {isAdminApproved ? (
              <CheckCircle color={theme.colors.success} size={20} />
            ) : isAdminRejected ? (
              <XCircle color={theme.colors.status.cancelled} size={20} />
            ) : (
              <Clock color={theme.colors.textSecondary} size={18} />
            )}
          </View>
          <View style={styles.timelineContent}>
            <AppText
              variant="body"
              weight="700"
              color={
                isAdminApproved
                  ? theme.colors.text
                  : isAdminRejected
                  ? theme.colors.status.cancelled
                  : theme.colors.textSecondary
              }
            >
              4. Admin Approves
            </AppText>

            {isAdminApproved ? (
              <View>
                <AppText
                  variant="bodySmall"
                  color={theme.colors.success}
                  weight="600"
                >
                  Approved & Completed
                </AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  Verified and officially closed by the municipal authority.
                </AppText>
              </View>
            ) : isAdminRejected ? (
              <View>
                <AppText
                  variant="bodySmall"
                  color={theme.colors.status.cancelled}
                  weight="600"
                >
                  Rejected by Admin
                </AppText>
                {pickupData?.adminNote ? (
                  <AppText
                    variant="caption"
                    color={theme.colors.status.cancelled}
                  >
                    "{pickupData.adminNote}"
                  </AppText>
                ) : null}
              </View>
            ) : isResidentConfirmed || isDriverCollected ? (
              <AppText variant="bodySmall" color={theme.colors.status.pending}>
                Awaiting final review & sign-off by municipal admin.
              </AppText>
            ) : (
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                Final municipal approval will occur after pickup verification.
              </AppText>
            )}
          </View>
        </View>
      </View>

      {/* Cancel button if still pending */}
      {(normStatus === "pending" ||
        normStatus === "scheduled" ||
        report.status === "Pending") && (
        <Animatable.View
          animation="fadeInUp"
          delay={300}
          style={{ marginTop: 24, marginBottom: 40 }}
        >
          <AppButton
            title="Cancel Pickup Request"
            variant="outline"
            style={{ borderColor: theme.colors.status.cancelled }}
            onPress={async () => {
              try {
                await pickupService.cancelPickupByResident(report.id);
                Alert.alert(
                  "Pickup Cancelled",
                  "Your pickup request has been cancelled.",
                  [{ text: "OK", onPress: () => navigation.goBack() }],
                );
              } catch (e) {
                console.error(e);
                Alert.alert("Error", parseApiError(e));
              }
            }}
          />
        </Animatable.View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  backBtn: {
    marginLeft: -theme.spacing.sm,
  },
  title: {
    marginBottom: theme.spacing.md,
  },
  detailCard: {
    marginBottom: theme.spacing.xl,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: theme.spacing.sm,
  },
  detailTextContainer: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  timelineTitle: {
    marginBottom: theme.spacing.md,
  },
  timeline: {
    marginLeft: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  timelineStep: {
    flexDirection: "row",
    borderLeftWidth: 2,
    borderColor: theme.colors.border,
    paddingBottom: theme.spacing.xl,
  },
  timelineIconWrapperActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -13,
    marginTop: -2,
  },
  timelineIconWrapperWarning: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -13,
    marginTop: -2,
  },
  timelineIconWrapperDanger: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -13,
    marginTop: -2,
  },
  timelineIconWrapperInactive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -13,
    marginTop: -2,
  },
  timelineContent: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  confirmPromptBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  confirmButtonsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  disputeBox: {
    backgroundColor: theme.colors.status.cancelled + "08",
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.status.cancelled + "30",
    padding: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  disputeButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
});

export default PickupDetailsScreen;
