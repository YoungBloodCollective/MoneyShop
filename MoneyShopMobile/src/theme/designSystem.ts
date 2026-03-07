/**
 * MoneyShop Design System
 *
 * Inspired by Revolut's premium fintech aesthetic:
 * - Dark-mode dominant with high contrast
 * - Bold gradients (blue-to-pink, purple-to-blue)
 * - Pill-shaped buttons, generous spacing
 * - Clean typography with strong hierarchy
 *
 * UX Principles (SRS):
 * - 1 screen = 1 decision
 * - Large text, large buttons
 * - No technical details exposed
 * - Clear confirmations
 * - Super simple UX (18-70 years)
 */

// Revolut-inspired color palette
export const colors = {
  // Brand
  brand: {
    primary: '#0075EB',    // Revolut blue - main CTA
    secondary: '#7F84F6',  // Cornflower - accent
    accent: '#EB008D',     // Magenta/pink - highlights
    purple: '#6E4CE5',     // Premium tier
    deepPurple: '#261073', // Gradient base
  },

  // Dark backgrounds (Revolut's shark palette)
  dark: {
    900: '#0A0B0D',  // Deepest background
    800: '#111214',  // Primary background
    700: '#191C1F',  // Card background (Shark)
    600: '#1F2226',  // Elevated surfaces
    500: '#2A2D31',  // Secondary surfaces
    400: '#3A3D41',  // Borders, dividers
    300: '#4A4D51',  // Subtle borders
  },

  // Light text & UI
  light: {
    100: '#FFFFFF',
    90: '#F0F2F5',
    80: '#D1D5DB',
    70: '#B0B3B7',
    60: '#8A8D91',
    50: '#6B7280',
    40: '#4B5563',
  },

  // Success
  success: {
    50: 'rgba(16, 185, 129, 0.1)',
    100: 'rgba(16, 185, 129, 0.15)',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
  },

  // Warning
  warning: {
    50: 'rgba(245, 158, 11, 0.1)',
    100: 'rgba(245, 158, 11, 0.15)',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },

  // Error
  error: {
    50: 'rgba(239, 68, 68, 0.1)',
    100: 'rgba(239, 68, 68, 0.15)',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
  },

  // Info
  info: {
    50: 'rgba(0, 117, 235, 0.1)',
    100: 'rgba(0, 117, 235, 0.15)',
    400: '#60A5FA',
    500: '#0075EB',
    600: '#0060C0',
  },

  // Gradients (Revolut signature)
  gradients: {
    primary: ['#0075EB', '#EB008D'],        // Blue-to-pink (signature)
    purple: ['#6E4CE5', '#0075EB'],         // Purple-to-blue (premium)
    deep: ['#261073', '#6E4CE5'],           // Deep purple
    dark: ['#0A0B0D', '#191C1F'],           // Dark surface
    card: ['#1F2226', '#191C1F'],           // Card gradient
    success: ['#059669', '#10B981'],        // Green gradient
    sunset: ['#F59E0B', '#EF4444'],         // Warning-danger
    hero: ['#0A0B0D', '#111214', '#191C1F'], // Hero section
  },
};

// Spacing (8px based, like Revolut)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  xxxxl: 80,
};

// Typography - clean, modern, strong hierarchy
export const typography = {
  // Display - hero sections
  display: {
    fontSize: 40,
    fontWeight: '800' as const,
    lineHeight: 48,
    letterSpacing: -1,
  },
  // Headings
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },
  // Body
  bodyLarge: {
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  // Labels & buttons
  labelLarge: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  labelMedium: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  // Uppercase labels (Revolut style)
  labelUppercase: {
    fontSize: 12,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  // Caption
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
};

// Border radius
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,  // Revolut pill-shaped buttons
};

// Shadows (subtle on dark backgrounds)
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  // Glow effects for accents
  glow: {
    shadowColor: '#0075EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  glowPink: {
    shadowColor: '#EB008D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
};

// Component styles
export const componentStyles = {
  // Screen container (dark bg)
  screenContainer: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  // Content padding
  contentPadding: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  // Cards (dark elevated surfaces)
  card: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  cardHighlighted: {
    backgroundColor: colors.dark[600],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  // Buttons (pill-shaped, Revolut style)
  buttonLarge: {
    minHeight: 56,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonMedium: {
    minHeight: 48,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  // Inputs (dark styled)
  inputLarge: {
    minHeight: 56,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 18,
    backgroundColor: colors.dark[600],
    color: colors.light[100],
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  // Header
  headerSection: {
    marginBottom: spacing.xl,
  },
};

// Status colors
export const statusColors: Record<string, string> = {
  active: colors.success[500],
  pending: colors.warning[500],
  expired: colors.warning[600],
  revoked: colors.error[500],
  approved: colors.success[500],
  rejected: colors.error[500],
  processing: colors.brand.primary,
};

// Status icons
export const statusIcons: Record<string, string> = {
  active: 'check-circle',
  pending: 'clock-outline',
  expired: 'calendar-remove',
  revoked: 'close-circle',
  approved: 'check-decagram',
  rejected: 'close-octagon',
  processing: 'progress-clock',
};

export const getStatusColor = (status: string): string => {
  return statusColors[status] || colors.light[60];
};

export const getStatusIcon = (status: string): string => {
  return statusIcons[status] || 'help-circle';
};

export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  componentStyles,
  statusColors,
  statusIcons,
  getStatusColor,
  getStatusIcon,
};
