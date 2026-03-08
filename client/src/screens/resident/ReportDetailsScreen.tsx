import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MapPin, Calendar, AlertTriangle, FileText, CheckCircle, Clock } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../theme';
import { reportService } from '../../services/reportService';
import { WasteRequest } from '../../types';

export const ReportDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { reportId } = route.params;

  const [report, setReport] = useState<WasteRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const data = await reportService.getReportById(reportId);
        if (data) setReport(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <ScreenContainer style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </ScreenContainer>
    );
  }

  if (!report) {
    return (
      <ScreenContainer style={styles.centered}>
        <AppText variant="bodyLarge">Report not found.</AppText>
        <AppButton title="Go Back" onPress={() => navigation.goBack()} style={{ marginTop: 16 }} />
      </ScreenContainer>
    );
  }

  const requestedDate = new Date(report.requestedDate).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

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
        <StatusBadge status={report.status} />
      </View>

      <AppText variant="h1" style={styles.title}>{report.type} Waste</AppText>

      <AppCard elevation="sm" style={styles.detailCard}>
        <View style={styles.detailRow}>
          <MapPin color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Location</AppText>
            <AppText variant="body">{report.street} {report.landmark ? `(${report.landmark})` : ''}</AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <AlertTriangle color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Severity</AppText>
            <AppText variant="body">{report.severity}</AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Calendar color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Requested On</AppText>
            <AppText variant="body">{requestedDate}</AppText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <FileText color={theme.colors.textSecondary} size={20} />
          <View style={styles.detailTextContainer}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>Additional Notes</AppText>
            <AppText variant="body">{report.notes || 'None provided.'}</AppText>
          </View>
        </View>
      </AppCard>

      <AppText variant="h3" style={styles.timelineTitle}>Progress</AppText>

      <View style={styles.timeline}>
        {/* Step 1: Submitted */}
        <View style={styles.timelineStep}>
          <View style={styles.timelineIconWrapperActive}>
            <CheckCircle color={theme.colors.primary} size={20} />
          </View>
          <View style={styles.timelineContent}>
            <AppText variant="body" weight="600">Request Submitted</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>We received your request.</AppText>
          </View>
        </View>
        
        {/* Step 2: Scheduled/Assigned */}
        <View style={styles.timelineStep}>
          <View style={report.status !== 'Pending' ? styles.timelineIconWrapperActive : styles.timelineIconWrapperInactive}>
            {report.status !== 'Pending' ? 
              <CheckCircle color={theme.colors.primary} size={20} /> :
              <Clock color={theme.colors.textSecondary} size={20} />
            }
          </View>
          <View style={styles.timelineContent}>
            <AppText variant="body" weight="600" color={report.status === 'Pending' ? theme.colors.textSecondary : theme.colors.text}>Assigned</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {report.collectorId ? 'A collector has been assigned.' : 'Pending assignment.'}
            </AppText>
          </View>
        </View>

        {/* Step 3: Completed */}
        <View style={[styles.timelineStep, { borderLeftWidth: 0 }]}>
          <View style={report.status === 'Completed' ? styles.timelineIconWrapperActive : styles.timelineIconWrapperInactive}>
             {report.status === 'Completed' ? 
              <CheckCircle color={theme.colors.primary} size={20} /> :
              <Clock color={theme.colors.textSecondary} size={20} />
            }
          </View>
          <View style={styles.timelineContent}>
            <AppText variant="body" weight="600" color={report.status !== 'Completed' ? theme.colors.textSecondary : theme.colors.text}>Completed</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {report.completedDate ? `Completed on ${new Date(report.completedDate).toLocaleDateString()}` : 'Awaiting completion.'}
            </AppText>
          </View>
        </View>
      </View>

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
    marginBottom: theme.spacing.lg,
  },
  backBtn: {
    marginLeft: -theme.spacing.sm,
  },
  title: {
    marginBottom: theme.spacing.md,
  },
  detailCard: {
    marginBottom: theme.spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: theme.spacing.sm,
  },
  detailTextContainer: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  timelineTitle: {
    marginBottom: theme.spacing.md,
  },
  timeline: {
    marginLeft: theme.spacing.sm,
  },
  timelineStep: {
    flexDirection: 'row',
    borderLeftWidth: 2,
    borderColor: theme.colors.border,
    paddingBottom: theme.spacing.lg,
  },
  timelineIconWrapperActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -13, // center the icon over the border
    marginTop: -2,
  },
  timelineIconWrapperInactive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -13,
    marginTop: -2,
  },
  timelineContent: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
});
