import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Animatable from "react-native-animatable";
import { MapPin, Calendar, ChevronRight, Check, X } from "lucide-react-native";

import { ScreenContainer } from "../../components/ScreenContainer";
import { AppText } from "../../components/AppText";
import { AppCard } from "../../components/AppCard";
import { StatusBadge } from "../../components/StatusBadge";
import { AppButton } from "../../components/AppButton";
import { theme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { pickupService, PickupRequestData } from "../../services/pickupService";

export const RequestedPickupsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [requests, setRequests] = useState<PickupRequestData[]>([]);
  const [activeRequests, setActiveRequests] = useState<PickupRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasActive, setHasActive] = useState(false);
  const [activeTab, setActiveTab] = useState<"available" | "active">(
    "available",
  );

  const loadRequests = async () => {
    try {
      const [activeResponse, availableData] = await Promise.all([
        pickupService.getDriverPickups(),
        pickupService.getAvailablePickups(),
      ]);

      setActiveRequests(activeResponse.data);
      setHasActive(activeResponse.hasActive);
      setRequests(availableData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: PickupRequestData;
    index: number;
  }) => {
    const delay = Math.min(index * 100, 1000) + 200;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("RequestDetails", { requestId: item.id })
        }
      >
        <AppCard style={styles.card} animation="fadeInUp" delay={delay}>
          <View style={styles.cardHeader}>
            <View>
              <AppText variant="h3" numberOfLines={1} ellipsizeMode="tail">
                {(item.address.length > 22 &&
                  item.address.slice(0, 22) + " ...") ||
                  item.address}
              </AppText>
              {item.userId?.name && (
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  Resident: {item.userId.name}
                </AppText>
              )}
            </View>
            <StatusBadge status={item.status as any} />
          </View>

          <View style={styles.detailRow}>
            <MapPin color={theme.colors.textSecondary} size={16} />
            <View style={{ marginLeft: 6, flex: 1 }}>
              <AppText variant="bodySmall" color={theme.colors.text}>
                {item.address || item.userId?.address || "Unknown Address"}
              </AppText>
              {(item.ward || item.pollingUnit) && (
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {item.ward}
                  {item.pollingUnit ? ` • ${item.pollingUnit}` : ""}
                </AppText>
              )}
            </View>
          </View>

          <View style={styles.footerRow}>
            <AppText
              variant="caption"
              color={theme.colors.primary}
              weight="600"
            >
              ₦{item.extraFee?.toLocaleString() || "0"}
            </AppText>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  };

  // hasActive is already managed in state via loadRequests

  return (
    <ScreenContainer>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h2">Requests</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          Manage your accepted tasks and browse available pickups.
        </AppText>
      </Animatable.View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "available" && styles.activeTab]}
          onPress={() => setActiveTab("available")}
        >
          <AppText
            variant="bodySmall"
            weight="600"
            color={
              activeTab === "available"
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          >
            Available ({requests.length})
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "active" && styles.activeTab]}
          onPress={() => setActiveTab("active")}
        >
          <AppText
            variant="bodySmall"
            weight="600"
            color={
              activeTab === "active"
                ? theme.colors.primary
                : theme.colors.textSecondary
            }
          >
            My Active ({activeRequests.length})
          </AppText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === "active" ? activeRequests : requests}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <AppText
                variant="body"
                color={theme.colors.textSecondary}
                align="center"
              >
                {activeTab === "active"
                  ? "You don't have any active pickups currently."
                  : "No pending paid requests at the moment."}
              </AppText>
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.lg,
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
  activeTab: {
    backgroundColor: theme.colors.primary + "10",
  },
  listContainer: {
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  detailText: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },
  actionBtn: {
    flex: 1,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
});
