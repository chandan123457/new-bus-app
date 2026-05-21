/**
 * Theme Constants
 * Centralized design system for consistent UI/UX across the application
 * All color, spacing, typography, and shadow values are defined here
 */

export const COLORS = {
  // Primary Brand Colors
  primary: '#1E88E5',
  primaryDark: '#1565C0',
  primaryLight: '#42A5F5',
  
  // Secondary Colors
  secondary: '#FF6B35',
  secondaryDark: '#E55A2B',
  secondaryLight: '#FF8A65',
  
  // Neutral Colors
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  grayLight: '#D1D5DB',
  grayDark: '#374151',
  
  // Background Colors
  background: '#F9FAFB',
  surface: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.65)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',
  
  // Status Colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Text Colors
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textWhite: '#FFFFFF',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const TYPOGRAPHY = {
  // Font Sizes
  h1: 32,
  h2: 28,
  h3: 24,
  h4: 20,
  h5: 18,
  h6: 16,
  body: 14,
  caption: 12,
  small: 10,
  
  // Font Weights
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const BORDER_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const SHADOWS = {
  small: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  premium: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
};

export const LAYOUT = {
  screenPadding: SPACING.md,
  containerMaxWidth: 600,
};
