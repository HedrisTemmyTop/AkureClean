import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { adminService } from '../../services/adminService';
import { User as UserIcon, MapPin, Calendar, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { AppInput } from '../../components/AppInput';

export const AdminResidentsScreen: React.FC = () => {
  const [residents, setResidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<any>();

  useEffect(() => {
    const loadResidents = async () => {
      setLoading(true);
      try {
        const data = await adminService.getAllResidents(searchQuery);
        setResidents(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      loadResidents();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => navigation.navigate('AdminResidentDetails', { residentId: item._id || item.id })}>
      <AppCard style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <UserIcon color={theme.colors.primary} size={20} />
          </View>
          <View style={styles.userInfo}>
            <AppText variant="body" weight="600">{item.name}</AppText>
            <AppText variant="caption" color={theme.colors.textSecondary}>{item.email}</AppText>
          </View>
        </View>
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <MapPin size={14} color={theme.colors.textSecondary} />
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 4 }}>
              {item.localGovt || 'N/A'}
            </AppText>
          </View>
          <View style={styles.detailItem}>
            <Calendar size={14} color={theme.colors.textSecondary} />
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginLeft: 4 }}>
              Joined {new Date(item.createdAt).toLocaleDateString()}
            </AppText>
          </View>
        </View>
      </AppCard>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.headerTitle}>
        <AppText variant="h2">Residents</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Manage all registered residents.
        </AppText>
      </View>

      <AppInput
        placeholder="Search by name, email or phone..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        icon={<Search size={20} color={theme.colors.textSecondary} />}
        style={styles.searchBar}
      />
      
      {loading ? (
        <AppText variant="body" color={theme.colors.textSecondary}>Loading residents...</AppText>
      ) : (
        <FlatList
          data={residents}
          keyExtractor={item => item._id || item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          ListEmptyComponent={<AppText variant="body">No residents found.</AppText>}
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
    backgroundColor: theme.colors.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  userInfo: {
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
