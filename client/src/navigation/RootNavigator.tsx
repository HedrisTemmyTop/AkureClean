import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AuthStack } from './AuthStack';
import { RoleNavigator } from './RoleNavigator';
import { SplashScreen } from '../screens/auth/SplashScreen';

export const RootNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {user ? <RoleNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
};
