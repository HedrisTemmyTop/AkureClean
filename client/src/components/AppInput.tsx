import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { theme } from '../theme';
import { AppText } from './AppText';
import { Eye, EyeOff } from 'lucide-react-native';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export const AppInput: React.FC<AppInputProps> = ({
  label,
  error,
  isPassword,
  style,
  ...props
}) => {
  const [isSecure, setIsSecure] = useState(isPassword);
  // Use Animated.Value to drive border colour — no re-render on focus change
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = useCallback(
    (e: any) => {
      Animated.timing(borderAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
      props.onFocus?.(e);
    },
    [props.onFocus],
  );

  const handleBlur = useCallback(
    (e: any) => {
      Animated.timing(borderAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }).start();
      props.onBlur?.(e);
    },
    [props.onBlur],
  );

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? theme.colors.error : theme.colors.border,
      theme.colors.primary,
    ],
  });

  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? theme.colors.error + '05' : theme.colors.surface,
      theme.colors.primary + '05',
    ],
  });

  return (
    <View style={styles.container}>
      {label && (
        <AppText variant="bodySmall" weight="600" color={theme.colors.textSecondary} style={styles.label}>
          {label}
        </AppText>
      )}

      <Animated.View
        style={[
          styles.inputContainer,
          { borderColor, backgroundColor: bgColor },
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={isSecure}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setIsSecure(!isSecure)}
          >
            {isSecure ? (
              <Eye color={theme.colors.textSecondary} size={20} />
            ) : (
              <EyeOff color={theme.colors.textSecondary} size={20} />
            )}
          </TouchableOpacity>
        )}
      </Animated.View>

      {error ? (
        <AppText variant="caption" color={theme.colors.error} style={styles.errorText}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    marginBottom: theme.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.body.fontSize,
    fontFamily: 'System',
    color: theme.colors.text,
  },
  eyeIcon: {
    padding: theme.spacing.sm,
  },
  errorText: {
    marginTop: theme.spacing.xs,
  },
});
