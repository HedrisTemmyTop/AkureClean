import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { AppText } from './AppText';
import { RequestStatus } from '../types';

interface StatusBadgeProps {
  status: RequestStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'Pending':
        return theme.colors.status.pending;
      case 'Scheduled':
        return theme.colors.status.active;
      case 'In Progress':
        return theme.colors.primary;
      case 'Completed':
        return theme.colors.status.completed;
      case 'Cancelled':
        return theme.colors.status.cancelled;
      default:
        return theme.colors.textSecondary;
    }
  };

  const backgroundColor = `${getStatusColor()}20`; // 20% opacity wrapper
  const color = getStatusColor();

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <AppText variant="caption" weight="700" color={color} style={styles.text}>
        {status.toUpperCase()}
      </AppText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm + 4,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.borderRadius.sm, // Slightly squared vs fully round
    alignSelf: 'flex-start',
  },
  text: {
    letterSpacing: 0.5,
  }
});
