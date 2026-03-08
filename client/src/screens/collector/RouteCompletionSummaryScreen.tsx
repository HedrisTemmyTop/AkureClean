import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CheckCircle, Clock, Map, AlertTriangle } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { routeService } from '../../services/routeService';
import { AssignmentRoute } from '../../types';
import { CollectorStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<CollectorStackParamList, 'RouteSummary'>;

export const RouteCompletionSummaryScreen: React.FC = () => {
  const routeParams = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { routeId } = routeParams.params;

  const [assignment, setAssignment] = useState<AssignmentRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const data = await routeService.getRouteById(routeId);
        if (data) setAssignment(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [routeId]);

  if (loading || !assignment) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const compStops = assignment.stops.filter(s => s.status === 'Completed').length;
  const skipStops = assignment.stops.filter(s => s.status === 'Skipped').length;
  const totalStops = assignment.stops.length;
  const completionPercent = ((compStops + skipStops) / totalStops) * 100;

  return (
    <ScreenContainer scrollable>
      <View style={styles.heroSection}>
        <CheckCircle color={theme.colors.success} size={80} style={{ marginBottom: theme.spacing.lg }} />
        <AppText variant="h1" align="center" style={{ marginBottom: theme.spacing.xs }}>
          Route Completed
        </AppText>
        <AppText variant="body" color={theme.colors.textSecondary} align="center">
          Great job! The area is clear.
        </AppText>
      </View>

      <AppCard style={styles.summaryCard} elevation="md">
        <AppText variant="h3" style={{ marginBottom: theme.spacing.xl, textAlign: 'center' }}>
          {assignment.title}
        </AppText>

        <View style={styles.row}>
          <View style={styles.statBox}>
            <AppText variant="h2" color={theme.colors.success}>{compStops}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>Completed</AppText>
          </View>
          <View style={styles.statBox}>
            <AppText variant="h2" color={theme.colors.warning}>{skipStops}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>Skipped</AppText>
          </View>
          <View style={styles.statBox}>
            <AppText variant="h2">{totalStops}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>Total Stops</AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Clock color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Duration (Est / Actual)</AppText>
            <AppText variant="body">{assignment.estimatedDuration} / {assignment.actualDuration || 'N/A'}</AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Map color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Distance Covered</AppText>
            <AppText variant="body">{assignment.estimatedDistance}</AppText>
          </View>
        </View>

      </AppCard>

      <AppButton 
        title="Return to Dashboard" 
        onPress={() => navigation.navigate('CollectorTabs')}
        size="large"
        style={styles.doneBtn}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  summaryCard: {
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  detailTextContainer: {
    marginLeft: theme.spacing.md,
  },
  doneBtn: {
    marginBottom: theme.spacing.xxl,
  }
});
