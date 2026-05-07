import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { adminService } from '../../services/adminService';

export const AdminLogsScreen: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await adminService.getAllLogs();
        setLogs(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, []);

    const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('AdminLogDetails' as any, { logData: item })}
    >
      <AppCard style={styles.card}>
        <View style={styles.headerRow}>
          <AppText variant="body" weight="600" style={{ textTransform: 'capitalize' }}>
            {item.action}
          </AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>
            {new Date(item.createdAt).toLocaleString()}
          </AppText>
        </View>
        <AppText variant="bodySmall" style={{ marginTop: 4 }}>
          {item.description}
        </AppText>
        <AppText variant="caption" color={theme.colors.primary} style={{ marginTop: 8 }}>
          User: {item.user ? (item.user.name || item.user.email) : 'System'}
        </AppText>
      </AppCard>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.headerTitle}>
        <AppText variant="h2">System Audit Logs</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Audit trail and system activities.
        </AppText>
      </View>
      
      {loading ? (
        <AppText variant="body" color={theme.colors.textSecondary}>Loading logs...</AppText>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={item => item._id || item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={<AppText variant="body">No logs found.</AppText>}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    marginBottom: theme.spacing.xl,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  }
});
