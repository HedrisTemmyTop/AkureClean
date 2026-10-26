import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { CheckCircle2 } from "lucide-react-native";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { ImagePickerField } from "../../components/ImagePickerField";
import { theme } from "../../theme";
import { parseApiError } from "../../services/api";
import {
  verificationService,
  VerificationItem,
} from "../../services/verificationService";

/**
 * Resident: confirm (or dispute) collections the driver has marked as done.
 */
export const ConfirmCollectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // dispute form state
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const load = async () => {
    try {
      setItems(await verificationService.getResidentPending());
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

  const confirm = async (item: VerificationItem) => {
    setBusyId(item.id);
    try {
      await verificationService.confirm(item);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      Alert.alert("Collection Confirmed", "Thank you for confirming your waste collection.");
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const submitDispute = async (item: VerificationItem) => {
    if (!note.trim()) {
      Alert.alert("Reason required", "Please tell us what went wrong.");
      return;
    }
    setBusyId(item.id);
    try {
      await verificationService.dispute(item, note.trim(), image);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setDisputingId(null);
      setNote("");
      setImage(null);
      Alert.alert("Sent", "Thanks. The admin will review this.");
    } catch (e) {
      Alert.alert("Error", parseApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const renderItem = ({ item }: { item: VerificationItem }) => {
    const isDisputing = disputingId === item.id;
    const busy = busyId === item.id;

    return (
      <AppCard style={styles.card}>
        <AppText variant="h3">
          {item.kind === "pickup" ? "Requested pickup" : item.assignmentTitle}
        </AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {item.address}
        </AppText>
        <AppText
          variant="caption"
          color={theme.colors.textSecondary}
          style={{ marginTop: 4 }}
        >
          Marked collected{" "}
          {item.collectedAt ? new Date(item.collectedAt).toLocaleString() : ""}
          {item.driver ? ` by ${item.driver.name}` : ""}
        </AppText>

        <AppText variant="body" style={{ marginTop: theme.spacing.md }}>
          Was your waste collected?
        </AppText>

        {!isDisputing ? (
          <View style={styles.row}>
            <AppButton
              title="Yes, collected"
              onPress={() => confirm(item)}
              loading={busy}
              disabled={busy}
              style={{ flex: 1, backgroundColor: theme.colors.success }}
            />
            <AppButton
              title="No"
              variant="outline"
              onPress={() => setDisputingId(item.id)}
              disabled={busy}
              style={{ flex: 1, marginLeft: theme.spacing.sm }}
            />
          </View>
        ) : (
          <View style={{ marginTop: theme.spacing.md }}>
            <AppInput
              label="What went wrong?"
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Nobody came, waste is still outside"
              multiline
            />
            <ImagePickerField
              value={image}
              onChange={setImage}
              label="Add a photo (Optional)"
            />
            <AppButton
              title="Submit"
              onPress={() => submitDispute(item)}
              loading={busy}
              disabled={busy}
            />
            <AppButton
              title="Cancel"
              variant="ghost"
              onPress={() => {
                setDisputingId(null);
                setNote("");
                setImage(null);
              }}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>
        )}
      </AppCard>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppButton
          title="Back"
          variant="ghost"
          size="small"
          onPress={() => navigation.goBack()}
          style={{ marginLeft: -theme.spacing.sm, alignSelf: "flex-start" }}
        />
        <AppText variant="h2">Confirm Collections</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          Let us know if the driver really collected your waste.
        </AppText>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} size="large" />
      ) : (
        <FlatList
          data={items}
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
            <View style={styles.empty}>
              <CheckCircle2 color={theme.colors.success} size={40} />
              <AppText
                variant="body"
                color={theme.colors.textSecondary}
                align="center"
                style={{ marginTop: theme.spacing.md }}
              >
                Nothing to confirm right now.
              </AppText>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: { marginBottom: theme.spacing.lg },
  card: { marginBottom: theme.spacing.md },
  row: { flexDirection: "row", marginTop: theme.spacing.md },
  flex: { flex: 1 },
  empty: { alignItems: "center", padding: theme.spacing.xl },
});
