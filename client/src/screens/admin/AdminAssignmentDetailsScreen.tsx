import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, Calendar, CheckCircle, Clock, User, Mail, Home } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../theme';
import { routeService } from '../../services/routeService';
import { AssignmentRoute } from '../../types';
import { AdminStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList, 'AdminTabs'>;

export const AdminAssignmentDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { routeId } = route.params;

  const [assignment, setAssignment] = useState<AssignmentRoute | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Find from all mock data
        const data = await routeService.getAssignments('mock_col_1');
        const found = data.find(r => r.id === routeId);
        if (found) {
          setAssignment(found);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [routeId]);

  if (loading || !assignment) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const completedStops = assignment.stops?.filter(s => s.status === 'Completed').length || 0;
  const totalStops = assignment.stops?.length || 0;
  const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

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

      <View style={{ marginTop: 24, marginBottom: 32 }}>
        <AppText variant="h1" style={styles.title}>{assignment.area} Street</AppText>
        <View style={styles.metaRow}>
          <MapPin color={theme.colors.textSecondary} size={16} />
          <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginLeft: 6 }}>
            {assignment.title}
          </AppText>
        </View>
      </View>

      <AppCard style={styles.card}>
        <AppText variant="h3" style={styles.sectionTitle}>Overview</AppText>
        
        <View style={styles.detailRow}>
          <User color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Assigned Collector</AppText>
            <AppText variant="body" weight="600">{assignment.collectorId}</AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Mail color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Collector Email</AppText>
            <AppText variant="body" weight="600">{assignment.collectorId}@mock.com</AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Calendar color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Next Schedule Date</AppText>
            <AppText variant="body" weight="600">{assignment.collectionDate}</AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Home color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Number of Houses</AppText>
            <AppText variant="body" weight="600">{totalStops} Houses</AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <CheckCircle color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Collection Status</AppText>
            <AppText variant="body" weight="600">
              {progress === 100 ? 'Collection Done' : 'Pending / In Progress'}
            </AppText>
          </View>
        </View>
      </AppCard>

      <View>
        <AppText variant="h3" style={styles.sectionTitle}>Stops Details</AppText>
        {assignment.stops?.map((stop, index) => (
          <AppCard key={stop.id} style={styles.stopCard}>
            <View style={styles.stopIconBg}>
              {stop.status === 'Completed' ? (
                <CheckCircle color={theme.colors.success} size={20} />
              ) : (
                <View style={styles.dot} />
              )}
            </View>
            <View style={styles.stopDetails}>
              <AppText variant="body" weight="600">{stop.address}</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                Waste Type: {stop.wasteType}
              </AppText>
            </View>
            <StatusBadge status={stop.status as any} />
          </AppCard>
        ))}
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
    marginBottom: theme.spacing.md,
  },
  backBtn: {
    marginLeft: -theme.spacing.sm,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  card: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  detailTextContainer: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  progressContainer: {
    marginTop: theme.spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: theme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  stopIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.border + '50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textSecondary,
  },
  stopDetails: {
    flex: 1,
  }
});
