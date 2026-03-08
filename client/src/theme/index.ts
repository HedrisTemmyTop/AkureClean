export const colors = {
  primary: '#0F766E', // Municipal Teal / Dark Cyan
  primaryLight: '#14B8A6',
  primaryDark: '#115E59',
  
  secondary: '#16A34A', // Vibrant Green
  secondaryLight: '#4ADE80',
  secondaryDark: '#15803D',

  background: '#F8FAFC', // Very light grey/blue tailwind
  surface: '#FFFFFF', // White
  
  text: '#1E293B', // Slate 800
  textSecondary: '#64748B', // Slate 500
  textInverse: '#FFFFFF',
  
  border: '#E2E8F0', // Slate 200
  
  status: {
    pending: '#F59E0B', // Amber 500
    active: '#3B82F6', // Blue 500
    completed: '#10B981', // Emerald 500
    cancelled: '#EF4444', // Red 500
  },
  
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6'
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h3: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2 },
  bodyLarge: { fontSize: 18, fontWeight: '500' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
};
