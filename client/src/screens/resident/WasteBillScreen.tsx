import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreditCard, CheckCircle, Clock, Info, Home, Briefcase, Building2 } from 'lucide-react-native';
import { ResidentStackParamList } from '../../navigation/RoleNavigator';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { billService, Bill } from '../../services/billService';
import { parseApiError } from '../../services/api';

export const WasteBillScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ResidentStackParamList>>();
  const isFocused = useIsFocused();
  
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBills = async () => {
    try {
      const data = await billService.getMyBills();
      setBills(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchBills();
    }
  }, [isFocused]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  const getMonthName = (monthNum: number) => {
    return new Date(2000, monthNum - 1).toLocaleString('default', { month: 'long' });
  };

  const getBillingBreakdown = () => {
    if (!user) return null;
    if (user.houseType === 'Residential building') {
      return `${user.numberOfRooms} rooms × ₦2,000`;
    }
    if (user.houseType === 'Shop') {
      return `${user.numberOfShops} shops × ₦3,000`;
    }
    if (user.houseType === 'Company') {
      return `Rate for ${user.numberOfWorkersRange}`;
    }
    return 'Standard Base Rate';
  };

  const getHouseTypeIcon = () => {
    if (user?.houseType === 'Residential building') return <Home color={theme.colors.primary} size={20} />;
    if (user?.houseType === 'Shop') return <Briefcase color={theme.colors.secondary} size={20} />;
    if (user?.houseType === 'Company') return <Building2 color={theme.colors.warning} size={20} />;
    return <Info color={theme.colors.primary} size={20} />;
  };

  const getMonthsOverdue = () => {
    if (!currentBill || !user) return 0;
    const rate = (user.houseType === 'Residential building' ? (user.numberOfRooms || 0) * 2000 : 
                 user.houseType === 'Shop' ? (user.numberOfShops || 0) * 3000 : 
                 user.numberOfWorkersRange === '0-10 workers' ? 10000 :
                 user.numberOfWorkersRange === '11-50 workers' ? 45000 :
                 user.numberOfWorkersRange === '51-100 workers' ? 90000 :
                 user.numberOfWorkersRange === '101-500 workers' ? 350000 :
                 user.numberOfWorkersRange === '500+ workers' ? 600000 : 2000);
    return Math.round(currentBill.amount / rate);
  };

  const currentBill = bills.find(b => b.status === 'unpaid');
  const pastBills = bills.filter(b => b.status === 'paid');

  const handlePayment = async () => {
    if (!currentBill) return;
    
    navigation.navigate('PaystackCheckout', {
      amount: currentBill.amount,
      metadata: {
        type: 'monthly_bill',
        billId: currentBill.id,
        userId: user?.id,
      },
      onSuccess: () => {
        Alert.alert('Payment Successful', 'Your waste bill has been paid.');
        fetchBills();
      },
      onCancel: () => {
        Alert.alert('Payment Cancelled', 'You cancelled the payment process.');
      }
    });
  };

  if (loading) {
    return (
      <View style={[styles.header, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer scrollable scrollViewProps={{
      refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    }}>
      <View style={styles.header}>
        <AppText variant="h1">Waste Bill</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Manage your regular waste payments.
        </AppText>
      </View>

      {/* Current Bill Section */}
      <View>
        <AppCard style={styles.currentBillCard} elevation="md">
          {currentBill ? (
            <>
              <View style={styles.billHeader}>
                <AppText variant="bodyLarge" weight="600" color={theme.colors.primary}>
                  Current Bill
                </AppText>
                <View style={[styles.statusBadge, { backgroundColor: theme.colors.warning + '15' }]}>
                  <AppText variant="caption" weight="600" color={theme.colors.warning}>UNPAID</AppText>
                </View>
              </View>

              <AppText variant="h1" style={styles.amount}>₦{currentBill.amount.toLocaleString()}</AppText>
              
              <View style={styles.billDetailRow}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>Outstanding Months:</AppText>
                <AppText variant="bodySmall" weight="600">{getMonthsOverdue()} Month(s)</AppText>
              </View>

              <View style={styles.breakdownBox}>
                <View style={styles.breakdownHeader}>
                  {getHouseTypeIcon()}
                  <AppText variant="bodySmall" weight="600" style={{ marginLeft: 8 }}>
                    {user?.houseType || 'General Waste'}
                  </AppText>
                </View>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {getBillingBreakdown()} × {getMonthsOverdue()} months
                </AppText>
              </View>
              
              <View style={styles.billDetailRow}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>Generated:</AppText>
                <AppText variant="bodySmall" weight="600">
                  {new Date(currentBill.createdAt).toLocaleDateString()}
                </AppText>
              </View>

              <AppButton 
                title="Pay with Paystack" 
                fullWidth 
                style={styles.payBtn}
                loading={paying}
                icon={<CreditCard color={theme.colors.surface} size={18} />}
                onPress={handlePayment}
              />
            </>
          ) : (
            <View style={styles.allPaidContainer}>
              <CheckCircle color={theme.colors.success} size={48} />
              <AppText variant="h3" style={{ marginTop: 16 }}>All Caught Up!</AppText>
              <AppText variant="bodySmall" color={theme.colors.textSecondary} align="center" style={{ marginTop: 8 }}>
                You have no outstanding bills for this period.
              </AppText>
            </View>
          )}
        </AppCard>
      </View>

      {/* Payment History */}
      <View style={styles.historySection}>
        <AppText variant="h3" style={styles.sectionTitle}>Payment History</AppText>
        
        {pastBills.length === 0 ? (
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>No payment history.</AppText>
        ) : (
          pastBills.map((bill) => (
            <TouchableOpacity 
              key={bill.id} 
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TransactionDetails' as any, { billId: bill.id })}
            >
              <AppCard style={styles.historyCard}>
                <View style={styles.historyCardLeft}>
                  <View style={styles.historyIconBox}>
                    <Clock color={theme.colors.success} size={20} />
                  </View>
                  <View>
                    <AppText variant="body" weight="600">{getMonthName(bill.month)} {bill.year}</AppText>
                    <AppText variant="caption" color={theme.colors.textSecondary}>
                      Paid {bill.paidAt ? new Date(bill.paidAt).toLocaleDateString() : ''}
                    </AppText>
                  </View>
                </View>
                <AppText variant="body" weight="600">₦{bill.amount.toLocaleString()}</AppText>
              </AppCard>
            </TouchableOpacity>
          ))
        )}
      </View>

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  currentBillCard: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.round,
  },
  amount: {
    fontSize: 42,
    marginBottom: theme.spacing.xl,
  },
  billDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  payBtn: {
    marginTop: theme.spacing.lg,
  },
  breakdownBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  allPaidContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
  },
  historySection: {
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  historyCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  historyCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.primary,
    opacity: 0.95,
    zIndex: 10,
  },
  successContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
    padding: 32,
  }
});
