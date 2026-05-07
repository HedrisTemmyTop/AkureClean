import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Calendar, MapPin } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { routeService } from '../../services/routeService';
import { AssignmentRoute } from '../../types';

export const CollectionScheduleScreen: React.FC = () => {
  const { user } = useAuth();
  
  const [nextCollection, setNextCollection] = useState<{ collectionDate: string, collectionTime: string, title: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const data = await routeService.getNextCollectionDate();
        setNextCollection(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [user]);

  const renderSchedule = () => {
    if (!nextCollection) return null;
    const dateObj = new Date(nextCollection.collectionDate);
    const dateStr = dateObj.toLocaleDateString(undefined, {
      month: 'long', day: 'numeric', year: 'numeric'
    });
    const dayOfWeek = dateObj.toLocaleDateString(undefined, { weekday: 'long' });

    return (
      <AppCard style={styles.card} elevation="sm">
        <View style={styles.cardRow}>
          <Calendar color={theme.colors.primary} size={32} />
          <View style={styles.cardContent}>
            <AppText variant="h3">{dayOfWeek}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {nextCollection.title || 'Scheduled Collection'}
            </AppText>
          </View>
        </View>
        <View style={styles.divider} />
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>Next Pickup:</AppText>
        <AppText variant="body" weight="600" color={theme.colors.text}>{dateStr}</AppText>
        {!!nextCollection.collectionTime && (
          <AppText variant="body" weight="600" color={theme.colors.text}>Time: {nextCollection.collectionTime}</AppText>
        )}
      </AppCard>
    );
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <AppText variant="h2">Collection Schedule</AppText>
        <AppText variant="body" color={theme.colors.textSecondary}>
          Your area's waste collection times.
        </AppText>
      </View>

      {user && (
        <View style={styles.locationContainer}>
          <MapPin color={theme.colors.textSecondary} size={20} />
          <View style={styles.locationText}>
            <AppText variant="body" weight="600">{user.address || 'Your Address'}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {user.ward || 'Ward'}, {user.localGovt || 'LGA'}
            </AppText>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : nextCollection && new Date(nextCollection.collectionDate) >= new Date(new Date().setHours(0,0,0,0)) ? (
        renderSchedule()
      ) : (
        <AppText variant="body" color={theme.colors.textSecondary} align="center" style={{ marginTop: 40 }}>
          Unscheduled
        </AppText>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.lg,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  locationText: {
    marginLeft: theme.spacing.md,
  },
  loader: {
    marginTop: theme.spacing.xxl,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    marginLeft: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
});
