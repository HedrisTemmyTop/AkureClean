import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

export const EditProfileScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation();

  // Initialize state with current user data
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // Simulate network delay for saving profile
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      // Note: In a real app, we'd update the AuthContext or backend here.
    }, 800);
  };

  if (!user) return null;

  return (
    <ScreenContainer scrollable>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h1">Edit Profile</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Update your personal details
        </AppText>
      </Animatable.View>

      <View style={styles.form}>
        <Animatable.View animation="fadeInLeft" delay={200}>
          <AppInput
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
          />
        </Animatable.View>

        <Animatable.View animation="fadeInLeft" delay={300}>
          <AppInput
            label="Phone Number"
            placeholder="Enter your phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </Animatable.View>

        <Animatable.View animation="fadeInLeft" delay={400}>
          <AppInput
            label="Address"
            placeholder="Enter your full address"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={500}>
          <AppButton 
            title="Save Changes" 
            fullWidth 
            style={styles.saveBtn}
            loading={isLoading}
            onPress={handleSave}
          />
          <AppButton 
            title="Cancel" 
            variant="outline"
            fullWidth 
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
          />
        </Animatable.View>
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  form: {
    marginBottom: theme.spacing.xl,
  },
  saveBtn: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  cancelBtn: {
    marginBottom: theme.spacing.md,
  }
});
