import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
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
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <AppText variant="bodySmall" weight="600" color={theme.colors.textSecondary} style={styles.label}>
          {label}
        </AppText>
      )}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputFocused,
        error ? styles.inputError : null,
      ]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={isSecure}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
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
      </View>

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
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '05', // tiny hint of primary background
    ...theme.shadows.sm,
  },
  inputError: {
    borderColor: theme.colors.error,
    backgroundColor: theme.colors.error + '05',
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
