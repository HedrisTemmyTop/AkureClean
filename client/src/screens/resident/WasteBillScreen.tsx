import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreditCard, CheckCircle, Clock } from 'lucide-react-native';
import { ResidentStackParamList } from '../../navigation/RoleNavigator';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

interface MockBill {
  id: string;
  amount: number;
  period: string;
  dueDate: string;
  status: 'Unpaid' | 'Paid';
}

const mockBills: MockBill[] = [
  {
    id: 'bill_001',
    amount: 5000,
    period: 'March 2026',
    dueDate: '2026-03-31',
    status: 'Unpaid',
  },
  {
    id: 'bill_002',
    amount: 5000,
    period: 'February 2026',
    dueDate: '2026-02-28',
    status: 'Paid',
  },
  {
    id: 'bill_003',
    amount: 5000,
    period: 'January 2026',
    dueDate: '2026-01-31',
    status: 'Paid',
  }
];

export const WasteBillScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ResidentStackParamList>>();
  const [bills, setBills] = useState<MockBill[]>(mockBills);

  const currentBill = bills.find(b => b.status === 'Unpaid');
  const pastBills = bills.filter(b => b.status === 'Paid');

  const handlePayment = () => {
    navigation.navigate('WasteBillPayment');
  };

  return (
    <ScreenContainer scrollable>
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
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>Billing Period:</AppText>
                <AppText variant="bodySmall" weight="600">{currentBill.period}</AppText>
              </View>
              
              <View style={styles.billDetailRow}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>Due Date:</AppText>
                <AppText variant="bodySmall" weight="600" color={theme.colors.error}>
                  {new Date(currentBill.dueDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                </AppText>
              </View>

              <AppButton 
                title="Proceed to Payment" 
                fullWidth 
                style={styles.payBtn}
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
        
        {pastBills.map((bill, index) => (
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
                  <AppText variant="body" weight="600">{bill.period}</AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>Paid fully</AppText>
                </View>
              </View>
              <AppText variant="body" weight="600">₦{bill.amount.toLocaleString()}</AppText>
            </AppCard>
          </TouchableOpacity>
        ))}
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
    marginTop: theme.spacing.xl,
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
