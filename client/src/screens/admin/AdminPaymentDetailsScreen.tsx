import { View, StyleSheet, ScrollView, Clipboard, Alert, TouchableOpacity } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { CreditCard, User as UserIcon, Calendar, Hash, CheckCircle, Copy } from 'lucide-react-native';

export const AdminPaymentDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const { paymentData } = route.params;

  if (!paymentData) {
    return (
      <ScreenContainer>
        <AppText>Payment details not found.</AppText>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <AppText variant="h2">Payment Details</AppText>
        <View style={styles.amountContainer}>
          <AppText variant="h1" color={theme.colors.success}>₦{paymentData.amount}</AppText>
          <View style={styles.successBadge}>
            <CheckCircle color={theme.colors.success} size={16} />
            <AppText variant="caption" weight="600" color={theme.colors.success} style={{ marginLeft: 4 }}>PAID</AppText>
          </View>
        </View>
      </View>

      <AppCard style={styles.card}>
        <View style={styles.detailRow}>
          <View style={styles.iconBox}>
            <UserIcon color={theme.colors.primary} size={20} />
          </View>
          <View style={styles.detailContent}>
            <AppText variant="caption" color={theme.colors.textSecondary}>Resident</AppText>
            <AppText variant="body" weight="600">{paymentData.userId?.name || 'N/A'}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{paymentData.userId?.email}</AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.iconBox}>
            <Calendar color={theme.colors.secondary} size={20} />
          </View>
          <View style={styles.detailContent}>
            <AppText variant="caption" color={theme.colors.textSecondary}>Date of Payment</AppText>
            <AppText variant="body">{new Date(paymentData.updatedAt).toLocaleString()}</AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.iconBox}>
            <Hash color={theme.colors.textSecondary} size={20} />
          </View>
          <View style={styles.detailContent}>
            <AppText variant="caption" color={theme.colors.textSecondary}>Payment Reference</AppText>
            <View style={styles.referenceContainer}>
              <AppText variant="body" style={{ flex: 1 }}>{paymentData.paystackReference || 'N/A'}</AppText>
              {paymentData.paystackReference && (
                <TouchableOpacity 
                  onPress={() => {
                    Clipboard.setString(paymentData.paystackReference);
                    Alert.alert("Copied", "Payment reference copied to clipboard!");
                  }}
                  style={styles.copyButton}
                >
                  <Copy color={theme.colors.primary} size={18} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <View style={styles.iconBox}>
            <CreditCard color={theme.colors.warning} size={20} />
          </View>
          <View style={styles.detailContent}>
            <AppText variant="caption" color={theme.colors.textSecondary}>Payment Status</AppText>
            <AppText variant="body" style={{ textTransform: 'uppercase' }}>{paymentData.status}</AppText>
          </View>
        </View>
      </AppCard>

      {paymentData.billDetails && (
        <View style={styles.billSection}>
          <AppText variant="h3" style={{ marginBottom: theme.spacing.md }}>Bill Metadata</AppText>
          <AppCard style={styles.metadataCard}>
            <AppText variant="bodySmall" style={styles.jsonText}>
              {JSON.stringify(paymentData.billDetails, null, 2)}
            </AppText>
          </AppCard>
        </View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  amountContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success + '15',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  card: {
    padding: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  referenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
  billSection: {
    marginTop: theme.spacing.lg,
  },
  metadataCard: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
  }
});
