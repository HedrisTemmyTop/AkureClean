import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface AppTextProps extends TextProps {
  variant?: keyof typeof theme.typography;
  color?: string;
  weight?: 'normal' | 'bold' | '400' | '600' | '700';
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export const AppText: React.FC<AppTextProps> = ({
  style,
  variant = 'body',
  color = theme.colors.text,
  weight,
  align = 'auto',
  children,
  ...props
}) => {
  const typographyStyle = theme.typography[variant];
  
  return (
    <Text
      style={[
        styles.base,
        typographyStyle,
        { color, textAlign: align },
        weight ? { fontWeight: weight } : {},
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  base: {
    fontFamily: 'System',
  },
});
