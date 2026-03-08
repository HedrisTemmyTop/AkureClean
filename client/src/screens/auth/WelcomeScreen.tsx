import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { AppText } from '../../components/AppText';
import { AppButton } from '../../components/AppButton';
import { theme } from '../../theme';

// Temporary navigation prop type until we set up proper React Navigation types
export const WelcomeScreen: React.FC<any> = ({ navigation }) => {
  return (
    <ScreenContainer scrollable={false} style={styles.container}>
      <View style={styles.imageContainer}>
        {/* Placeholder for a nice illustration */}
        <View style={styles.placeholderImage}>
          <AppText variant="h2" color={theme.colors.primaryLight}>Logo</AppText>
        </View>
      </View>

      <View style={styles.textContainer}>
        <AppText variant="h1" align="center" style={styles.title}>
          Eco-Friendly Delivery
        </AppText>
        <AppText variant="bodyLarge" align="center" color={theme.colors.textSecondary} style={styles.subtitle}>
          Manage your waste collection easily and effectively. Join us in making the world cleaner.
        </AppText>
      </View>

      <View style={styles.buttonContainer}>
        <AppButton 
          title="Get Started" 
          size="large"
          fullWidth
          onPress={() => navigation.navigate('Login')}
        />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderImage: {
    width: 200,
    height: 200,
    borderRadius: theme.borderRadius.round,
    backgroundColor: theme.colors.primary + '20', // transparent primary
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 2,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'center',
  },
  title: {
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    lineHeight: 24,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: theme.spacing.xl,
  },
});
