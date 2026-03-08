import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, Info, Users, Clock, Hash, Check } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { theme } from '../../theme';
import { routeService } from '../../services/routeService';
import { RouteStop } from '../../types';
import { CollectorStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<CollectorStackParamList, 'StopDetails'>;

export const StopDetailsScreen: React.FC = () => {
  const routeParams = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { routeId, stopId } = routeParams.params;

  const [stop, setStop] = useState<RouteStop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('tes');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchStop = async () => {
      try {
        const routeData = await routeService.getRouteById(routeId);
        if (routeData) {
          const stopData = routeData.stops.find(s => s.id === stopId);
          if (stopData) {
            setStop(stopData);
            if (stopData.collectionNote) setNotes(stopData.collectionNote);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStop();
  }, [routeId, stopId]);

  const handleStatusUpdate = async (status: 'Completed' | 'Skipped') => {
    if (status === 'Skipped' && !notes.trim()) {
      Alert.alert('Note Required', 'Please provide a reason for skipping this stop.');
      return;
    }

    setIsUpdating(true);
    try {
      await routeService.updateStopStatus(routeId, stopId, status, notes);
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not update stop status.');
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!stop) return null;

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <AppButton 
          title="Back to Map" 
          variant="ghost" 
          size="small" 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
        />
        {stop.status !== 'Pending' && (
          <View style={[
            styles.statusBadge, 
            { backgroundColor: stop.status === 'Completed' ? theme.colors.status.completed : theme.colors.status.cancelled }
          ]}>
            <AppText variant="caption" color={theme.colors.surface} weight="600">{stop.status}</AppText>
          </View>
        )}
      </View>

      <AppText variant="h1" style={styles.title}>{stop.address}</AppText>
      <View style={styles.locationMeta}>
        <MapPin color={theme.colors.textSecondary} size={16} />
        <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginLeft: 6 }}>
          {stop.ward}, {stop.lga}
        </AppText>
      </View>

      <AppCard style={styles.detailsCard}>
        <View style={styles.detailRowWrapper}>
          <View style={styles.detailRow}>
            <Info color={theme.colors.textSecondary} size={20} />
            <View style={styles.detailText}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>Waste Type</AppText>
              <AppText variant="body" weight="600">{stop.wasteType}</AppText>
            </View>
          </View>
          <View style={styles.detailRow}>
            <AlertTriangleIcon severity={stop.severity} />
            <View style={styles.detailText}>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>Severity</AppText>
              <AppText variant="body" weight="600" color={getSeverityColor(stop.severity)}>
                {stop.severity}
              </AppText>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Hash color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailText}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Logged Bags / Reports</AppText>
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

      <AppText variant="h3" style={styles.sectionTitle}>Collector Notes</AppText>
      <AppInput
        placeholder="Add a note (required if skipping)..."
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={3}
        style={{ height: 100, textAlignVertical: 'top' }}
        editable={stop.status === 'Pending'}
      />

      {stop.status === 'Pending' && (
        <View style={styles.actionRow}>
          <AppButton 
            title="Skip Stop" 
            variant="outline" 
            onPress={() => handleStatusUpdate('Skipped')}
            loading={isUpdating}
            style={styles.skipBtn}
          />
          <AppButton 
            title="Mark Completed" 
            onPress={() => handleStatusUpdate('Completed')}
            loading={isUpdating}
            style={styles.completeBtn}
          />
        </View>
      )}

    </ScreenContainer>
  );
};

// Helper icon component
const AlertTriangleIcon = ({ severity }: { severity: string }) => {
  return <Info color={getSeverityColor(severity)} size={20} />;
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
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  title: {},
  locationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  detailsCard: {
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
  },
  detailRowWrapper: {
    flexDirection: 'row',
  },
  detailRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailText: {
    marginLeft: theme.spacing.sm,
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
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  skipBtn: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  completeBtn: {
    flex: 2,
  }
});
