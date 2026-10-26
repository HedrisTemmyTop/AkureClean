import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import {
  Megaphone,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Users,
  Send,
  X,
  Clock,
  Sparkles,
  ChevronLeft,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { theme } from '../../theme';
import { broadcastService, CreateBroadcastPayload } from '../../services/broadcastService';
import { Broadcast } from '../../types';

const TEMPLATES = [
  {
    title: 'Collection Delay Notice',
    message: 'Good day residents, our waste collection truck scheduled for today has experienced a temporary mechanical delay. Driver won\'t be coming today. Collections will take place tomorrow morning. Thank you for your patience.',
    priority: 'urgent' as const,
  },
  {
    title: 'Public Holiday Schedule',
    message: 'Notice to all residents: There will be no municipal waste collection on the upcoming public holiday. Normal collection operations will resume on the next working day.',
    priority: 'info' as const,
  },
  {
    title: 'Heavy Rain / Weather Advisory',
    message: 'Due to severe rainfall and flooding in parts of Akure, collection rounds are temporarily delayed today to protect road safety. Pickup will resume as soon as the weather clears.',
    priority: 'urgent' as const,
  },
  {
    title: 'Monthly Environmental Sanitation',
    message: 'Reminder: The state-wide environmental sanitation exercise takes place this Saturday from 7:00 AM to 10:00 AM. Please ensure your waste bags are securely tied and placed at designated points.',
    priority: 'normal' as const,
  },
];

export const AdminBroadcastScreen: React.FC = () => {
  const navigation = useNavigation();

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'info'>('normal');
  const [targetAudience, setTargetAudience] = useState<'all_residents' | 'all_users' | 'drivers'>('all_residents');

  const loadBroadcasts = async () => {
    try {
      const data = await broadcastService.getBroadcasts();
      setBroadcasts(data);
    } catch (err: any) {
      console.error('[Load Broadcasts Error]:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBroadcasts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBroadcasts();
    setRefreshing(false);
  };

  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setTitle(tmpl.title);
    setMessage(tmpl.message);
    setPriority(tmpl.priority);
  };

  const handleSendBroadcast = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please provide a title for the broadcast.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Validation Error', 'Please type the announcement message.');
      return;
    }

    Alert.alert(
      'Confirm Broadcast',
      `Are you sure you want to send this broadcast to ${
        targetAudience === 'all_residents' ? 'all registered residents' : 'selected users'
      }? They will receive in-app notifications and alerts immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Broadcast',
          style: 'default',
          onPress: async () => {
            try {
              setSubmitting(true);
              const payload: CreateBroadcastPayload = {
                title: title.trim(),
                message: message.trim(),
                priority,
                targetAudience,
              };
              await broadcastService.createBroadcast(payload);
              Alert.alert('Success', 'Broadcast message successfully dispatched to residents!');
              setModalVisible(false);
              setTitle('');
              setMessage('');
              setPriority('normal');
              loadBroadcasts();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Failed to dispatch broadcast');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = (id: string, broadcastTitle: string) => {
    Alert.alert(
      'Delete Broadcast',
      `Delete "${broadcastTitle}" from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await broadcastService.deleteBroadcast(id);
              setBroadcasts((prev) => prev.filter((b) => b.id !== id));
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete broadcast');
            }
          },
        },
      ]
    );
  };

  const renderPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return (
          <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
            <AlertTriangle size={12} color="#dc2626" />
            <AppText variant="caption" style={{ color: '#dc2626', fontWeight: '700', marginLeft: 4 }}>
              URGENT
            </AppText>
          </View>
        );
      case 'info':
        return (
          <View style={[styles.badge, { backgroundColor: '#e0f2fe' }]}>
            <Info size={12} color="#0284c7" />
            <AppText variant="caption" style={{ color: '#0284c7', fontWeight: '700', marginLeft: 4 }}>
              INFO
            </AppText>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
            <Megaphone size={12} color="#16a34a" />
            <AppText variant="caption" style={{ color: '#16a34a', fontWeight: '700', marginLeft: 4 }}>
              NOTICE
            </AppText>
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: Broadcast }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {renderPriorityBadge(item.priority)}
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 8 }}>
              {formattedDate}
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.title)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <AppText variant="h3" style={styles.cardTitle}>
          {item.title}
        </AppText>

        <AppText variant="body" color="#334155" style={styles.cardMessage}>
          {item.message}
        </AppText>

        <View style={styles.cardFooter}>
          <View style={styles.recipientInfo}>
            <Users size={14} color={theme.colors.textSecondary} />
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 6 }}>
              Dispatched to {item.recipientsCount} recipient(s) •{' '}
              {item.targetAudience === 'all_residents' ? 'All Residents' : item.targetAudience}
            </AppText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ScreenContainer scrollable={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View>
            <AppText variant="h2">Resident Broadcasts</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Send urgent notices & announcements to all residents
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newBroadcastBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Plus size={18} color="#fff" />
          <AppText variant="body" weight="600" color="#fff" style={{ marginLeft: 6 }}>
            New Message
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Broadcasts List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 12 }}>
            Loading broadcast announcements...
          </AppText>
        </View>
      ) : (
        <FlatList
          data={broadcasts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Megaphone size={36} color={theme.colors.primary} />
              </View>
              <AppText variant="h3" style={{ marginTop: 16 }}>
                No Broadcasts Sent Yet
              </AppText>
              <AppText
                variant="body"
                color={theme.colors.textSecondary}
                align="center"
                style={{ marginTop: 8, paddingHorizontal: 24 }}
              >
                Tap "New Message" above to broadcast an important notice (e.g. driver delay, holiday
                advisory) to residents' inboxes.
              </AppText>
            </View>
          }
        />
      )}

      {/* New Broadcast Compose Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalRoot}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <AppText variant="h2">Compose Broadcast</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                Dispatches immediately to residents' notifications & inbox
              </AppText>
            </View>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeBtn}
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Quick Templates */}
            <View style={styles.sectionHeader}>
              <Sparkles size={16} color={theme.colors.primary} />
              <AppText variant="bodySmall" weight="600" color={theme.colors.primary} style={{ marginLeft: 6 }}>
                Quick Templates
              </AppText>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll}>
              {TEMPLATES.map((tmpl, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.templatePill}
                  onPress={() => handleApplyTemplate(tmpl)}
                  activeOpacity={0.7}
                >
                  <AppText variant="caption" weight="600" color="#1e293b">
                    {tmpl.title}
                  </AppText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Target Audience */}
            <AppText variant="bodySmall" weight="600" style={styles.fieldLabel}>
              Target Audience
            </AppText>
            <View style={styles.pillRow}>
              {[
                { label: 'All Residents', value: 'all_residents' },
                { label: 'All App Users', value: 'all_users' },
                { label: 'Drivers Only', value: 'drivers' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.audiencePill,
                    targetAudience === opt.value && styles.audiencePillActive,
                  ]}
                  onPress={() => setTargetAudience(opt.value as any)}
                >
                  <AppText
                    variant="caption"
                    weight={targetAudience === opt.value ? '600' : '400'}
                    color={targetAudience === opt.value ? theme.colors.primary : '#64748b'}
                  >
                    {opt.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Priority Selector */}
            <AppText variant="bodySmall" weight="600" style={styles.fieldLabel}>
              Priority Level
            </AppText>
            <View style={styles.pillRow}>
              {[
                { label: 'Normal Notice', value: 'normal', color: '#16a34a' },
                { label: 'Urgent Alert', value: 'urgent', color: '#dc2626' },
                { label: 'Information', value: 'info', color: '#0284c7' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.priorityPill,
                    priority === opt.value && { borderColor: opt.color, backgroundColor: `${opt.color}15` },
                  ]}
                  onPress={() => setPriority(opt.value as any)}
                >
                  <AppText
                    variant="caption"
                    weight={priority === opt.value ? '700' : '500'}
                    style={{ color: priority === opt.value ? opt.color : '#64748b' }}
                  >
                    {opt.label}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Title Field */}
            <AppText variant="bodySmall" weight="600" style={styles.fieldLabel}>
              Broadcast Title
            </AppText>
            <TextInput
              style={styles.input}
              placeholder="e.g. Driver Won't Be Coming Today / Schedule Delay"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
            />

            {/* Message Body Field */}
            <AppText variant="bodySmall" weight="600" style={styles.fieldLabel}>
              Announcement Message
            </AppText>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Type your message clearly to residents..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
            />

            {/* Hint Box */}
            <View style={styles.hintCard}>
              <Info size={16} color="#0284c7" />
              <AppText variant="caption" color="#0369a1" style={{ marginLeft: 8, flex: 1 }}>
                This message will be dispatched immediately to all matching residents' inboxes and send
                mobile push notifications.
              </AppText>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <AppText variant="body" color="#64748b">
                Cancel
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSendBroadcast}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Send size={18} color="#fff" />
                  <AppText variant="body" weight="600" color="#fff" style={{ marginLeft: 8 }}>
                    Send Broadcast Now
                  </AppText>
                </>
              )}
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
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  newBroadcastBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardTitle: {
    color: '#0f172a',
    marginBottom: 8,
  },
  cardMessage: {
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Modal Styles
  modalRoot: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  modalBody: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  templatesScroll: {
    marginBottom: 16,
  },
  templatePill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  fieldLabel: {
    color: '#334155',
    marginBottom: 8,
    marginTop: 12,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  audiencePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  audiencePillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#ecfdf5',
  },
  priorityPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 120,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    marginBottom: 30,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
});
