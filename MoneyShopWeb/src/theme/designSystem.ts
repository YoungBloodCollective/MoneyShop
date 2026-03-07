/**
 * MoneyShop Design System — Web version
 * Same tokens as mobile, exported for use in Tailwind theme + inline styles
 */

export const colors = {
  brand: {
    primary: '#0075EB',
    secondary: '#7F84F6',
    accent: '#EB008D',
    purple: '#6E4CE5',
    deepPurple: '#261073',
  },
  dark: {
    900: '#0A0B0D',
    800: '#111214',
    700: '#191C1F',
    600: '#1F2226',
    500: '#2A2D31',
    400: '#3A3D41',
    300: '#4A4D51',
  },
  light: {
    100: '#FFFFFF',
    90: '#F0F2F5',
    80: '#D1D5DB',
    70: '#B0B3B7',
    60: '#8A8D91',
    50: '#6B7280',
    40: '#4B5563',
  },
  success: {
    50: 'rgba(16, 185, 129, 0.1)',
    100: 'rgba(16, 185, 129, 0.15)',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
  },
  warning: {
    50: 'rgba(245, 158, 11, 0.1)',
    100: 'rgba(245, 158, 11, 0.15)',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
  },
  error: {
    50: 'rgba(239, 68, 68, 0.1)',
    100: 'rgba(239, 68, 68, 0.15)',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
  },
  info: {
    50: 'rgba(0, 117, 235, 0.1)',
    100: 'rgba(0, 117, 235, 0.15)',
    400: '#60A5FA',
    500: '#0075EB',
    600: '#0060C0',
  },
  gradients: {
    primary: ['#0075EB', '#EB008D'],
    purple: ['#6E4CE5', '#0075EB'],
    deep: ['#261073', '#6E4CE5'],
    dark: ['#0A0B0D', '#191C1F'],
    card: ['#1F2226', '#191C1F'],
    success: ['#059669', '#10B981'],
    sunset: ['#F59E0B', '#EF4444'],
    hero: ['#0A0B0D', '#111214', '#191C1F'],
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

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,
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

export const getStatusColor = (status: string): string => {
  return statusColors[status] || colors.light[60];
};

export default {
  colors,
  spacing,
  borderRadius,
  statusColors,
  getStatusColor,
};
