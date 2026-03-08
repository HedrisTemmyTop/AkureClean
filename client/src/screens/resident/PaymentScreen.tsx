import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CreditCard, CheckCircle, ShieldCheck } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { reportService } from '../../services/reportService';
import { WasteRequest } from '../../types';
import { ResidentStackParamList } from '../../navigation/RoleNavigator';

type PaymentScreenRouteProp = RouteProp<ResidentStackParamList, 'Payment'>;

export const PaymentScreen: React.FC = () => {
  const route = useRoute<PaymentScreenRouteProp>();
  const navigation = useNavigation<any>();
  const { reportId } = route.params;

  const [report, setReport] = useState<WasteRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      const data = await reportService.getReportById(reportId);
      setReport(data || null);
    };
    loadReport();
  }, [reportId]);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      await reportService.processPayment(reportId);
      setPaymentSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (e) {
      Alert.alert('Payment Failed', 'Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!report) return null;

  return (
    <ScreenContainer>
      {paymentSuccess && (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={styles.successOverlay} />
          <View style={styles.successContent}>
            <CheckCircle color={theme.colors.success} size={80} />
            <AppText variant="h2" color={theme.colors.surface} style={{ marginTop: 24, textAlign: 'center' }}>
              Payment Successful!
            </AppText>
            <AppText variant="body" color={theme.colors.surface} style={{ marginTop: 8, textAlign: 'center', opacity: 0.9 }}>
              Your pickup is now scheduled.
            </AppText>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <AppText variant="h2">Secure Payment</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Complete your pickup request
        </AppText>
      </View>

      <View>
        <AppCard style={styles.invoiceCard}>
          <AppText variant="h3" style={{ marginBottom: theme.spacing.md }}>Invoice Details</AppText>
          
          <View style={styles.invoiceRow}>
            <AppText variant="body" color={theme.colors.textSecondary}>Pickup Address:</AppText>
            <AppText variant="body" weight="600" style={styles.invoiceValue}>{report.street}</AppText>
          </View>
          
          <View style={styles.invoiceRow}>
            <AppText variant="body" color={theme.colors.textSecondary}>Waste Type:</AppText>
            <AppText variant="body" weight="600" style={styles.invoiceValue}>{report.type}</AppText>
          </View>
          
          <View style={styles.invoiceRow}>
            <AppText variant="body" color={theme.colors.textSecondary}>Preferred Date:</AppText>
            <AppText variant="body" weight="600" style={styles.invoiceValue}>
              {report.preferredDate ? new Date(report.preferredDate).toLocaleDateString() : 'Next schedule'}
            </AppText>
          </View>

          <View style={[styles.invoiceRow, styles.totalRow]}>
            <AppText variant="h3">Total Amount:</AppText>
            <AppText variant="h2" color={theme.colors.primary}>₦{report.cost || 2500}</AppText>
          </View>
        </AppCard>
      </View>

      <View style={styles.paymentMethods}>
        <AppText variant="h3" style={{ marginBottom: theme.spacing.lg }}>Select Method</AppText>
        
        <TouchableOpacity style={styles.methodCard}>
          <CreditCard color={theme.colors.primary} size={24} />
          <AppText variant="body" weight="600" style={{ flex: 1, marginLeft: theme.spacing.md }}>
            Pay with Card (Mock)
          </AppText>
        </TouchableOpacity>
        
        <View style={styles.securityNote}>
          <ShieldCheck color={theme.colors.success} size={16} />
          <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 6 }}>
            Mock secured transaction. Demo purposes only.
          </AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton 
          title={`Pay ₦${report.cost || 2500}`} 
          fullWidth 
          loading={isProcessing}
          onPress={handlePayment}
        />
        <AppButton 
          title="Cancel" 
          variant="outline" 
          fullWidth 
          style={{ marginTop: theme.spacing.md }}
          onPress={() => navigation.goBack()}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  invoiceCard: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  invoiceValue: {
    flex: 1,
    textAlign: 'right',
    marginLeft: theme.spacing.xl,
  },
  totalRow: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
  },
  paymentMethods: {
    flex: 1,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + '05',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  footer: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
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
