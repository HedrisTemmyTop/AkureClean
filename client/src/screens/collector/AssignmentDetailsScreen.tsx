import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Map, Clock, Navigation as NavIcon, AlertTriangle, CloudRain } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppButton } from '../../components/AppButton';
import { StatusBadge } from '../../components/StatusBadge';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { routeService } from '../../services/routeService';
import { AssignmentRoute } from '../../types';
import { CollectorStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<CollectorStackParamList, 'AssignmentDetails'>;

export const AssignmentDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { routeId } = route.params;

  const [assignment, setAssignment] = useState<AssignmentRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const data = await routeService.getRouteById(routeId);
        if (data) setAssignment(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRoute();
  }, [routeId]);

  if (loading) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!assignment) return null;

  const isCompleted = assignment.status === 'Completed';
  const isActive = assignment.status === 'InProgress' || assignment.status === 'Paused';

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
        <StatusBadge status={assignment.status as any} />
      </View>

      <AppText variant="h1" style={styles.title}>{assignment.title}</AppText>
      <AppText variant="body" color={theme.colors.textSecondary} style={styles.area}>
        {assignment.area}
      </AppText>

      {/* Hero Stats */}
      <View style={styles.heroRow}>
        <AppCard style={styles.heroCard} padded>
          <View style={styles.heroIcon}><Map color={theme.colors.primary} size={20} /></View>
          <AppText variant="h3">{assignment.stops.length}</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>Locations</AppText>
        </AppCard>
        <AppCard style={styles.heroCard} padded>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.status.pending + '20' }]}>
            <NavIcon color={theme.colors.status.pending} size={20} />
          </View>
          <AppText variant="h3">{assignment.estimatedDistance}</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>Distance</AppText>
        </AppCard>
        <AppCard style={styles.heroCard} padded>
          <View style={[styles.heroIcon, { backgroundColor: theme.colors.status.completed + '20' }]}>
            <Clock color={theme.colors.status.completed} size={20} />
          </View>
          <AppText variant="h3">{assignment.estimatedDuration}</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>Duration</AppText>
        </AppCard>
      </View>

      {/* Conditions */}
      <AppText variant="h3" style={styles.sectionTitle}>Conditions</AppText>
      <View style={styles.conditionsRow}>
        <AppCard style={styles.conditionBox}>
          <AlertTriangle color={assignment.traffic.condition === 'Heavy' ? theme.colors.warning : theme.colors.success} size={20} style={styles.conditionIcon} />
          <View>
            <AppText variant="bodySmall" weight="600">{assignment.traffic.condition} Traffic</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{assignment.traffic.message}</AppText>
          </View>
        </AppCard>
        <AppCard style={styles.conditionBox}>
          <CloudRain color={theme.colors.info} size={20} style={styles.conditionIcon} />
          <View>
            <AppText variant="bodySmall" weight="600">{assignment.weather.temperature} - {assignment.weather.condition}</AppText>
            {assignment.weather.warning && (
               <AppText variant="caption" color={theme.colors.warning}>{assignment.weather.warning}</AppText>
            )}
          </View>
        </AppCard>
      </View>

      {/* Map Preview Placeholder */}
      <AppText variant="h3" style={styles.sectionTitle}>Route Preview</AppText>
      <AppCard style={styles.mapPlaceholder}>
        <Map color={theme.colors.textSecondary} size={32} />
        <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginTop: 8 }}>
          Map will be visible once navigation starts
        </AppText>
      </AppCard>

      {/* Action Button */}
      <View style={styles.footer}>
        {!isCompleted ? (
          <AppButton 
            title={isActive ? "Resume Route" : "Start Route"} 
            onPress={() => navigation.navigate('Route', { routeId: assignment.id })}
            size="large"
          />
        ) : (
          <AppButton 
            title="View Completion Summary" 
            onPress={() => navigation.navigate('RouteSummary', { routeId: assignment.id })}
            variant="outline"
          />
        )}
      </View>

    </ScreenContainer>
  );
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
  title: {},
  area: {
    marginBottom: theme.spacing.xl,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  heroCard: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    alignItems: 'center',
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  conditionsRow: {
    marginBottom: theme.spacing.xl,
  },
  conditionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  conditionIcon: {
    marginRight: theme.spacing.md,
  },
  mapPlaceholder: {
    height: 150,
    backgroundColor: theme.colors.border + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xxl,
  },
  footer: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  }
});
