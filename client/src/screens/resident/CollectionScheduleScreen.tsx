import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Calendar, MapPin } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { scheduleService } from '../../services/scheduleService';
import { CollectionSchedule, Location } from '../../types';
import { mockLocations } from '../../data/mockData';

export const CollectionScheduleScreen: React.FC = () => {
  const { user } = useAuth();
  
  const [schedules, setSchedules] = useState<CollectionSchedule[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedules = async () => {
      if (!user?.locationId) return;
      
      const loc = mockLocations.find(l => l.id === user.locationId) || null;
      setLocation(loc);

      try {
        const data = await scheduleService.getSchedulesByLocation(user.locationId);
        setSchedules(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [user]);

  const renderSchedule = ({ item }: { item: CollectionSchedule }) => {
    const nextDate = new Date(item.nextPickup).toLocaleDateString(undefined, {
      month: 'long', day: 'numeric', year: 'numeric'
    });

    return (
      <AppCard style={styles.card} elevation="sm">
        <View style={styles.cardRow}>
          <Calendar color={theme.colors.primary} size={32} />
          <View style={styles.cardContent}>
            <AppText variant="h3">{item.dayOfWeek}s</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Weekly Collection
            </AppText>
          </View>
        </View>
        <View style={styles.divider} />
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>Next Pickup:</AppText>
        <AppText variant="body" weight="600" color={theme.colors.text}>{nextDate}</AppText>
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

      {location && (
        <View style={styles.locationContainer}>
          <MapPin color={theme.colors.textSecondary} size={20} />
          <View style={styles.locationText}>
            <AppText variant="body" weight="600">{location.street}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {location.ward}, {location.lga}
            </AppText>
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={item => item.id}
          renderItem={renderSchedule}
          ListEmptyComponent={
            <AppText variant="body" color={theme.colors.textSecondary} align="center" style={{ marginTop: 40 }}>
              No schedules found for your area.
            </AppText>
          }
        />
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
