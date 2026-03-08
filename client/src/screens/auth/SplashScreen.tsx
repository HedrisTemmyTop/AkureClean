import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Trash2 } from 'lucide-react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { theme } from '../../theme';

export const SplashScreen: React.FC = () => {
  return (
    <ScreenContainer style={styles.container}>
      <Animatable.View animation="bounceInDown" duration={1500} style={styles.content}>
        <Trash2 color={theme.colors.surface} size={64} />
      </Animatable.View>
      
      <Animatable.View animation="fadeInUp" delay={800}>
        <AppText variant="h1" color={theme.colors.primary} style={styles.title}>
            SmartWaste
        </AppText>
      </Animatable.View>
      
      <AppText variant="body" color={theme.colors.textSecondary} style={styles.subtitle}>
          Cleaner cities, smarter living
      </AppText>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </ScreenContainer>
  );
};
const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    marginBottom: theme.spacing.xl,
  },
});
