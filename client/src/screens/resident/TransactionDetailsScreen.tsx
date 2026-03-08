import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheckCircle, CreditCard, ChevronLeft } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { ResidentStackParamList } from '../../navigation/RoleNavigator';

type Props = NativeStackScreenProps<ResidentStackParamList, 'TransactionDetails'>;

export const TransactionDetailsScreen: React.FC<Props> = ({ route }) => {
  const { billId } = route.params;
  const navigation = useNavigation();

  // Mock details based on a realistic scenario
  const transaction = {
    id: billId,
    amount: 5000,
    date: 'February 28, 2026',
    time: '14:30 PM',
    status: 'Successful',
    paymentMethod: 'Card ending ...4242',
    reference: `TXN-${Math.floor(Math.random() * 1000000)}`,
    description: 'Monthly Waste Subscription',
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <AppText variant="h2" style={styles.headerTitle}>Transaction Details</AppText>
      </View>

      <View style={styles.successIconContainer}>
        <CheckCircle color={theme.colors.success} size={64} />
        <AppText variant="h2" style={styles.amountText}>₦{transaction.amount.toLocaleString()}</AppText>
        <AppText variant="bodySmall" color={theme.colors.success} weight="600">Payment {transaction.status}</AppText>
      </View>

      <AppCard style={styles.detailsCard}>
        <AppText variant="h3" style={styles.cardTitle}>Payment Information</AppText>
        
        <View style={styles.row}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>Description</AppText>
          <AppText variant="bodySmall" weight="600">{transaction.description}</AppText>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>Date & Time</AppText>
          <AppText variant="bodySmall" weight="600">{transaction.date}, {transaction.time}</AppText>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>Payment Method</AppText>
          <View style={styles.methodRow}>
            <CreditCard color={theme.colors.textSecondary} size={16} />
            <AppText variant="bodySmall" weight="600" style={{ marginLeft: 6 }}>{transaction.paymentMethod}</AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>Reference No.</AppText>
          <AppText variant="bodySmall" weight="600">{transaction.reference}</AppText>
        </View>
      </AppCard>

      <View style={styles.footer}>
         <AppText variant="caption" color={theme.colors.textSecondary} align="center">
           If you have any questions about this transaction, please contact support.
         </AppText>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  amountText: {
    fontSize: 36,
    marginVertical: theme.spacing.sm,
  },
  detailsCard: {
    padding: theme.spacing.lg,
  },
  cardTitle: {
    marginBottom: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  footer: {
    marginTop: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.xl,
  }
});
