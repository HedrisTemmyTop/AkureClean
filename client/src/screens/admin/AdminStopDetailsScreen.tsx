import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
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
          <Hash color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailText}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Reports Count</AppText>
            <AppText variant="body" weight="600">{stop.reportsCount}</AppText>
          </View>
        </View>
      </AppCard>

      {stop.residentNote ? (
        <AppCard style={styles.noteCard} elevation="none">
          <AppText variant="bodySmall" weight="600" color={theme.colors.textSecondary} style={{ marginBottom: 4 }}>
            Resident Note:
          </AppText>
          <AppText variant="body" style={{ fontStyle: 'italic' }}>"{stop.residentNote}"</AppText>
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
