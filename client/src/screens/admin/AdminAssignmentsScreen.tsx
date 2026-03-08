import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Map, Truck, Home, Plus, ChevronRight } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../theme';
import { routeService } from '../../services/routeService';
import { collectorService } from '../../services/collectorService';
import { AssignmentRoute } from '../../types';
import { AdminStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList, 'AdminTabs'>;

export const AdminAssignmentsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [assignments, setAssignments] = useState<AssignmentRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAssignments = async () => {
    try {
      // In a real app we would fetch all active routes across all collectors.
      // Here we mock by fetching routes for mock_col_1 (our dummy data guy)
      const data = await routeService.getAssignments('mock_col_1');
      setAssignments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAssignments();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: AssignmentRoute }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('AdminAssignmentDetails', { routeId: item.id })}
    >
      <AppCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <AppText variant="body" weight="600" style={{ marginBottom: 4 }}>{item.area} Street</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              Collector: {item.collectorId}
            </AppText>
          </View>
          <StatusBadge status={item.status as any} />
        </View>

        <View style={styles.infoRow}>
          <Map color={theme.colors.textSecondary} size={16} />
          <AppText variant="bodySmall" color={theme.colors.textSecondary} style={styles.infoText}>
            {item.title}
          </AppText>
        </View>

        <View style={styles.footerRow}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            Next: {item.collectionDate}
          </AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {item.stops?.length || 0} Houses
          </AppText>
        </View>
      </AppCard>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer scrollable={false}>
      <View style={styles.header}>
        <AppText variant="h1">Assignments</AppText>
        <TouchableOpacity 
          style={styles.createBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreateAssignment')}
        >
          <View style={styles.createBtnIcon}>
            <Plus color={theme.colors.surface} size={18} />
          </View>
          <AppText variant="bodySmall" weight="600" color={theme.colors.surface}>
            New Assignment
          </AppText>
        </TouchableOpacity>
      </View>

      <FlatList
        data={assignments}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  list: {
    paddingBottom: theme.spacing.xl,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    marginLeft: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.round,
    ...theme.shadows.sm,
  },
  createBtnIcon: {
    marginRight: 6,
  }
});
