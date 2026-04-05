import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

/**
 * Light Business Theme
 * Professional, clean, and accessible color palette with Inter font
 */

export const colors = {
  // Backgrounds
  background: '#F8F9FA',
  backgroundSecondary: '#FFFFFF',
  surface: '#FFFFFF',
  
  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  
  // Primary & Accents
  primary: '#1E40AF',
  primaryLight: '#3B82F6',
  primaryLighter: '#DBEAFE',
  
  // Semantic colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  // Borders & Dividers
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#E5E7EB',
  
  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Shadows (for web)
  shadowColor: 'rgba(0, 0, 0, 0.1)',
};

export const fonts = {
  regular: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400' as const,
  },
  medium: {
    fontFamily: 'Inter_500Medium',
    fontWeight: '500' as const,
  },
  semibold: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600' as const,
  },
};

export const typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    ...fonts.semibold,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    ...fonts.semibold,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    ...fonts.semibold,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    ...fonts.semibold,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    ...fonts.regular,
  },
  bodyMedium: {
    fontSize: 16,
    lineHeight: 24,
    ...fonts.medium,
  },
  bodySemibold: {
    fontSize: 16,
    lineHeight: 24,
    ...fonts.semibold,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    ...fonts.regular,
  },
  captionMedium: {
    fontSize: 12,
    lineHeight: 16,
    ...fonts.medium,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    ...fonts.medium,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const theme = {
  colors,
  fonts,
  typography,
  spacing,
  borderRadius,
};

export default theme;

// Font loading hook
export const useFontsTheme = () => {
  return useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
};
