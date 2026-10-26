import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, Info, Users, Clock, Hash, Check, AlertCircle, Trash2, Calendar } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../theme';
import { routeService } from '../../services/routeService';
import { RouteStop } from '../../types';
import { AdminStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList, 'AdminAssignmentDetails'>;

export const AdminStopDetailsScreen: React.FC = () => {
  const routeParams = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { routeId, stopId } = routeParams.params;

  const [stop, setStop] = useState<RouteStop | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStop = async () => {
      try {
        const routeData = await routeService.getRouteById(routeId);
        if (routeData) {
          const stopData = routeData.stops.find(s => s.id === stopId || (s as any)._id === stopId);
          if (stopData) {
            setStop(stopData);
          }
        }
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Could not fetch stop details.');
      } finally {
        setLoading(false);
      }
    };
    fetchStop();
  }, [routeId, stopId]);

  if (loading) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!stop) {
    return (
      <ScreenContainer style={styles.centered}>
        <AppText>Stop not found.</AppText>
        <AppButton title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} />
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
        <StatusBadge status={stop.status as any} />
      </View>

      <AppText variant="h1" style={styles.title}>{stop.address}</AppText>
      
      <View style={styles.locationMeta}>
        <MapPin color={theme.colors.textSecondary} size={16} />
        <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginLeft: 6 }}>
          {stop.ward}, {stop.lga}
        </AppText>
      </View>

      <AppCard style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Info color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailText}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Waste Type</AppText>
            <AppText variant="body" weight="600">{stop.wasteType}</AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <AlertCircle color={getSeverityColor(stop.severity)} size={20} />
          <View style={styles.detailText}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Severity</AppText>
            <AppText variant="body" weight="600" color={getSeverityColor(stop.severity)}>
              {stop.severity}
            </AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Users color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailText}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Resident Details</AppText>
            <AppText variant="body" weight="600">{stop.residentName || "Unknown"}</AppText>
            {stop.residentPhone ? <AppText variant="body">{stop.residentPhone}</AppText> : null}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Hash color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailText}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Reports Count</AppText>
            <AppText variant="body" weight="600">{stop.reportsCount}</AppText>
          </View>
        </View>
      </AppCard>

      {stop.verificationStatus && stop.verificationStatus !== "None" && (
        <AppCard style={styles.noteCard} elevation="none">
          <AppText variant="bodySmall" weight="600" color={theme.colors.textSecondary}>
            Verification Status
          </AppText>
          <AppText variant="body" weight="600" style={{ marginTop: 4, color: theme.colors.primary }}>
            {stop.verificationStatus.replace(/([A-Z])/g, ' $1').trim()}
          </AppText>
        </AppCard>
      )}

      {(stop.residentNote || stop.residentImage) ? (
        <AppCard style={styles.noteCard} elevation="none">
          <AppText variant="bodySmall" weight="600" color={theme.colors.textSecondary} style={{ marginBottom: 4 }}>
            Resident Dispute/Note:
          </AppText>
          {stop.residentNote ? (
            <AppText variant="body" style={{ fontStyle: 'italic', marginBottom: 8 }}>"{stop.residentNote}"</AppText>
          ) : null}
          {stop.residentImage ? (
            <Image 
              source={{ uri: stop.residentImage }} 
              style={{ width: '100%', height: 200, borderRadius: 8, marginTop: 8 }}
              resizeMode="cover"
            />
          ) : null}
        </AppCard>
      ) : null}

      {stop.status === 'Skipped' && (
        <AppCard style={styles.skipCard} elevation="none">
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Trash2 color={theme.colors.status.cancelled} size={20} />
            <AppText variant="h3" style={{ marginLeft: 8, color: theme.colors.status.cancelled }}>
              Skip Reason
            </AppText>
          </View>
          <AppText variant="body" weight="500">
            {stop.collectionNote || stop.skipReason || "No reason provided."}
          </AppText>
        </AppCard>
      )}

      {stop.status === 'Completed' && stop.collectionNote && (
        <AppCard style={styles.completedNoteCard} elevation="none">
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Check color={theme.colors.success} size={20} />
            <AppText variant="h3" style={{ marginLeft: 8, color: theme.colors.success }}>
              Collection Note
            </AppText>
          </View>
          <AppText variant="body">
            {stop.collectionNote}
          </AppText>
        </AppCard>
      )}

      {stop.verificationStatus && ["AwaitingResident", "ResidentConfirmed", "Disputed"].includes(stop.verificationStatus) && (
        <View style={{ marginTop: 10, marginBottom: 30 }}>
          <AppButton 
            title="Approve Collection" 
            disabled={stop.verificationStatus === "AwaitingResident" && stop.collectedAt ? (Date.now() - new Date(stop.collectedAt).getTime() < 24 * 60 * 60 * 1000) : false}
            onPress={async () => {
              try {
                setLoading(true);
                await require('../../services/verificationService').verificationService.review({ kind: 'stop', id: stop.id, assignmentId: routeId }, 'approve');
                Alert.alert("Success", "Collection approved.");
                navigation.goBack();
              } catch (e: any) {
                Alert.alert("Error", e.message || "Failed to approve.");
                setLoading(false);
              }
            }}
            style={{ marginBottom: 10 }}
          />
          <AppButton 
            title="Reject Collection" 
            variant="outline"
            disabled={stop.verificationStatus === "AwaitingResident" && stop.collectedAt ? (Date.now() - new Date(stop.collectedAt).getTime() < 24 * 60 * 60 * 1000) : false}
            onPress={async () => {
              try {
                setLoading(true);
                await require('../../services/verificationService').verificationService.review({ kind: 'stop', id: stop.id, assignmentId: routeId }, 'reject');
                Alert.alert("Success", "Collection rejected.");
                navigation.goBack();
              } catch (e: any) {
                Alert.alert("Error", e.message || "Failed to reject.");
                setLoading(false);
              }
            }}
          />
          {stop.verificationStatus === "AwaitingResident" && stop.collectedAt && (Date.now() - new Date(stop.collectedAt).getTime() < 24 * 60 * 60 * 1000) && (
            <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ textAlign: 'center', marginTop: 8 }}>
              Buttons are disabled until 24 hours have passed since collection.
            </AppText>
          )}
        </View>
      )}

    </ScreenContainer>
  );
};

const getSeverityColor = (sev: string) => {
  if (sev === 'Critical' || sev === 'High') return theme.colors.status.cancelled;
  if (sev === 'Medium') return theme.colors.status.pending;
  return theme.colors.success;
};

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  backBtn: {
    marginLeft: -theme.spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  detailsCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  noteCard: {
    backgroundColor: theme.colors.info + '15',
    borderColor: theme.colors.info + '30',
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
  },
  skipCard: {
    backgroundColor: theme.colors.status.cancelled + '10',
    borderColor: theme.colors.status.cancelled + '30',
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  completedNoteCard: {
    backgroundColor: theme.colors.success + '10',
    borderColor: theme.colors.success + '30',
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
});
