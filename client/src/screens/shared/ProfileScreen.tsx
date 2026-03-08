import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { User, Mail, Phone, MapPin, Edit3, LogOut } from 'lucide-react-native';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppCard } from '../../components/AppCard';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: signOut }
      ]
    );
  };

  if (!user) return null;

  return (
    <ScreenContainer scrollable>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h1">My Profile</AppText>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={200}>
        <AppCard style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <AppText variant="h1" color={theme.colors.primary}>
                {user.name.charAt(0).toUpperCase()}
              </AppText>
            </View>
            <View style={styles.nameContext}>
              <AppText variant="h3">{user.name}</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary} style={{ textTransform: 'uppercase' }}>
                {user.role}
              </AppText>
            </View>
          </View>

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <Mail size={20} color={theme.colors.textSecondary} style={styles.infoIcon} />
              <AppText variant="body">{user.email}</AppText>
            </View>
            <View style={styles.infoRow}>
              <Phone size={20} color={theme.colors.textSecondary} style={styles.infoIcon} />
              <AppText variant="body">{user.phone || 'No phone provided'}</AppText>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={20} color={theme.colors.textSecondary} style={styles.infoIcon} />
              <AppText variant="body" numberOfLines={2} style={{ flex: 1 }}>
                {user.address || 'No address provided'}
              </AppText>
            </View>
          </View>

          <AppButton 
            title="Edit Profile" 
            variant="outline" 
            fullWidth 
            style={styles.editBtn}
            icon={<Edit3 size={18} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('EditProfile')}
          />
        </AppCard>
      </Animatable.View>

      <Animatable.View animation="fadeInUp" delay={300} style={styles.actionSection}>
        <TouchableOpacity style={styles.actionRow} onPress={handleLogout}>
          <View style={styles.actionIconBoxDestructive}>
            <LogOut size={20} color={theme.colors.status.cancelled} />
          </View>
          <AppText variant="body" weight="600" color={theme.colors.status.cancelled} style={styles.actionText}>
            Sign Out
          </AppText>
        </TouchableOpacity>
      </Animatable.View>

    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  profileCard: {
    padding: theme.spacing.xl,
  },
  avatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.lg,
  },
  nameContext: {
    flex: 1,
  },
  infoList: {
    marginBottom: theme.spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  infoIcon: {
    marginRight: theme.spacing.md,
  },
  editBtn: {
    marginTop: theme.spacing.sm,
  },
  actionSection: {
    marginTop: theme.spacing.xxl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  actionIconBoxDestructive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.status.cancelled + '10',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  actionText: {
    flex: 1,
  }
});
