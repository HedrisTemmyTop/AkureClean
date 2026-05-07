import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { adminService } from '../../services/adminService';
import { User, Truck, Search } from 'lucide-react-native';
import { AdminStackParamList } from '../../navigation/RoleNavigator';
import { AppInput } from '../../components/AppInput';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList, 'AdminCollectorsList'>;

export const AdminCollectorsScreen: React.FC = () => {
  const [collectors, setCollectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();

  useEffect(() => {
    const loadCollectors = async () => {
      setLoading(true);
      try {
        const data = await adminService.getAllDrivers(searchQuery);
        setCollectors(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      loadCollectors();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isFocused]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('AdminCollectorDetails', { driverId: item.id })}
    >
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Truck color={theme.colors.secondary} size={20} />
          </View>
          <View style={styles.userInfo}>
            <AppText variant="body" weight="600">{item.name || item.email}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{item.email}</AppText>
          </View>
          <View style={styles.roleBadge}>
            <AppText 
              variant="caption" 
              weight="600" 
              style={{ textTransform: 'capitalize' }}
              color={item.isDeactivated ? theme.colors.status.cancelled : theme.colors.text}
            >
              {item.isDeactivated ? 'Deactivated' : 'Collector'}
            </AppText>
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
    </TouchableOpacity>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.headerTitle}>
        <AppText variant="h2">System Collectors</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          All registered collectors (drivers).
        </AppText>
      </View>

      <AppInput
        placeholder="Search by name, email, phone or plate..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        icon={<Search size={20} color={theme.colors.textSecondary} />}
        style={styles.searchBar}
      />
      
      {loading ? (
        <AppText variant="body" color={theme.colors.textSecondary}>Loading collectors...</AppText>
      ) : (
        <FlatList
          data={collectors}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={<AppText variant="body">No collectors found.</AppText>}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    marginBottom: theme.spacing.lg,
  },
  searchBar: {
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
