import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { MapPin, Calendar, ChevronRight } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CollectorStackParamList } from '../../navigation/RoleNavigator';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { StatusBadge } from '../../components/StatusBadge';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { reportService } from '../../services/reportService';
import { WasteRequest } from '../../types';

export const RequestedPickupsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  const [requests, setRequests] = useState<WasteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = async () => {
    try {
      // In a real app, this would fetch Pending requests for the collector's assigned area.
      // Here we mock by getting all reports and filtering for Pending.
      const data = await reportService.getAllReports();
      const pending = data.filter(r => r.status === 'Pending' && r.preferredDate);
      setRequests(pending);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
  };

  const renderItem = ({ item, index }: { item: WasteRequest, index: number }) => {
    const delay = Math.min(index * 100, 1000) + 200;
    const dateStr = item.preferredDate ? new Date(item.preferredDate).toLocaleDateString() : 'N/A';

    return (
      <AppCard style={styles.card} animation="fadeInUp" delay={delay}>
        <View style={styles.cardHeader}>
          <AppText variant="h3">{item.type} Waste</AppText>
          <StatusBadge status={item.status} />
        </View>

        <View style={styles.detailRow}>
          <MapPin color={theme.colors.textSecondary} size={16} />
          <AppText variant="bodySmall" color={theme.colors.textSecondary} style={styles.detailText}>
            {item.street} {item.landmark && `(${item.landmark})`}
          </AppText>
        </View>

        {item.preferredDate && (
          <View style={styles.detailRow}>
            <Calendar color={theme.colors.textSecondary} size={16} />
            <AppText variant="bodySmall" color={theme.colors.textSecondary} style={styles.detailText}>
              Requested: {dateStr}
            </AppText>
          </View>
        )}

        <View style={styles.notesContainer}>
          <AppText variant="bodySmall" style={styles.notesText}>"{item.notes}"</AppText>
        </View>

        <View style={styles.actionRow}>
          <AppButton 
            title="Review Request" 
            style={[styles.actionBtn] as any}
            icon={<ChevronRight color={theme.colors.surface} size={18} />}
            onPress={() => (navigation as any).navigate('RequestDetails', { requestId: item.id })}
          />
        </View>
      </AppCard>
    );
  };

  return (
    <ScreenContainer>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h2">Ad-hoc Requests</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          Review missed-schedule pickup requests in your area.
        </AppText>
      </Animatable.View>

      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          !loading ? (
             <View style={styles.emptyState}>
               <AppText variant="body" color={theme.colors.textSecondary} align="center">
                 No pending requests at the moment.
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
    marginBottom: theme.spacing.lg,
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
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  detailText: {
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  notesContainer: {
    backgroundColor: theme.colors.border + '30',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  notesText: {
    fontStyle: 'italic',
    color: theme.colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
