import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Bell,
  AlertCircle,
  CheckCircle,
  Info,
  Megaphone,
  CheckCheck,
  AlertTriangle,
  X,
  Clock,
  Sparkles,
} from 'lucide-react-native';

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
  const [activeFilter, setActiveFilter] = useState<'all' | 'broadcast' | 'system'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

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

  const handlePress = async (item: Notification) => {
    setSelectedNotification(item);
    if (!item.read) {
      await notificationService.markAsRead(item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'broadcast') return n.type === 'Broadcast';
    if (activeFilter === 'system') return n.type !== 'Broadcast';
    return true;
  });

  const renderIcon = (item: Notification) => {
    if (item.type === 'Broadcast') {
      const isUrgent = item.priority === 'urgent';
      return (
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: isUrgent ? '#fee2e2' : '#ecfdf5' },
          ]}
        >
          {isUrgent ? (
            <AlertTriangle color="#dc2626" size={20} />
          ) : (
            <Megaphone color="#059669" size={20} />
          )}
        </View>
      );
    }

    switch (item.type) {
      case 'Reminder':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
            <Bell color="#d97706" size={20} />
          </View>
        );
      case 'StatusUpdate':
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#ecfdf5' }]}>
            <CheckCircle color={theme.colors.primary} size={20} />
          </View>
        );
      case 'System':
      default:
        return (
          <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
            <Info color="#0284c7" size={20} />
          </View>
        );
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const isBroadcast = item.type === 'Broadcast';
    const isUrgent = item.priority === 'urgent';
    const timeAgo = new Date(item.date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.read && styles.unreadCard,
          isBroadcast && styles.broadcastCard,
          isBroadcast && isUrgent && styles.urgentCard,
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>{renderIcon(item)}</View>

        <View style={styles.contentContainer}>
          <View style={styles.cardHeaderRow}>
            {isBroadcast ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: isUrgent ? '#fee2e2' : '#dcfce7' },
                ]}
              >
                <AppText
                  variant="caption"
                  weight="700"
                  style={{ color: isUrgent ? '#dc2626' : '#15803d', fontSize: 10 }}
                >
                  {isUrgent ? 'URGENT ANNOUNCEMENT' : 'ANNOUNCEMENT'}
                </AppText>
              </View>
            ) : null}

            <AppText variant="caption" color={theme.colors.textSecondary} style={styles.date}>
              {timeAgo}
            </AppText>
          </View>

          <AppText
            variant="body"
            weight={item.read ? '500' : '700'}
            style={[styles.cardTitle, isBroadcast && isUrgent && { color: '#991b1b' }]}
            numberOfLines={1}
          >
            {item.title}
          </AppText>

          <AppText
            variant="bodySmall"
            color="#475569"
            style={styles.message}
            numberOfLines={2}
          >
            {item.message}
          </AppText>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer scrollable={false}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View>
            <AppText variant="h2">Inbox & Alerts</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Official notices, driver alerts & collection updates
            </AppText>
          </View>

          {unreadCount > 0 ? (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              style={styles.markAllReadBtn}
              activeOpacity={0.7}
            >
              <CheckCheck size={16} color={theme.colors.primary} />
              <AppText variant="caption" weight="600" color={theme.colors.primary} style={{ marginLeft: 4 }}>
                Read all
              </AppText>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'All Messages' },
            { key: 'broadcast', label: '📢 Announcements' },
            { key: 'system', label: 'Pickups & System' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                activeFilter === tab.key && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter(tab.key as any)}
            >
              <AppText
                variant="caption"
                weight={activeFilter === tab.key ? '700' : '500'}
                color={activeFilter === tab.key ? theme.colors.primary : '#64748b'}
              >
                {tab.label}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        data={filteredNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Megaphone size={32} color={theme.colors.primary} />
              </View>
              <AppText variant="h3" style={{ marginTop: 14 }}>
                No Messages in Inbox
              </AppText>
              <AppText
                variant="bodySmall"
                color={theme.colors.textSecondary}
                align="center"
                style={{ marginTop: 6, paddingHorizontal: 30 }}
              >
                Official announcements and notices from Akure Clean administration will appear here.
              </AppText>
            </View>
          ) : undefined
        }
      />

      {/* Message Reader Modal */}
      <Modal
        visible={Boolean(selectedNotification)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedNotification(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.readerCard}>
            <View style={styles.readerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {selectedNotification?.type === 'Broadcast' ? (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          selectedNotification.priority === 'urgent' ? '#fee2e2' : '#dcfce7',
                        marginRight: 8,
                      },
                    ]}
                  >
                    <AppText
                      variant="caption"
                      weight="700"
                      style={{
                        color:
                          selectedNotification.priority === 'urgent' ? '#dc2626' : '#15803d',
                      }}
                    >
                      {selectedNotification.priority === 'urgent'
                        ? 'URGENT NOTICE'
                        : 'OFFICIAL NOTICE'}
                    </AppText>
                  </View>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={() => setSelectedNotification(null)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <AppText variant="h3" style={{ color: '#0f172a', marginBottom: 8 }}>
                {selectedNotification?.title}
              </AppText>

              <View style={styles.readerMetaRow}>
                <Clock size={12} color="#94a3b8" />
                <AppText variant="caption" color="#94a3b8" style={{ marginLeft: 4 }}>
                  {selectedNotification
                    ? new Date(selectedNotification.date).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : ''}
                </AppText>
              </View>

              <AppText variant="body" color="#334155" style={styles.readerBody}>
                {selectedNotification?.message}
              </AppText>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeActionBtn}
              onPress={() => setSelectedNotification(null)}
              activeOpacity={0.8}
            >
              <AppText variant="body" weight="600" color="#fff">
                Got it
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  markAllReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterChipActive: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'flex-start',
  },
  unreadCard: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  broadcastCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  urgentCard: {
    borderLeftColor: '#dc2626',
    backgroundColor: '#fff5f5',
  },
  iconContainer: {
    marginRight: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardTitle: {
    color: '#0f172a',
    marginBottom: 4,
  },
  message: {
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
    marginTop: 6,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Reader Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  readerCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  readerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
  },
  readerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  readerBody: {
    lineHeight: 22,
    fontSize: 15,
  },
  closeActionBtn: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});
