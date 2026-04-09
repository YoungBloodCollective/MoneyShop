/**
 * MoneyShop Design System
 *
 * Clean, modern light theme with premium feel:
 * - White backgrounds with subtle gray surfaces
 * - Electric indigo (#2D2DF0) as primary brand color
 * - Gold (#FFC003) accents for highlights and achievements
 * - Score-centric UX with prominent FICO gauge
 * - Clean, bold typography with strong hierarchy
 *
 * UX Principles (SRS):
 * - 1 screen = 1 decision
 * - Large text, large buttons
 * - No technical details exposed
 * - Clear confirmations
 * - Super simple UX (18-70 years)
 */

export const colors = {
  brand: {
    primary: '#2D2DF0',
    secondary: '#6B6BF7',
    accent: '#FFC003',
    gold: '#FFC003',
    purple: '#6E4CE5',
    deepPurple: '#1A1A6B',
  },
  gold: {
    50: 'rgba(255, 192, 3, 0.08)',
    100: 'rgba(255, 192, 3, 0.12)',
    400: '#FFD54F',
    500: '#FFC003',
    600: '#E6AD00',
  },
  dark: {
    900: '#FFFFFF',
    800: '#F5F6F8',
    700: '#FFFFFF',
    600: '#F0F1F3',
    500: '#E5E7EB',
    400: '#D1D5DB',
    300: '#9CA3AF',
  },
  light: {
    100: '#111827',
    90: '#1F2937',
    80: '#374151',
    70: '#4B5563',
    60: '#6B7280',
    50: '#9CA3AF',
    40: '#D1D5DB',
  },
  success: {
    50: 'rgba(16, 185, 129, 0.08)',
    100: 'rgba(16, 185, 129, 0.12)',
    400: '#10B981',
    500: '#059669',
    600: '#047857',
  },
  warning: {
    50: 'rgba(245, 158, 11, 0.08)',
    100: 'rgba(245, 158, 11, 0.12)',
    400: '#F59E0B',
    500: '#D97706',
    600: '#B45309',
  },
  error: {
    50: 'rgba(239, 68, 68, 0.08)',
    100: 'rgba(239, 68, 68, 0.12)',
    400: '#EF4444',
    500: '#DC2626',
    600: '#B91C1C',
  },
  info: {
    50: 'rgba(45, 45, 240, 0.06)',
    100: 'rgba(45, 45, 240, 0.10)',
    400: '#6B6BF7',
    500: '#2D2DF0',
    600: '#2222C0',
  },
  gradients: {
    primary: ['#2D2DF0', '#6B6BF7'],
    gold: ['#FFC003', '#FFD54F'],
    purple: ['#6E4CE5', '#2D2DF0'],
    deep: ['#1A1A6B', '#6E4CE5'],
    dark: ['#F8F9FB', '#FFFFFF'],
    card: ['#FFFFFF', '#F8F9FB'],
    success: ['#059669', '#10B981'],
    sunset: ['#F59E0B', '#EF4444'],
    hero: ['#F8F9FB', '#FFFFFF', '#F8F9FB'],
  },
};

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

export const typography = {
  display: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 40,
    fontWeight: '800' as const,
    lineHeight: 48,
    letterSpacing: -1,
  },
  h1: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h4: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontFamily: 'Inter_400Regular',
    fontSize: 18,
    fontWeight: '400' as const,
    lineHeight: 28,
  },
  bodyMedium: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  labelLarge: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  labelMedium: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelSmall: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  labelUppercase: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: '#2D2DF0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  glowGold: {
    shadowColor: '#FFC003',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 3,
  },
};

export const componentStyles = {
  screenContainer: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  contentPadding: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  card: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark[400],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHighlighted: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  cardGold: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold[500],
  },
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
  headerSection: {
    marginBottom: spacing.xl,
  },
};

export const statusColors: Record<string, string> = {
  active: colors.success[500],
  pending: colors.warning[500],
  expired: colors.warning[600],
  revoked: colors.error[500],
  approved: colors.success[500],
  rejected: colors.error[500],
  processing: colors.brand.primary,
};

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
