import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, Navigation, Clock, CheckCircle } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { routeService } from '../../services/routeService';
import { AssignmentRoute } from '../../types';
import { CollectorStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<CollectorStackParamList, 'CollectorTabs'>;

export const CollectorAssignmentsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [routes, setRoutes] = useState<AssignmentRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoutes = async () => {
    if (!user) return;
    try {
      const data = await routeService.getAssignments(user.id);
      // Sort: InProgress first, then Pending, then Completed
      data.sort((a, b) => {
        const rank = (s: string) => s === 'InProgress' ? 0 : s === 'Pending' ? 1 : 2;
        return rank(a.status) - rank(b.status);
      });
      setRoutes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  };

  const renderRoute = ({ item, index }: { item: AssignmentRoute, index: number }) => {
    const isCompleted = item.status === 'Completed';
    const delay = Math.min(index * 100, 1000) + 200;

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AssignmentDetails', { routeId: item.id })}
      >
        <AppCard style={[styles.card, isCompleted && styles.cardCompleted]} animation="fadeInUp" delay={delay}>
          <View style={styles.cardHeader}>
            <StatusBadge status={item.status as any} />
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {new Date(item.collectionDate).toLocaleDateString()}
            </AppText>
          </View>
          
          <AppText variant="h3" style={styles.title}>{item.title}</AppText>
          
          <View style={styles.areaRow}>
            <MapPin color={theme.colors.textSecondary} size={16} />
            <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginLeft: 6 }}>
              {item.area}
            </AppText>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <CheckCircle color={theme.colors.status.active} size={16} />
              <AppText variant="caption" style={styles.metricText}>
                {item.stops.filter(s => s.status === 'Completed').length}/{item.stops.length} Stops
              </AppText>
            </View>
            <View style={styles.metric}>
              <Navigation color={theme.colors.status.pending} size={16} />
              <AppText variant="caption" style={styles.metricText}>
                {item.estimatedDistance}
              </AppText>
            </View>
            <View style={styles.metric}>
              <Clock color={theme.colors.status.completed} size={16} />
              <AppText variant="caption" style={styles.metricText}>
                {item.estimatedDuration}
              </AppText>
            </View>
          </View>
        </AppCard>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h2">My Assignments</AppText>
      </Animatable.View>

      <FlatList
        data={routes}
        keyExtractor={item => item.id}
        renderItem={renderRoute}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
             <View style={styles.emptyState}>
               <AppText variant="body" color={theme.colors.textSecondary} align="center">
                 No routes assigned for today.
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
    marginBottom: theme.spacing.md,
  },
  listContainer: {
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardCompleted: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  metricText: {
    marginLeft: 4,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
