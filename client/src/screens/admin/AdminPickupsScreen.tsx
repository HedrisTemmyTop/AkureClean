import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../theme';
import { pickupService, PickupRequestData } from '../../services/pickupService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Filter, Search } from 'lucide-react-native';

const TABS = ['Active', 'Pending', 'Resolved', 'Completed'];

export const AdminPickupsScreen: React.FC = () => {
  const [pickups, setPickups] = useState<PickupRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Active');
  
  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState(new Date());
  
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

  const loadPickups = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const data = await pickupService.getAllPickups({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      setPickups(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadPickups();
  }, []);

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentMode = showPicker;
    setShowPicker(Platform.OS === 'ios' ? currentMode : null);
    if (selectedDate) {
      if (currentMode === 'start') {
        setStartDate(selectedDate);
      } else if (currentMode === 'end') {
        setEndDate(selectedDate);
      }
    }
  };

  const filteredPickups = pickups.filter(r => {
    // Filter by Tab (case insensitive mapping)
    const status = (r.status || 'pending').toLowerCase();
    
    if (activeTab === 'Pending') return status === 'pending';
    if (activeTab === 'Active') return ['scheduled', 'in progress', 'payment pending', 'accepted'].includes(status);
    if (activeTab === 'Resolved' || activeTab === 'Completed') return status === 'completed';
    return true;
  });

  const renderItem = ({ item }: { item: any }) => (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText variant="body" weight="600" style={styles.cardTitle}>{item.address || item.userId?.address}</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>
            {item.type} - {new Date(item.createdAt || item.requestedDate).toLocaleDateString()}
          </AppText>
        </View>
        <StatusBadge status={item.status as any} />
      </View>
      {item.notes ? (
        <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginTop: 8 }}>
          {item.notes}
        </AppText>
      ) : null}
    </AppCard>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.pageHeader}>
        <AppText variant="h2">All Pickups</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          Filter and view waste pickups.
        </AppText>
      </View>

      <View style={styles.dateFilterContainer}>
        <View style={styles.dateFilterRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker('start')}>
            <Calendar size={16} color={theme.colors.primary} />
            <AppText variant="bodySmall" style={styles.dateText}>
              From: {startDate.toLocaleDateString()}
            </AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowPicker('end')}>
            <Calendar size={16} color={theme.colors.primary} />
            <AppText variant="bodySmall" style={styles.dateText}>
              To: {endDate.toLocaleDateString()}
            </AppText>
          </TouchableOpacity>
        </View>
        
        <AppButton 
          title="Apply Date Filter" 
          onPress={loadPickups} 
          icon={<Search size={16} color={theme.colors.surface} />}
          style={{ marginTop: theme.spacing.sm }}
        />
        
        {showPicker && (
          <DateTimePicker
            value={showPicker === 'start' ? startDate : endDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>

      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.tab, activeTab === item && styles.activeTab]}
              onPress={() => setActiveTab(item)}
            >
              <AppText 
                variant="bodySmall" 
                weight={activeTab === item ? '700' : '400'}
                color={activeTab === item ? theme.colors.surface : theme.colors.textSecondary}
              >
                {item}
              </AppText>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <AppText variant="body" color={theme.colors.textSecondary}>Loading pickups...</AppText>
      ) : (
        <FlatList
          data={filteredPickups}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Filter color={theme.colors.textSecondary} size={32} style={{ marginBottom: 8 }} />
              <AppText variant="body" color={theme.colors.textSecondary}>
                No pickups found for these filters.
              </AppText>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: theme.spacing.lg,
  },
  dateFilterContainer: {
    marginBottom: theme.spacing.md,
  },
  dateFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
  },
  dateText: {
    marginLeft: 8,
  },
  tabsContainer: {
    marginBottom: theme.spacing.lg,
  },
  tab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  }
});
