import React from 'react';
import { View, StyleSheet, ScrollView, ViewProps, ScrollViewProps, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import { theme } from '../theme';

interface ScreenContainerProps extends ViewProps {
  scrollable?: boolean;
  padded?: boolean;
  scrollViewProps?: ScrollViewProps;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  scrollable = false,
  padded = true,
  children,
  style,
  scrollViewProps,
  ...props
}) => {
  const content = scrollable ? (
    <ScrollView 
      contentContainerStyle={[padded && styles.padded, style]} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.container, padded && styles.padded, style]} {...props}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1 }}>
          {content}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  padded: {
    padding: theme.spacing.md,
  },
});
