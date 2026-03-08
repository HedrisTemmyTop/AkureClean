import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Users, Truck, AlertTriangle, CheckCircle, BarChart3, Clock, LogOut, Plus } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { adminService } from '../../services/adminService';
import { routeService } from '../../services/routeService';
import { AdminStats, AssignmentRoute } from '../../types';
import { AdminStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList, 'AdminTabs'>;

export const AdminDashboard: React.FC = () => {
  const { signOut } = useAuth();
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
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentAssignments, setRecentAssignments] = useState<AssignmentRoute[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const statsData = await adminService.getDashboardStats();
      const assignmentsData = await routeService.getAssignments('col1');
      
      setStats(statsData);
      setRecentAssignments(assignmentsData.slice(0, 3)); // show top 3 recent assignments
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  return (
    <ScreenContainer scrollable scrollViewProps={{
      refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }}>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <AppText variant="h2">Overview</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </AppText>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut color={theme.colors.status.cancelled} size={22} />
          </TouchableOpacity>
        </View>
      </Animatable.View>

      {/* KPI Hero */}
      {stats && (
        <Animatable.View animation="fadeInUp" delay={200}>
          <View style={styles.kpiHero}>
            <View style={styles.kpiIconBox}>
              <BarChart3 color={theme.colors.warning} size={28} />
            </View>
            <View style={styles.kpiContent}>
              <AppText variant="bodySmall" color={theme.colors.warning} weight="600" style={{ marginBottom: 4 }}>
                SYSTEM OVERVIEW
              </AppText>
              <AppText variant="h3">
                {stats.activeRoutes} Routes Active
              </AppText>
              <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 2 }}>
                Across {stats.totalCollectors} Collectors
              </AppText>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <AppCard style={styles.statBox} elevation="sm">
              <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.primary + '15', width: 40, height: 40, borderRadius: 20 }]}>
                 <Users color={theme.colors.primary} size={20} />
              </View>
              <AppText variant="h2">{stats.totalReports}</AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>Total Reports</AppText>
            </AppCard>
            
            <AppCard style={styles.statBox} elevation="sm">
              <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.status.pending + '15', width: 40, height: 40, borderRadius: 20 }]}>
                 <AlertTriangle color={theme.colors.status.pending} size={20} />
              </View>
              <AppText variant="h2">{stats.pendingReports}</AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>Pending</AppText>
            </AppCard>

            <AppCard style={styles.statBox} elevation="sm">
              <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.status.completed + '15', width: 40, height: 40, borderRadius: 20 }]}>
                 <CheckCircle color={theme.colors.status.completed} size={20} />
              </View>
              <AppText variant="h2">{stats.resolvedReports}</AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>Resolved</AppText>
            </AppCard>
            
            <AppCard style={styles.statBox} elevation="sm">
              <View style={[styles.kpiIconBox, { backgroundColor: theme.colors.secondary + '15', width: 40, height: 40, borderRadius: 20 }]}>
                 <Truck color={theme.colors.secondary} size={20} />
              </View>
              <AppText variant="h2">{stats.totalCollectors}</AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>Collectors</AppText>
            </AppCard>
          </View>
        </Animatable.View>
      )}

      {/* Create Assignment Button */}
      <Animatable.View animation="fadeInUp" delay={300}>
        <AppButton 
          title="Create New Assignment" 
          icon={<Plus color={theme.colors.surface} size={20} />}
          onPress={() => navigation.navigate('CreateAssignment')}
          style={{ marginBottom: theme.spacing.xl }}
        />
      </Animatable.View>

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <AppText variant="h3">Recent Assignments</AppText>
        <TouchableOpacity onPress={() => navigation.navigate('AdminTabs' as any, { screen: 'Assignments' })}>
          <AppText variant="bodySmall" color={theme.colors.primary} weight="600">See All</AppText>
        </TouchableOpacity>
      </View>

      {recentAssignments.map((assignment, index) => (
        <TouchableOpacity 
          key={assignment.id} 
          activeOpacity={0.7}
          onPress={() => navigation.navigate('AdminAssignmentDetails', { routeId: assignment.id })}
        >
          <AppCard style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View>
                <AppText variant="body" weight="600" style={styles.reportType}>{assignment.area} Street</AppText>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  Collector: {assignment.collectorId}
                </AppText>
              </View>
              <StatusBadge status={assignment.status as any} />
            </View>
            
            <View style={styles.infoRow}>
              <View style={styles.timeWrap}>
                <Clock color={theme.colors.textSecondary} size={14} />
                <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 6 }}>
                  Next Date: {assignment.collectionDate}
                </AppText>
              </View>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                Houses: {assignment.stops?.length || 0}
              </AppText>
            </View>
          </AppCard>
        </TouchableOpacity>
      ))}

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.xl,
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
  kpiHero: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.warning + '10',
    borderColor: theme.colors.warning + '30',
    borderWidth: 1,
    marginBottom: theme.spacing.lg,
  },
  kpiIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.warning + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.lg,
  },
  kpiContent: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  statBox: {
    width: '46%', // approximately half width
    marginHorizontal: '2%',
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    alignItems: 'flex-start',
  },
  statIcon: {
    marginBottom: theme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  reportCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportType: {
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  }
});
