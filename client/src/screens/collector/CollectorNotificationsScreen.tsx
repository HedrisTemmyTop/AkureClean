import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Bell, Map, AlertTriangle, CloudRain, CheckCircle } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { Notification } from '../../types';

export const CollectorNotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      // Re-using the same generic notification service but we can mock injected collector alerts 
      // dynamically if we want. For now we use whatever the service returns for this mock user.
      const data = await notificationService.getNotifications(user.id);
      
      // Inject dummy collector alerts dynamically since we didn't add them to mockData initially
      const collectorAlerts: Notification[] = [
        {
          id: 'col-notif1',
          userId: user.id,
          title: 'Heavy Traffic on Arakale',
          message: 'Expect 20min delays on your afternoon route due to market day.',
          date: new Date().toISOString(),
          type: 'System', // Reusing 'System' as a proxy for Traffic
          read: false
        },
        {
          id: 'col-notif2',
          userId: user.id,
          title: 'Route Assigned',
          message: 'You have been assigned to Obanla Ward for tomorrow.',
          date: new Date(Date.now() - 7200000).toISOString(),
          type: 'Reminder',
          read: true
        }
      ];

      setNotifications([...collectorAlerts, ...data].sort((a,b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handlePress = async (id: string, read: boolean) => {
    if (!read) {
      // Mocked read state
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const renderIcon = (title: string, type: string) => {
    if (title.includes('Traffic')) return <AlertTriangle color={theme.colors.warning} size={24} />;
    if (title.includes('Route')) return <Map color={theme.colors.primary} size={24} />;
    if (title.includes('Weather')) return <CloudRain color={theme.colors.info} size={24} />;
    if (type === 'Reminder') return <Bell color={theme.colors.secondary} size={24} />;
    return <CheckCircle color={theme.colors.success} size={24} />;
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const timeAgo = new Date(item.date).toLocaleDateString(undefined, { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    return (
      <TouchableOpacity 
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
        onPress={() => handlePress(item.id, item.read)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          {renderIcon(item.title, item.type)}
        </View>
        <View style={styles.contentContainer}>
          <AppText variant="body" weight={item.read ? '400' : '600'}>{item.title}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary} style={styles.message}>
            {item.message}
          </AppText>
          <AppText variant="caption" color={theme.colors.textSecondary} style={styles.date}>
            {timeAgo}
          </AppText>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer scrollable={false}>
      <View style={styles.header}>
        <AppText variant="h2">Alerts & Dispatches</AppText>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderNotification}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading ? (
             <AppText variant="body" color={theme.colors.textSecondary} align="center" style={styles.empty}>
               No alerts or dispatches at this time.
             </AppText>
          ) : null
        }
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.lg,
  },
  listContainer: {
    paddingBottom: theme.spacing.xl,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  unreadCard: {
    backgroundColor: theme.colors.primary + '05',
  },
  iconContainer: {
    marginRight: theme.spacing.md,
    paddingTop: theme.spacing.xs,
  },
  contentContainer: {
    flex: 1,
  },
  message: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  date: {
    marginTop: theme.spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginTop: theme.spacing.xs,
  },
  empty: {
    marginTop: 40,
  }
});
