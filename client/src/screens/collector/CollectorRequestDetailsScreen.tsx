import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MapPin, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../theme';
import { reportService } from '../../services/reportService';
import { WasteRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { CollectorStackParamList } from '../../navigation/RoleNavigator';

type NavigationProp = NativeStackNavigationProp<any>;

export const CollectorRequestDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { requestId } = route.params;

  const [request, setRequest] = useState<WasteRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Mock pricing logic for different waste types
  const getPrice = (type: string) => {
    switch(type) {
      case 'Organic': return 2500;
      case 'Plastic': return 1500;
      case 'Electronic': return 5000;
      case 'Hazardous': return 10000;
      default: return 3000;
    }
  };

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const data = await reportService.getReportById(requestId);
        if (data) setRequest(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [requestId]);

  const handleAction = async (action: 'accept' | 'decline') => {
    setProcessing(true);
    try {
      if (action === 'accept') {
        await reportService.updateReportStatus(requestId, 'Payment Pending');
        await reportService.assignCollectorToReport(requestId, user!.id);
        Alert.alert('Success', 'Request accepted! Waiting for resident payment.');
      } else {
        await reportService.updateReportStatus(requestId, 'Declined');
        Alert.alert('Success', 'Request declined.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Action failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !request) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  const dateStr = request.preferredDate ? new Date(request.preferredDate).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  }) : 'Not specified';
  
  const estimatedAmount = getPrice(request.type);

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <AppButton 
          title="Back" 
          variant="ghost" 
          size="small" 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
        />
        <StatusBadge status={request.status} />
      </View>

      <Animatable.View animation="fadeInDown" delay={100}>
        <AppText variant="h1" style={styles.title}>{request.type} Pick-up</AppText>
        <View style={styles.metaRow}>
          <MapPin color={theme.colors.textSecondary} size={16} />
          <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginLeft: 6 }}>
            {request.street} {request.landmark && `(${request.landmark})`}
          </AppText>
        </View>
      </Animatable.View>

      <AppCard style={styles.card} animation="fadeInUp" delay={200}>
        <AppText variant="h3" style={styles.sectionTitle}>Request Details</AppText>
        
        <View style={styles.detailRow}>
          <Calendar color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Requested Date</AppText>
            <AppText variant="body" weight="600">{dateStr}</AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <FileText color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Resident Note</AppText>
            <AppText variant="body" style={{ fontStyle: 'italic' }}>{request.notes || 'No additional notes provided.'}</AppText>
          </View>
        </View>
      </AppCard>

      <AppCard style={styles.paymentCard} animation="fadeInUp" delay={300}>
        <AppText variant="bodySmall" color={theme.colors.primary} weight="600" style={{ marginBottom: 8 }}>
          SELF PICKUP QUOTE
        </AppText>
        <AppText variant="h1" color={theme.colors.primary}>
          ₦{estimatedAmount.toLocaleString()}
        </AppText>
        <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 8 }}>
          This amount will be billed to the resident upon your acceptance.
        </AppText>
      </AppCard>

      {request.status === 'Pending' && (
        <Animatable.View animation="fadeInUp" delay={400} style={styles.actionsContainer}>
          <AppButton 
            title="Decline" 
            variant="outline" 
            style={[styles.actionBtn, { borderColor: theme.colors.status.cancelled }] as any}
            textStyle={{ color: theme.colors.status.cancelled }}
            icon={<XCircle color={theme.colors.status.cancelled} size={20} />}
            onPress={() => handleAction('decline')}
            loading={processing}
            disabled={processing}
          />
          <View style={{ width: theme.spacing.lg }} />
          <AppButton 
            title="Accept Quote" 
            style={[styles.actionBtn, { backgroundColor: theme.colors.success }] as any}
            icon={<CheckCircle color={theme.colors.surface} size={20} />}
            onPress={() => handleAction('accept')}
            loading={processing}
            disabled={processing}
          />
        </Animatable.View>
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  backBtn: {
    marginLeft: -theme.spacing.sm,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  card: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  detailTextContainer: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  paymentCard: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary + '30',
    borderWidth: 1,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xxl,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
  }
});
