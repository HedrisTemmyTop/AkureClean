import React, { useEffect, useState } from 'react';
import { Alert, View, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Truck, FileText, Calendar, Bell, List, LogOut, AlertTriangle } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { scheduleService } from '../../services/scheduleService';
import { ResidentStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<ResidentStackParamList, 'ResidentTabs'>;

export const ResidentDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [activeReports, setActiveReports] = useState(0);
  const [resolvedReports, setResolvedReports] = useState(0);
  const [nextCollectionDay, setNextCollectionDay] = useState('Loading...');
  const [refreshing, setRefreshing] = useState(false);

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

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      const reports = await reportService.getReportsByResident(user.id);
      setActiveReports(reports.filter(r => r.status !== 'Completed' && r.status !== 'Cancelled').length);
      setResolvedReports(reports.filter(r => r.status === 'Completed').length);

      if (user.locationId) {
        const schedules = await scheduleService.getSchedulesByLocation(user.locationId);
        if (schedules.length > 0) {
          // just taking the first schedule for mock purposes
          setNextCollectionDay(schedules[0].dayOfWeek);
        } else {
          setNextCollectionDay('Not Assigned');
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  return (
    <ScreenContainer scrollable scrollViewProps={{
      refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }}>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <AppText variant="h2">Hello, {user?.name}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Resident Dashboard
            </AppText>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <LogOut color={theme.colors.status.cancelled} size={22} />
          </TouchableOpacity>
        </View>
      </Animatable.View>

      <Animatable.View animation="fadeIn" delay={150}>
        <TouchableOpacity onPress={() => navigation.navigate('ResidentTabs' as any, { screen: 'Waste Bill' })}>
          <View style={styles.alertCard}>
            <Calendar color={theme.colors.primary} size={24} style={{ marginRight: theme.spacing.md }} />
            <View style={{ flex: 1 }}>
              <AppText variant="body" weight="600" color={theme.colors.primary}>
                View Waste Bill
              </AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                Manage your regular subscription payments.
              </AppText>
            </View>
          </View>
        </TouchableOpacity>
      </Animatable.View>

      <AppCard style={styles.statusCard} elevation="md" animation="fadeInUp" delay={200}>
        <View style={styles.statusRow}>
          <View>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Next Collection</AppText>
            <AppText variant="h3" color={theme.colors.primary}>{nextCollectionDay}</AppText>
          </View>
          <Truck color={theme.colors.primary} size={32} />
        </View>
        <View style={styles.divider} />
        <AppText variant="caption" color={theme.colors.textSecondary}>
          Ensure your waste bins are placed outside by 7:00 AM on collection day.
        </AppText>
      </AppCard>

      <View style={styles.statsRow}>
        <AppCard style={styles.statCard} padded animation="zoomIn" delay={300}>
          <AppText variant="h2" color={theme.colors.status.active}>{activeReports}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>Active Reports</AppText>
        </AppCard>
        <AppCard style={styles.statCard} padded animation="zoomIn" delay={400}>
          <AppText variant="h2" color={theme.colors.status.completed}>{resolvedReports}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>Resolved</AppText>
        </AppCard>
      </View>

      <Animatable.Text animation="fadeIn" delay={500}>
        <AppText variant="h3" style={styles.sectionTitle}>Quick Actions</AppText>
      </Animatable.Text>
      
      <View style={styles.grid}>
        <Animatable.View animation="fadeInUp" delay={600} style={styles.gridItem}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ReportWaste')}
            activeOpacity={0.8}
            style={{flex: 1}}
          >
            <AppCard elevation="sm" style={styles.gridCard}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.colors.status.pending + '20' }]}>
                <FileText color={theme.colors.status.pending} size={24} />
              </View>
              <AppText variant="bodySmall" weight="600" style={styles.gridText}>Report Waste</AppText>
            </AppCard>
          </TouchableOpacity>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={700} style={styles.gridItem}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ResidentTabs' as any, { screen: 'Reports' })}
            activeOpacity={0.8}
            style={{flex: 1}}
          >
            <AppCard elevation="sm" style={styles.gridCard}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.colors.primary + '20' }]}>
                <List color={theme.colors.primary} size={24} />
              </View>
              <AppText variant="bodySmall" weight="600" style={styles.gridText}>My Reports</AppText>
            </AppCard>
          </TouchableOpacity>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={800} style={styles.gridItem}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ResidentTabs' as any, { screen: 'Waste Bill' })}
            activeOpacity={0.8}
            style={{flex: 1}}
          >
            <AppCard elevation="sm" style={styles.gridCard}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.colors.secondary + '20' }]}>
                <Calendar color={theme.colors.secondary} size={24} />
              </View>
              <AppText variant="bodySmall" weight="600" style={styles.gridText}>Waste Bill</AppText>
            </AppCard>
          </TouchableOpacity>
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={900} style={styles.gridItem}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ResidentTabs' as any, { screen: 'Alerts' })}
            activeOpacity={0.8}
            style={{flex: 1}}
          >
            <AppCard elevation="sm" style={styles.gridCard}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.colors.status.cancelled + '20' }]}>
                <Bell color={theme.colors.status.cancelled} size={24} />
              </View>
              <AppText variant="bodySmall" weight="600" style={styles.gridText}>Notifications</AppText>
            </AppCard>
          </TouchableOpacity>
        </Animatable.View>
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
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary + '30',
    borderWidth: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  statusCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -theme.spacing.xs,
    marginBottom: theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.xs,
  },
  gridItem: {
    width: '50%',
    padding: theme.spacing.xs,
  },
  gridCard: {
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  iconWrapper: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    marginBottom: theme.spacing.sm,
  },
  gridText: {
    textAlign: 'center',
  },
});
