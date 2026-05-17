import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  MapPin,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Trash2,
} from "lucide-react-native";
import * as Animatable from "react-native-animatable";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { StatusBadge } from "../../components/StatusBadge";
import { theme } from "../../theme";
import { pickupService } from "../../services/pickupService";
import { parseApiError } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

type NavigationProp = NativeStackNavigationProp<any>;

export const DriverRequestDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { requestId } = route.params;

  const [request, setRequest] = useState<any>(null);
  const [hasActive, setHasActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchData = async () => {
    try {
      const [pickupData, driverStatus] = await Promise.all([
        pickupService.getPickupById(requestId),
        pickupService.getDriverPickups(),
      ]);
      if (pickupData) setRequest(pickupData);
      setHasActive(driverStatus.hasActive);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [requestId]);

  const handleAction = async (action: "accept" | "complete") => {
    setProcessing(true);
    try {
      await pickupService.respondToPickup(requestId, action);
      Alert.alert("Success", `Pickup request ${action}ed!`);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!request) {
    return (
      <ScreenContainer style={styles.centered}>
        <AppText>Request not found or already taken.</AppText>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <AppButton
          title="Back"
          variant="ghost"
          size="small"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        />
        <StatusBadge status={request.status} />
      </View>

      <Animatable.View animation="fadeInDown" delay={100}>
        <AppText variant="h1" style={styles.title}>
          {request.type} Pickup Request
        </AppText>
        <View style={styles.metaRow}>
          <MapPin color={theme.colors.textSecondary} size={16} />
          <AppText
            variant="bodySmall"
            color={theme.colors.textSecondary}
            style={{ marginLeft: 6 }}
          >
            {request.address || "No address provided"}
          </AppText>
        </View>
      </Animatable.View>

      <AppCard style={styles.card} animation="fadeInUp" delay={200}>
        <AppText variant="h3" style={styles.sectionTitle}>
          Pickup Request Details
        </AppText>

        <View style={styles.detailRow}>
          <Calendar color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Preferred Date
            </AppText>
            <AppText variant="body" weight="600">
              {request.scheduledDate || "Not specified"}
            </AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Clock color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Preferred Time
            </AppText>
            <AppText variant="body" weight="600">
              {request.scheduledTime || "Not specified"}
            </AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <FileText color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Resident Note
            </AppText>
            <AppText variant="body" style={{ fontStyle: "italic" }}>
              {request.notes || "No additional notes provided."}
            </AppText>
          </View>
        </View>
      </AppCard>

      <AppCard style={styles.card} animation="fadeInUp" delay={250}>
        <AppText variant="h3" style={styles.sectionTitle}>
          House Details
        </AppText>

        {request.userId?.houseDescription && (
          <View style={styles.detailRow}>
            <FileText color={theme.colors.textSecondary} size={20} />
            <View style={styles.detailTextContainer}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                House Description
              </AppText>
              <AppText variant="body" weight="600">
                {request.userId.houseDescription}
              </AppText>
            </View>
          </View>
        )}

        <View style={styles.detailRow}>
          <MapPin color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              LGA / Ward
            </AppText>
            <AppText variant="body" weight="600">
              {request.userId?.localGovt || request.localGovt || "N/A"} •{" "}
              {request.userId?.ward || request.ward || "N/A"}
            </AppText>
          </View>
        </View>

        {request.userId?.pollingUnit && (
          <View style={styles.detailRow}>
            <CheckCircle color={theme.colors.textSecondary} size={20} />
            <View style={styles.detailTextContainer}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                Polling Unit
              </AppText>
              <AppText variant="body" weight="600">
                {request.userId.pollingUnit}
              </AppText>
            </View>
          </View>
        )}

        {request.userId?.location?.coordinates && (
          <View style={styles.detailRow}>
            <MapPin color={theme.colors.primary} size={20} />
            <View style={styles.detailTextContainer}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                Coordinates (Lon, Lat)
              </AppText>
              <AppText variant="body" weight="600">
                {request.userId.location.coordinates[0]},{" "}
                {request.userId.location.coordinates[1]}
              </AppText>
            </View>
          </View>
        )}
      </AppCard>

      <AppCard style={styles.paymentCard} animation="fadeInUp" delay={300}>
        <AppText
          variant="bodySmall"
          color={theme.colors.primary}
          weight="600"
          style={{ marginBottom: 8 }}
        >
          RESIDENT PROPOSAL
        </AppText>
        <AppText variant="h1" color={theme.colors.primary}>
          ₦{request.extraFee?.toLocaleString() || "0"}
        </AppText>
      </AppCard>

      <View style={styles.actionsContainer}>
        {request.status === "pending" && (
          <Animatable.View animation="fadeInUp" delay={400} style={{ flex: 1 }}>
            {!hasActive ? (
              <AppButton
                title="Accept Pickup"
                style={{ backgroundColor: theme.colors.success }}
                icon={<CheckCircle color={theme.colors.surface} size={20} />}
                onPress={() => handleAction("accept")}
                loading={processing}
                disabled={processing}
              />
            ) : (
              <View style={styles.warningBox}>
                <Clock color={theme.colors.status.cancelled} size={24} />
                <AppText
                  variant="bodySmall"
                  color={theme.colors.status.cancelled}
                  style={styles.warningText}
                >
                  You have to complete your active pickup before you can accept
                  new pickup.
                </AppText>
              </View>
            )}
          </Animatable.View>
        )}

        {request.status === "accepted" &&
          request.driverId?._id === user?.id && (
            <Animatable.View animation="fadeIn" style={styles.activeLabel}>
              <CheckCircle color={theme.colors.success} size={24} />
              <AppText
                variant="body"
                weight="600"
                color={theme.colors.success}
                style={{ marginLeft: 8 }}
              >
                You are currently on this pickup.
              </AppText>
            </Animatable.View>
          )}
      </View>
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
    marginBottom: theme.spacing.md,
  },
  backBtn: {
    marginLeft: -theme.spacing.sm,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xl,
  },
  card: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
  },
  detailTextContainer: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  paymentCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary + "10",
    borderColor: theme.colors.primary + "30",
    borderWidth: 1,
    marginBottom: theme.spacing.xl,
    alignItems: "center",
  },
  actionsContainer: {
    marginBottom: theme.spacing.xxl,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.status.cancelled + "10",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.status.cancelled + "30",
  },
  warningText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  activeLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.success + "10",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
});
