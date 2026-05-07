import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { adminService } from '../../services/adminService';
import { CreditCard, User as UserIcon, Calendar } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export const AdminPaymentsScreen: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const data = await adminService.getAllPayments();
        setPayments(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadPayments();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => navigation.navigate('AdminPaymentDetails', { paymentData: item })}>
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <CreditCard color={theme.colors.success} size={20} />
          </View>
          <View style={styles.paymentInfo}>
            <AppText variant="body" weight="600">₦{item.amount}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>
              Ref: {item.paymentReference || 'N/A'}
            </AppText>
          </View>
          <View style={styles.statusBadge}>
            <AppText variant="caption" weight="600" color={theme.colors.success}>PAID</AppText>
          </View>
        </View>
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <UserIcon size={14} color={theme.colors.textSecondary} />
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 4 }}>
              {item.userId?.name || 'Unknown'}
            </AppText>
          </View>
          <View style={styles.detailItem}>
            <Calendar size={14} color={theme.colors.textSecondary} />
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 4 }}>
              {new Date(item.updatedAt).toLocaleDateString()}
            </AppText>
          </View>
        </View>
      </AppCard>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.headerTitle}>
        <AppText variant="h2">Payments</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          View all successful waste bill payments.
        </AppText>
      </View>
      
      {loading ? (
        <AppText variant="body" color={theme.colors.textSecondary}>Loading payments...</AppText>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item._id || item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={<AppText variant="body">No payments found.</AppText>}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    marginBottom: theme.spacing.xl,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.success + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  paymentInfo: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: theme.colors.success + '15',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
