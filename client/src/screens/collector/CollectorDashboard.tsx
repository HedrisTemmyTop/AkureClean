import React, { useEffect, useState } from 'react';
import { Alert, View, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Map, Truck, List, CloudRain, AlertTriangle, Navigation, Clock, LogOut } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { routeService } from '../../services/routeService';
import { weatherService } from '../../services/weatherService';
import { trafficService } from '../../services/trafficService';
import { AssignmentRoute, WeatherSummary, TrafficSummary } from '../../types';
import { CollectorStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<CollectorStackParamList, 'CollectorTabs'>;

export const CollectorDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: signOut }
      ]
    );
  };
  const [routes, setRoutes] = useState<AssignmentRoute[]>([]);
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [traffic, setTraffic] = useState<TrafficSummary | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    if (!user) return;
    try {
      const activeRoutes = await routeService.getAssignments(user.id);
      setRoutes(activeRoutes);

      const area = activeRoutes[0]?.area || 'Akure South';
      const [wData, tData, allReports] = await Promise.all([
        weatherService.getWeatherConditions(area),
        trafficService.getTrafficConditions(area),
        reportService.getAllReports()
      ]);
      setWeather(wData);
      setTraffic(tData);
      
      const pendingAdHoc = allReports.filter(r => r.status === 'Pending' && r.preferredDate);
      setPendingRequests(pendingAdHoc.length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const activeRoute = routes.find(r => r.status === 'InProgress' || r.status === 'Paused');
  const pendingRoutesCount = routes.filter(r => r.status === 'Pending').length;
  const completedRoutesCount = routes.filter(r => r.status === 'Completed').length;

  return (
    <ScreenContainer scrollable scrollViewProps={{
      refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }}>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <AppText variant="h2">Collector Shift</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </AppText>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut color={theme.colors.status.cancelled} size={22} />
          </TouchableOpacity>
        </View>
      </Animatable.View>

      {pendingRequests > 0 && (
        <Animatable.View animation="fadeIn" delay={150}>
          <TouchableOpacity onPress={() => navigation.navigate('CollectorTabs' as any, { screen: 'Requests' })}>
            <View style={styles.alertCard}>
              <AlertTriangle color={theme.colors.warning} size={24} style={{ marginRight: theme.spacing.md }} />
              <View style={{ flex: 1 }}>
                <AppText variant="body" weight="600" color={theme.colors.warning}>
                  New Ad-hoc Requests
                </AppText>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  There are {pendingRequests} missed-schedule pickup requests in your area.
                </AppText>
              </View>
            </View>
          </TouchableOpacity>
        </Animatable.View>
      )}

      {/* Hero Active Route Section */}
      {activeRoute ? (
        <AppCard style={styles.activeRouteCard} elevation="md" animation="fadeInUp" delay={200}>
          <View style={styles.cardHeader}>
            <View style={styles.badge}>
              <View style={styles.pulseDot} />
              <AppText variant="caption" color={theme.colors.primary} weight="600">
                ACTIVE ROUTE
              </AppText>
            </View>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              {activeRoute.status === 'Paused' ? 'Paused' : 'En Route'}
            </AppText>
          </View>
          <AppText variant="h2" style={styles.routeTitle}>{activeRoute.title}</AppText>
          
          <View style={styles.routeMeta}>
            <View style={styles.metaItem}>
              <Map color={theme.colors.textSecondary} size={16} />
              <AppText variant="bodySmall" color={theme.colors.textSecondary} style={styles.metaText}>
                {activeRoute.stops.filter(s => s.status === 'Completed').length}/{activeRoute.stops.length} Stops
              </AppText>
            </View>
            <View style={styles.metaItem}>
              <Clock color={theme.colors.textSecondary} size={16} />
              <AppText variant="bodySmall" color={theme.colors.textSecondary} style={styles.metaText}>
                {activeRoute.estimatedDuration}
              </AppText>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Route', { routeId: activeRoute.id })}
          >
            <Navigation color={theme.colors.surface} size={20} />
            <AppText variant="body" weight="600" color={theme.colors.surface} style={{ marginLeft: 8 }}>
              Resume Navigation
            </AppText>
          </TouchableOpacity>
        </AppCard>
      ) : (
        <AppCard style={styles.activeRouteCard} elevation="md" animation="fadeInUp" delay={200}>
          <View style={styles.iconCircle}>
            <Truck color={theme.colors.primary} size={32} />
          </View>
          <AppText variant="h3" align="center" style={{ marginTop: 16 }}>Ready to Roll?</AppText>
          <AppText variant="bodySmall" align="center" color={theme.colors.textSecondary} style={{ marginBottom: 16, marginTop: 4 }}>
            You have {pendingRoutesCount} routes assigned today.
          </AppText>
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('CollectorTabs' as any, { screen: 'Assignments' })}
          >
            <List color={theme.colors.surface} size={20} />
            <AppText variant="body" weight="600" color={theme.colors.surface} style={{ marginLeft: 8 }}>
              View Assignments
            </AppText>
          </TouchableOpacity>
        </AppCard>
      )}

      {/* Env Conditions */}
      <View style={styles.conditionsRow}>
        <AppCard style={styles.conditionCard} animation="slideInLeft" delay={300}>
          <View style={styles.conditionHeader}>
            <CloudRain color={theme.colors.info} size={24} />
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ flex: 1, textAlign: 'right' }}>Weather</AppText>
          </View>
          <AppText variant="h3">{weather?.temperature || '--'}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>{weather?.condition || 'Loading...'}</AppText>
        </AppCard>
        
        <AppCard style={styles.conditionCard} animation="slideInRight" delay={400}>
          <View style={styles.conditionHeader}>
            <AlertTriangle color={traffic?.condition === 'Heavy' ? theme.colors.warning : theme.colors.success} size={24} />
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ flex: 1, textAlign: 'right' }}>Traffic</AppText>
          </View>
          <AppText variant="h3">{traffic?.condition || '--'}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>{traffic?.delay || ''}</AppText>
        </AppCard>
      </View>

      {/* Summary Stats */}
      <Animatable.Text animation="fadeIn" delay={500}>
        <AppText variant="h3" style={styles.sectionTitle}>Shift Progress</AppText>
      </Animatable.Text>
      <View style={styles.statsGrid}>
        <AppCard style={styles.statBox} animation="zoomIn" delay={600}>
          <AppText variant="h2" color={theme.colors.primary}>{pendingRoutesCount}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>Pending</AppText>
        </AppCard>
        <AppCard style={styles.statBox} animation="zoomIn" delay={700}>
          <AppText variant="h2" color={theme.colors.status.completed}>{completedRoutesCount}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>Completed</AppText>
        </AppCard>
      </View>
      
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoutBtn: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.status.cancelled + '10',
    borderRadius: theme.borderRadius.md,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '15',
    borderColor: theme.colors.warning,
    borderWidth: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  activeRouteCard: {
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: 6,
  },
  routeTitle: {
    marginBottom: theme.spacing.md,
  },
  routeMeta: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  metaText: {
    marginLeft: 6,
  },
  actionBtn: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  conditionsRow: {
    flexDirection: 'row',
    marginHorizontal: -theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  conditionCard: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  conditionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: -theme.spacing.xs,
  },
  statBox: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    padding: theme.spacing.md,
    alignItems: 'center',
  }
});
