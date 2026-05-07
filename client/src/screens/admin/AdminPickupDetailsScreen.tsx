import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { StatusBadge } from "../../components/StatusBadge";
import { theme } from "../../theme";
import { pickupService } from "../../services/pickupService";
import {
  User as UserIcon,
  Clock,
  MapPin,
  Info,
  Phone,
  Calendar,
} from "lucide-react-native";

export const AdminPickupDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const { pickupId } = route.params;
  const navigation = useNavigation();
  const [pickup, setPickup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPickup = async () => {
      try {
        const data = await pickupService.getPickupById(pickupId);
        setPickup(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadPickup();
  }, [pickupId]);

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary}
          style={{ marginTop: 50 }}
        />
      </ScreenContainer>
    );
  }

  if (!pickup) {
    return (
      <ScreenContainer>
        <AppText>Pickup not found.</AppText>
      </ScreenContainer>
    );
  }

  const resident = pickup.userId;

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <AppText variant="h2">Pickup Details</AppText>
        <StatusBadge status={pickup.status} />
      </View>

      <AppCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <UserIcon size={20} color={theme.colors.primary} />
          <AppText variant="h3" style={styles.sectionTitle}>
            Resident Information
          </AppText>
        </View>
        <View style={styles.infoRow}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Name
          </AppText>
          <AppText variant="body" weight="600">
            {resident?.name || "N/A"}
          </AppText>
        </View>
        <View style={styles.infoRow}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Phone
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Phone
              size={14}
              color={theme.colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <AppText variant="body" weight="600">
              {resident?.phone || "N/A"}
            </AppText>
          </View>
        </View>
        <View style={styles.infoRow}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Address
          </AppText>
          <AppText variant="body" weight="600">
            {resident?.address || "N/A"}
          </AppText>
        </View>
        <View style={styles.infoRow}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Ward / LGA
          </AppText>
          <AppText variant="body" weight="600">
            {resident?.ward} / {resident?.localGovt}
          </AppText>
        </View>
      </AppCard>

      <AppCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Info size={20} color={theme.colors.primary} />
          <AppText variant="h3" style={styles.sectionTitle}>
            Pickup Information
          </AppText>
        </View>
        <View style={styles.infoRow}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Type
          </AppText>
          <AppText variant="body" weight="600">
            {pickup.type}
          </AppText>
        </View>
        <View style={styles.infoRow}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Requested On
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Calendar
              size={14}
              color={theme.colors.textSecondary}
              style={{ marginRight: 4 }}
            />
            <AppText variant="body" weight="600">
              {new Date(pickup.createdAt).toLocaleString()}
            </AppText>
          </View>
        </View>
        {pickup.scheduledDate && (
          <View style={styles.infoRow}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Scheduled For
            </AppText>
            <AppText variant="body" weight="600">
              {pickup.scheduledDate} {pickup.scheduledTime}
            </AppText>
          </View>
        )}
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Notes
          </AppText>
          <AppText variant="body">
            {pickup.notes || "No notes provided"}
          </AppText>
        </View>
      </AppCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    marginLeft: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
});
