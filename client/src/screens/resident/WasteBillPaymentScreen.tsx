import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CreditCard, CheckCircle, ShieldCheck } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { AppInput } from '../../components/AppInput';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

type PaymentPlan = 'Weekly' | 'Quarterly' | 'Semi-Annual' | 'Yearly' | 'Penalty';

const PLAN_AMOUNTS: Record<Exclude<PaymentPlan, 'Penalty'>, string> = {
  'Weekly': '1500',
  'Quarterly': '5000',
  'Semi-Annual': '9500',
  'Yearly': '18000',
};

export const WasteBillPaymentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan>('Quarterly');
  const [amount, setAmount] = useState(PLAN_AMOUNTS['Quarterly']);
  
  // Profile data
  const [accountNumber, setAccountNumber] = useState(user?.id?.substring(0, 8).toUpperCase() || 'ACC12345');
  const [street, setStreet] = useState(user?.address || '123 Fake Street');
  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (selectedPlan !== 'Penalty') {
      setAmount(PLAN_AMOUNTS[selectedPlan as keyof typeof PLAN_AMOUNTS]);
    } else {
      setAmount('');
    }
  }, [selectedPlan]);

  const handlePayment = () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    }, 1500);
  };

  const renderPlanOption = (plan: PaymentPlan) => {
    const isSelected = selectedPlan === plan;
    return (
      <TouchableOpacity 
        key={plan}
        style={[styles.planOption, isSelected && styles.planOptionSelected]}
        onPress={() => setSelectedPlan(plan)}
        activeOpacity={0.7}
      >
        <AppText 
          variant="bodySmall" 
          weight={isSelected ? '600' : '400'}
          color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
        >
          {plan}
        </AppText>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer scrollable>
      {paymentSuccess && (
        <View style={StyleSheet.absoluteFillObject}>
          <View style={styles.successOverlay} />
          <View style={styles.successContent}>
            <CheckCircle color={theme.colors.success} size={80} />
            <AppText variant="h2" color={theme.colors.surface} style={{ marginTop: 24, textAlign: 'center' }}>
              Payment Successful!
            </AppText>
            <AppText variant="body" color={theme.colors.surface} style={{ marginTop: 8, textAlign: 'center', opacity: 0.9 }}>
              Your waste bill payment of ₦{amount} is received.
            </AppText>
          </View>
        </View>
      )}

      <View style={styles.header}>
        <AppText variant="h2">Waste Bill Payment</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Complete your regular waste subscription
        </AppText>
      </View>

      <AppCard style={styles.card}>
        <AppText variant="h3" style={styles.sectionTitle}>1. Select Payment Plan</AppText>
        <View style={styles.plansContainer}>
          {(['Weekly', 'Quarterly', 'Semi-Annual', 'Yearly', 'Penalty'] as PaymentPlan[]).map(renderPlanOption)}
        </View>

        <AppText variant="h3" style={styles.sectionTitle}>2. Payment Details</AppText>
        
        <View style={{ marginBottom: theme.spacing.md }}>
          <AppInput
            label="Amount (₦)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            editable={selectedPlan === 'Penalty'}
            style={selectedPlan !== 'Penalty' ? styles.readOnlyInput : undefined}
          />
        </View>

        <View style={{ marginBottom: theme.spacing.md }}>
          <AppInput
            label="Account / Customer ID"
            value={accountNumber}
            editable={false}
            style={styles.readOnlyInput}
          />
        </View>
      </AppCard>

      <AppCard style={styles.card}>
        <AppText variant="h3" style={styles.sectionTitle}>3. Resident Information</AppText>
        
        <View style={{ marginBottom: theme.spacing.md }}>
          <AppInput
            label="Full Name"
            value={fullName}
            editable={false}
            style={styles.readOnlyInput}
          />
        </View>

        <View style={{ marginBottom: theme.spacing.md }}>
          <AppInput
            label="Email Address"
            value={email}
            editable={false}
            style={styles.readOnlyInput}
          />
        </View>

        <View style={{ marginBottom: theme.spacing.md }}>
          <AppInput
            label="Phone Number"
            value={phone}
            editable={false}
            style={styles.readOnlyInput}
          />
        </View>

        <View style={{ marginBottom: theme.spacing.md }}>
          <AppInput
            label="Street Address"
            value={street}
            onChangeText={setStreet}
            placeholder="Enter your street address"
          />
        </View>
      </AppCard>

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
          title={`Pay ₦${amount || '0'}`} 
          fullWidth 
          loading={isProcessing}
          onPress={handlePayment}
          style={styles.payBtn}
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
    marginBottom: theme.spacing.lg,
  },
  card: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  plansContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  planOption: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.surface,
  },
  planOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  readOnlyInput: {
    backgroundColor: theme.colors.background,
    color: theme.colors.textSecondary,
    borderWidth: 0,
  },
  paymentMethods: {
    marginBottom: theme.spacing.xl,
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
    marginBottom: theme.spacing.xl,
  },
  payBtn: {
    paddingVertical: theme.spacing.md,
    elevation: 3,
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
