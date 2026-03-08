import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { WasteRequest, RequestStatus } from '../../types';
import { ResidentStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<ResidentStackParamList, 'ResidentTabs'>;

const ALL_STATUS = 'All';
const STATUS_FILTERS: (RequestStatus | typeof ALL_STATUS)[] = [
  ALL_STATUS, 'Pending', 'Payment Pending', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'
];

export const MyReportsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [reports, setReports] = useState<WasteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | typeof ALL_STATUS>(ALL_STATUS);

  const loadReports = async () => {
    if (!user) return;
    try {
      const data = await reportService.getReportsByResident(user.id);
      // Sort by date descending
      data.sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime());
      setReports(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.street?.toLowerCase().includes(search.toLowerCase()) || 
                          r.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === ALL_STATUS || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const renderReportItem = ({ item, index }: { item: WasteRequest, index: number }) => {
    const dateStr = new Date(item.requestedDate).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    
    // Stagger animation delay up to index 10 to avoid performance hits
    const delay = Math.min(index * 100, 1000) + 300; 

    return (
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('ReportDetails', { reportId: item.id })}
      >
        <AppCard style={styles.card} elevation="sm" animation="fadeInUp" delay={delay}>
          <View style={styles.cardHeader}>
            <StatusBadge status={item.status} />
            <AppText variant="caption" color={theme.colors.textSecondary}>{dateStr}</AppText>
          </View>
          <AppText variant="h3" style={styles.cardTitle}>{item.type} Waste</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary} numberOfLines={1}>
            {item.street} {item.landmark && `(${item.landmark})`}
          </AppText>
          <AppText variant="bodySmall" style={styles.notes} numberOfLines={2}>
            {item.notes}
          </AppText>
          
          {item.status === 'Payment Pending' && (
            <View style={styles.paymentActionContainer}>
              <AppButton 
                title="Pay Now" 
                size="small" 
                onPress={() => navigation.navigate('Payment', { reportId: item.id })}
                style={{ marginTop: theme.spacing.sm }}
              />
            </View>
          )}
        </AppCard>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h2">My Reports</AppText>
      </Animatable.View>

      <Animatable.View animation="fadeIn" delay={200}>
        <AppInput 
          placeholder="Search by street or notes..." 
          value={search}
          onChangeText={setSearch}
        />
      </Animatable.View>

      <Animatable.View animation="fadeIn" delay={300}>
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {STATUS_FILTERS.map(status => (
              <TouchableOpacity 
                key={status}
                style={[
                  styles.filterChip, 
                  statusFilter === status && styles.filterChipActive
                ]}
                onPress={() => setStatusFilter(status)}
              >
                <AppText 
                  variant="caption" 
                  weight={statusFilter === status ? '600' : '400'}
                  color={statusFilter === status ? theme.colors.primary : theme.colors.textSecondary}
                >
                  {status}
                </AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Animatable.View>

      <FlatList
        data={filteredReports}
        keyExtractor={item => item.id}
        renderItem={renderReportItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
             <View style={styles.emptyState}>
               <AppText variant="body" color={theme.colors.textSecondary} align="center">
                 No reports found matching your criteria.
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
  filtersContainer: {
    marginBottom: theme.spacing.md,
    marginHorizontal: -theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.border + '50',
    marginRight: theme.spacing.sm,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
    borderWidth: 1,
    paddingVertical: theme.spacing.sm - 1, // adjustment for border
    paddingHorizontal: theme.spacing.md - 1,
  },
  listContainer: {
    paddingBottom: theme.spacing.xxl,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  cardTitle: {
    marginBottom: theme.spacing.xs,
  },
  notes: {
    marginTop: theme.spacing.xs,
    fontStyle: 'italic',
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentActionContainer: {
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  }
});
