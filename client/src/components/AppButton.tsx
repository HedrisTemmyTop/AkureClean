import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import { theme } from '../theme';
import { AppText } from './AppText';

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  fullWidth = false,
  disabled,
  style,
  textStyle,
  icon,
  ...props
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return { backgroundColor: theme.colors.primary, borderWidth: 0 };
      case 'secondary':
        return { backgroundColor: theme.colors.secondary, borderWidth: 0 };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        };
      case 'ghost':
        return { backgroundColor: 'transparent', borderWidth: 0 };
      default:
        return { backgroundColor: theme.colors.primary, borderWidth: 0 };
    }
  };

  const getTextColor = (): string => {
    if (disabled) return theme.colors.textSecondary;
    if (variant === 'outline' || variant === 'ghost') return theme.colors.primary;
    return theme.colors.textInverse;
  };

  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'small':
        return { paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.sm };
      case 'large':
        return { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.lg };
      case 'medium':
      default:
        return { paddingVertical: theme.spacing.sm + 4, paddingHorizontal: theme.spacing.md };
    }
  };

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      onPressIn={(e) => {
        setIsPressed(true);
        if (props.onPressIn) props.onPressIn(e);
      }}
      onPressOut={(e) => {
        setIsPressed(false);
        if (props.onPressOut) props.onPressOut(e);
      }}
      style={[
        styles.base,
        getVariantStyles(),
        getSizeStyles(),
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        isPressed && !disabled && !loading && { transform: [{ scale: 0.98 }] },
        style,
      ]}
      activeOpacity={0.9}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon && <React.Fragment>{icon}</React.Fragment>}
          <AppText
            variant={size === 'small' ? 'bodySmall' : 'body'}
            weight="600"
            color={getTextColor()}
            align="center"
            style={[textStyle, icon ? { marginLeft: theme.spacing.xs } : null]}
          >
            {title}
          </AppText>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});
