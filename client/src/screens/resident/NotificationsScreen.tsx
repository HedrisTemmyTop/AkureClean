import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Bell, AlertCircle, CheckCircle, Info } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { Notification } from '../../types';

export const NotificationsScreen: React.FC = () => {
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await notificationService.getNotifications(user.id);
      setNotifications(data);
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
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const renderIcon = (type: Notification['type']) => {
    switch (type) {
      case 'Reminder': return <Bell color={theme.colors.secondary} size={24} />;
      case 'StatusUpdate': return <CheckCircle color={theme.colors.primary} size={24} />;
      case 'System': return <Info color={theme.colors.info} size={24} />;
      default: return <AlertCircle color={theme.colors.warning} size={24} />;
    }
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
          {renderIcon(item.type)}
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
        <AppText variant="h2">Notifications</AppText>
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
               No notifications.
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
    backgroundColor: theme.colors.primary + '05', // Very faint primary background
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
