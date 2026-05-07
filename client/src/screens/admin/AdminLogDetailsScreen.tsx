import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { User, Activity, FileText, Clock } from 'lucide-react-native';

export const AdminLogDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const { logData } = route.params;

  if (!logData) {
    return (
      <ScreenContainer>
        <AppText>Log details not available.</AppText>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <AppText variant="h2">Audit Log Details</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          Full activity information
        </AppText>
      </View>

      <AppCard style={styles.card}>
        <View style={styles.detailRow}>
          <View style={styles.iconBox}>
            <Activity color={theme.colors.primary} size={20} />
          </View>
          <View style={styles.detailText}>
            <AppText variant="caption" color={theme.colors.textSecondary}>Action</AppText>
            <AppText variant="body" weight="600">{logData.action}</AppText>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.iconBox}>
            <User color={theme.colors.secondary} size={20} />
          </View>
          <View style={styles.detailText}>
            <AppText variant="caption" color={theme.colors.textSecondary}>Actor (User)</AppText>
            <AppText variant="body">{logData.user ? (logData.user.name || logData.user.email) : 'System'}</AppText>
            {logData.user && <AppText variant="caption" color={theme.colors.textSecondary}>{logData.user.role}</AppText>}
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.iconBox}>
            <Clock color={theme.colors.textSecondary} size={20} />
          </View>
          <View style={styles.detailText}>
            <AppText variant="caption" color={theme.colors.textSecondary}>Timestamp</AppText>
            <AppText variant="body">{new Date(logData.createdAt).toLocaleString()}</AppText>
          </View>
        </View>

        <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
          <View style={styles.iconBox}>
            <FileText color={theme.colors.status.pending} size={20} />
          </View>
          <View style={styles.detailText}>
            <AppText variant="caption" color={theme.colors.textSecondary}>Description</AppText>
            <AppText variant="body">{logData.description}</AppText>
          </View>
        </View>
      </AppCard>

      {logData.details && Object.keys(logData.details).length > 0 && (
        <View style={styles.extraDetails}>
          <AppText variant="h3" style={{ marginBottom: theme.spacing.sm }}>Metadata</AppText>
          <AppCard style={styles.metadataCard}>
            <AppText variant="bodySmall" style={styles.jsonText}>
              {JSON.stringify(logData.details, null, 2)}
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
  },
  card: {
    padding: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  detailText: {
    flex: 1,
    justifyContent: 'center',
  },
  extraDetails: {
    marginTop: theme.spacing.lg,
  },
  metadataCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
  },
  jsonText: {
    fontFamily: 'monospace',
  }
});
