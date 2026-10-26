import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Image,
  Linking,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Phone } from "lucide-react-native";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { theme } from "../../theme";
import { parseApiError } from "../../services/api";
import {
  verificationService,
  VerificationItem,
} from "../../services/verificationService";

const statusLabel = (item: VerificationItem) => {
  if (item.verificationStatus === "Disputed") return "Disputed by resident";
  if (item.verificationStatus === "ResidentConfirmed") return "Resident confirmed";
  if (item.noResponse) return "No response (24h+ after collection date)";
  return "Waiting for resident";
};

const statusColor = (item: VerificationItem) => {
  if (item.verificationStatus === "Disputed") return theme.colors.status.cancelled;
  if (item.verificationStatus === "ResidentConfirmed") return theme.colors.success;
  if (item.noResponse) return theme.colors.status.pending;
  return theme.colors.textSecondary;
};

/**
 * Admin: approve or reject collections after the resident has responded
 * (or 24h after the collection date if they have not).
 */
export const AdminVerificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"review" | "waiting">("review");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    try {
      setItems(await verificationService.getAdminPending());
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, []),
  );

  const toReview = items.filter((i) => i.canReview);
  const waiting = items.filter((i) => !i.canReview);
  const data = tab === "review" ? toReview : waiting;

  const decide = async (
    item: VerificationItem,
    decision: "approve" | "reject",
  ) => {
    if (decision === "reject" && !note.trim()) {
      Alert.alert("Note required", "Please add a note when rejecting.");
      return;
    }
    setBusyId(item.id);
    try {
      await verificationService.review(item, decision, note.trim());
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setRejectingId(null);
      setNote("");
      Alert.alert(
        decision === "approve" ? "Approved" : "Rejected",
        decision === "approve"
          ? "Collection has been approved successfully."
          : "Collection has been rejected."
      );
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }: { item: VerificationItem }) => {
    const busy = busyId === item.id;
    const rejecting = rejectingId === item.id;

    return (
      <AppCard style={styles.card}>
        <View style={styles.titleRow}>
          <AppText variant="h3" style={{ flex: 1 }}>
            {item.kind === "pickup" ? "Requested pickup" : item.assignmentTitle}
          </AppText>
        </View>
        <AppText variant="caption" color={statusColor(item)} weight="700">
          {statusLabel(item).toUpperCase()}
        </AppText>

        <AppText variant="bodySmall" style={{ marginTop: theme.spacing.sm }}>
          {item.address}
        </AppText>
        <AppText variant="caption" color={theme.colors.textSecondary}>
          Driver: {item.driver?.name ?? "N/A"} • Collected{" "}
          {item.collectedAt ? new Date(item.collectedAt).toLocaleString() : "N/A"}
        </AppText>

        {item.resident && (
          <TouchableOpacity
            style={styles.callRow}
            disabled={!item.resident.phone}
            onPress={() => Linking.openURL(`tel:${item.resident!.phone}`)}
          >
            <Phone color={theme.colors.primary} size={16} />
            <AppText
              variant="bodySmall"
              color={theme.colors.primary}
              style={{ marginLeft: 6 }}
            >
              {item.resident.name}
              {item.resident.phone ? ` • ${item.resident.phone}` : ""}
            </AppText>
          </TouchableOpacity>
        )}

        {item.residentNote ? (
          <View style={styles.noteBox}>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              Resident says
            </AppText>
            <AppText variant="bodySmall">{item.residentNote}</AppText>
          </View>
        ) : null}

        {item.residentImage ? (
          <Image
            source={{ uri: item.residentImage }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : null}

        {item.canReview ? (
          rejecting ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <AppInput
                label="Rejection note"
                value={note}
                onChangeText={setNote}
                placeholder="Why is this collection not approved?"
                multiline
              />
              <AppButton
                title="Confirm Reject"
                onPress={() => decide(item, "reject")}
                loading={busy}
                disabled={busy}
              />
              <AppButton
                title="Cancel"
                variant="ghost"
                onPress={() => {
                  setRejectingId(null);
                  setNote("");
                }}
                style={{ marginTop: theme.spacing.sm }}
              />
            </View>
          ) : (
            <View style={styles.row}>
              <AppButton
                title="Approve"
                onPress={() => decide(item, "approve")}
                loading={busy}
                disabled={busy}
                style={{ flex: 1, backgroundColor: theme.colors.success }}
              />
              <AppButton
                title="Reject"
                variant="outline"
                onPress={() => setRejectingId(item.id)}
                disabled={busy}
                style={{ flex: 1, marginLeft: theme.spacing.sm }}
              />
            </View>
          )
        ) : (
          <AppText
            variant="caption"
            color={theme.colors.textSecondary}
            style={{ marginTop: theme.spacing.md }}
          >
            You can review this 24 hours after the collection date if the
            resident does not respond.
          </AppText>
        )}
      </AppCard>
    );
  };

  const TabButton = ({
    id,
    label,
    count,
  }: {
    id: "review" | "waiting";
    label: string;
    count: number;
  }) => (
    <TouchableOpacity
      style={[styles.tab, tab === id && styles.tabActive]}
      onPress={() => setTab(id)}
    >
      <AppText
        variant="bodySmall"
        weight="600"
        color={tab === id ? theme.colors.primary : theme.colors.textSecondary}
      >
        {label} ({count})
      </AppText>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer>
      <View style={{ marginBottom: theme.spacing.md }}>
        <AppButton
          title="Back"
          variant="ghost"
          size="small"
          onPress={() => navigation.goBack()}
          style={{ marginLeft: -theme.spacing.sm, alignSelf: "flex-start" }}
        />
        <AppText variant="h2">Collection Approvals</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          Verify collections marked by drivers.
        </AppText>
      </View>

      <View style={styles.tabBar}>
        <TabButton id="review" label="To review" count={toReview.length} />
        <TabButton id="waiting" label="Waiting" count={waiting.length} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} size="large" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(i) => `${i.kind}-${i.id}`}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
          ListEmptyComponent={
            <AppText
              variant="body"
              color={theme.colors.textSecondary}
              align="center"
              style={{ padding: theme.spacing.xl }}
            >
              {tab === "review"
                ? "Nothing to review right now."
                : "No collections waiting on residents."}
            </AppText>
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: theme.spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center" },
  row: { flexDirection: "row", marginTop: theme.spacing.md },
  flex: { flex: 1 },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.sm,
  },
  noteBox: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  tabBar: {
    flexDirection: "row",
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.borderRadius.sm,
  },
  tabActive: { backgroundColor: theme.colors.primary + "10" },
});
