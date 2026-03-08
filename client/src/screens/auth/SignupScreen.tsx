import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Animatable from 'react-native-animatable';

import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppInput } from '../../components/AppInput';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types';
import { AuthStackParamList } from '../../navigation/AuthStack';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

export const SignupScreen: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Resident');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const handleSignup = async () => {
    if (!name || !email || !password || !phone || !address) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        name,
        email,
        phone,
        address,
        role,
      });
      // The context will automatically update user state and switch navigators
    } catch (e) {
      Alert.alert('Registration Failed', 'Could not create account at this time.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer scrollable>
      <Animatable.View animation="fadeInDown" delay={100} style={styles.header}>
        <AppText variant="h1">Create Account</AppText>
        <AppText variant="bodyLarge" color={theme.colors.textSecondary}>
          Join the Smart Waste network
        </AppText>
      </Animatable.View>

      <View style={styles.form}>
        <Animatable.View animation="fadeInLeft" delay={200}>
          <AppText variant="caption" weight="600" color={theme.colors.textSecondary} style={{ marginBottom: 8, marginLeft: 4 }}>
            I AM A:
          </AppText>
          <View style={styles.roleSelector}>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'Resident' && styles.roleBtnActive]}
              onPress={() => setRole('Resident')}
            >
              <AppText variant="body" weight={role === 'Resident' ? '600' : '400'} color={role === 'Resident' ? theme.colors.surface : theme.colors.text}>
                Resident
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.roleBtn, role === 'Collector' && styles.roleBtnActive]}
              onPress={() => setRole('Collector')}
            >
              <AppText variant="body" weight={role === 'Collector' ? '600' : '400'} color={role === 'Collector' ? theme.colors.surface : theme.colors.text}>
                Collector
              </AppText>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        <Animatable.View animation="fadeInLeft" delay={300}>
          <AppInput
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </Animatable.View>
        <Animatable.View animation="fadeInLeft" delay={350}>
          <AppInput
            label="Email Address"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Animatable.View>
        <Animatable.View animation="fadeInLeft" delay={400}>
          <AppInput
            label="Phone Number"
            placeholder="Enter your phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </Animatable.View>
        <Animatable.View animation="fadeInLeft" delay={450}>
          <AppInput
            label="Home/Business Address"
            placeholder="Enter your full address"
            value={address}
            onChangeText={setAddress}
          />
        </Animatable.View>
        <Animatable.View animation="fadeInLeft" delay={500}>
          <AppInput
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            isPassword
          />
        </Animatable.View>

        <Animatable.View animation="fadeInUp" delay={600}>
          <AppButton 
            title="Sign Up" 
            fullWidth 
            style={styles.signUpBtn}
            loading={isLoading}
            onPress={handleSignup}
          />
        </Animatable.View>
      </View>

      <Animatable.View animation="fadeInUp" delay={700} style={styles.footer}>
        <AppText variant="body" color={theme.colors.textSecondary}>Already have an account? </AppText>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <AppText variant="body" weight="600" color={theme.colors.primary}>Sign In</AppText>
        </TouchableOpacity>
      </Animatable.View>
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
  roleSelector: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  roleBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  signUpBtn: {
    marginTop: theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  }
});
