import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { adminService } from '../../services/adminService';
import { User, Shield, Briefcase, Home } from 'lucide-react-native';

export const AdminUsersScreen: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await adminService.getAllUsers();
        setUsers(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const getRoleIcon = (role: string) => {
    if (role.toLowerCase() === 'admin') return <Shield color={theme.colors.error} size={20} />;
    if (role.toLowerCase() === 'driver') return <Briefcase color={theme.colors.secondary} size={20} />;
    return <Home color={theme.colors.primary} size={20} />;
  };

  const renderItem = ({ item }: { item: any }) => (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          {getRoleIcon(item.role)}
        </View>
        <View style={styles.userInfo}>
          <AppText variant="body" weight="600">{item.name || item.email}</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>{item.email}</AppText>
        </View>
        <View style={styles.roleBadge}>
          <AppText variant="caption" weight="600" style={{ textTransform: 'capitalize' }}>{item.role}</AppText>
        </View>
      </View>
      <View style={styles.detailsRow}>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          Phone: {item.phone || 'N/A'}
        </AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          Joined: {new Date(item.createdAt).toLocaleDateString()}
        </AppText>
      </View>
    </AppCard>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.headerTitle}>
        <AppText variant="h2">System Users</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          All registered users in the system.
        </AppText>
      </View>
      
      {loading ? (
        <AppText variant="body" color={theme.colors.textSecondary}>Loading users...</AppText>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item._id || item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={<AppText variant="body">No users found.</AppText>}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
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
  userInfo: {
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.background,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  }
});
