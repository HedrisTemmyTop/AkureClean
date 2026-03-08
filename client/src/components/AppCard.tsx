import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { theme } from '../theme';
import * as Animatable from 'react-native-animatable';

interface AppCardProps extends ViewProps {
  elevation?: keyof typeof theme.shadows | 'none';
  padded?: boolean;
  animation?: Animatable.Animation;
  delay?: number;
  duration?: number;
  useNativeDriver?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({
  style,
  elevation = 'sm',
  padded = true,
  animation,
  delay,
  duration = 400,
  useNativeDriver = true,
  children,
  ...props
}) => {
  const CardContainer = animation ? Animatable.View : View;
  
  return (
    <CardContainer
      animation={animation as any}
      delay={delay}
      duration={duration}
      useNativeDriver={useNativeDriver}
      style={[
        styles.card,
        elevation !== 'none' && theme.shadows[elevation],
        padded && styles.padded,
        style,
      ]}
      {...(props as any)}
    >
      {children}
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  padded: {
    padding: theme.spacing.md,
  },
});
