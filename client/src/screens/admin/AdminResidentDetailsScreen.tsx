import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { StatusBadge } from '../../components/StatusBadge';
import { theme } from '../../theme';
import { adminService } from '../../services/adminService';
import { pickupService } from '../../services/pickupService';
import { User, PickupRequestData } from '../../types';
import { User as UserIcon, MapPin, Phone, Mail, Clock, Home } from 'lucide-react-native';

export const AdminResidentDetailsScreen: React.FC = () => {
  const route = useRoute<any>();
  const { residentId } = route.params;
  const navigation = useNavigation<any>();

  const [resident, setResident] = useState<any>(null);
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const residents = await adminService.getAllResidents();
        const found = residents.find(r => (r as any)._id === residentId || (r as any).id === residentId);
        if (found) {
          setResident(found);
        }

        const allPickups = await pickupService.getAllPickups();
        const residentPickups = allPickups.filter(p => (p.userId as any)?._id === residentId || p.userId === residentId);
        setPickups(residentPickups);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [residentId]);

  const renderPickup = ({ item }: { item: any }) => (
    <AppCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <AppText variant="body" weight="600" style={{ textTransform: 'capitalize' }}>{item.type || 'General'} Pickup</AppText>
          <AppText variant="caption" color={theme.colors.textSecondary}>{new Date(item.createdAt).toLocaleString()}</AppText>
        </View>
        <StatusBadge status={item.status as any} />
      </View>
      <View style={styles.infoRow}>
        <AppText variant="caption" color={theme.colors.textSecondary}>
          Driver: {item.driverId?.name || 'Unassigned'}
        </AppText>
        <AppText variant="caption" color={theme.colors.textSecondary}>
          Fee: ₦{item.extraFee || 0}
        </AppText>
      </View>
    </AppCard>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.pageHeader}>
        <AppText variant="h2">Resident Details</AppText>
        {resident && (
          <View style={styles.profileCard}>
            <View style={styles.iconBox}>
              <UserIcon color={theme.colors.primary} size={24} />
            </View>
            <View style={styles.profileInfo}>
              <AppText variant="h3">{resident.name}</AppText>
              <View style={styles.infoItem}>
                <Mail size={14} color={theme.colors.textSecondary} />
                <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginLeft: 8 }}>{resident.email}</AppText>
              </View>
              <View style={styles.infoItem}>
                <Phone size={14} color={theme.colors.textSecondary} />
                <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginLeft: 8 }}>{resident.phone || 'N/A'}</AppText>
              </View>
              <View style={styles.infoItem}>
                <MapPin size={14} color={theme.colors.textSecondary} />
                <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginLeft: 8 }}>{resident.address || 'No address provided'}</AppText>
              </View>
              <View style={styles.infoItem}>
                <Home size={14} color={theme.colors.textSecondary} />
                <AppText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginLeft: 8 }}>
                  {resident.houseType || 'N/A'}
                  {resident.houseType === 'Residential building' && ` (${resident.numberOfRooms} rooms)`}
                  {resident.houseType === 'Shop' && ` (${resident.numberOfShops} shops)`}
                  {resident.houseType === 'Company' && ` (${resident.numberOfWorkersRange})`}
                </AppText>
              </View>
            </View>
          </View>
        )}
      </View>

      <AppText variant="h3" style={styles.sectionTitle}>Pickup History</AppText>
      
      {loading ? (
        <AppText variant="body" color={theme.colors.textSecondary}>Loading history...</AppText>
      ) : (
        <FlatList
          data={pickups}
          keyExtractor={item => item.id}
          renderItem={renderPickup}
          scrollEnabled={false}
          ListEmptyComponent={<AppText variant="body" color={theme.colors.textSecondary}>No pickup history found.</AppText>}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  pageHeader: {
    marginBottom: theme.spacing.xl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  }
});
