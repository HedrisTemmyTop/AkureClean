import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Search, MapPin, User as UserIcon } from 'lucide-react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { AppCard } from '../../components/AppCard';
import { theme } from '../../theme';
import { User } from '../../types';
import { collectorService } from '../../services/collectorService';

export const CreateAssignmentScreen: React.FC = () => {
  const navigation = useNavigation();
  
  const [emailSearch, setEmailSearch] = useState('');
  const [collector, setCollector] = useState<User | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    if (!emailSearch) return;
    setIsSearching(true);
    setCollector(null);
    try {
      // Mock search logic
      const allCols = await collectorService.getAllCollectors();
      const found = allCols.find(c => c.email.toLowerCase() === emailSearch.toLowerCase());
      if (found) {
        setCollector(found);
      } else {
        Alert.alert('Not Found', 'No collector found with this email.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = () => {
    if (!collector) {
      Alert.alert('Error', 'Please search and select a collector first.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location or street in Akure.');
      return;
    }

    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Success', 'Assignment created successfully.');
      navigation.goBack();
    }, 1000);
  };

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
        <AppText variant="h2" style={{ flex: 1, textAlign: 'center' }}>New Assignment</AppText>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.section}>
        <AppText variant="h3" style={styles.label}>1. Find Collector</AppText>
        <View style={styles.searchRow}>
          <AppInput
            placeholder="Search collector by email..."
            value={emailSearch}
            onChangeText={setEmailSearch}
            autoCapitalize="none"
            keyboardType="email-address"
            style={{ flex: 1 }}
          />
        </View>
        <AppButton 
          title="Search" 
          icon={<Search color={theme.colors.surface} size={18} />}
          onPress={handleSearch}
          loading={isSearching}
        />
      </View>

      {collector && (
        <View style={{ marginTop: theme.spacing.xl }}>
          <AppCard style={styles.collectorCard}>
            <View style={styles.colHeader}>
              <View style={styles.avatar}>
                <UserIcon color={theme.colors.primary} size={24} />
              </View>
              <View>
                <AppText variant="h3">{collector.name}</AppText>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>{collector.email}</AppText>
              </View>
            </View>
          </AppCard>

          <AppText variant="h3" style={styles.label}>2. Assign Location</AppText>
          <AppInput
            placeholder="e.g. Alagbaka, FUTA South Gate"
            value={location}
            onChangeText={setLocation}
          />
          <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginTop: -8, marginBottom: 24 }}>
            Enter the street or ward in Akure for this assignment.
          </AppText>

          <AppButton 
            title="Save Assignment" 
            onPress={handleSave}
            loading={saving}
          />
        </View>
      )}

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  backBtn: {
    marginLeft: -theme.spacing.sm,
    width: 60,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    marginBottom: theme.spacing.sm,
  },
  searchRow: {
    marginBottom: theme.spacing.md,
  },
  collectorCard: {
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.primary + '10',
    borderColor: theme.colors.primary + '30',
    borderWidth: 1,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  }
});
