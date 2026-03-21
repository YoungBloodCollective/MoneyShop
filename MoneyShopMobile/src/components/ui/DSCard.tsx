import React from 'react';
import {View, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import {colors, spacing, borderRadius, shadows} from '../../theme/designSystem';

interface DSCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'highlighted' | 'gradient' | 'gold';
  noPadding?: boolean;
}

const DSCard: React.FC<DSCardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
  noPadding = false,
}) => {
  const cardStyle = [
    styles.card,
    variant === 'highlighted' && styles.highlighted,
    variant === 'gradient' && styles.gradient,
    variant === 'gold' && styles.gold,
    noPadding && styles.noPadding,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={cardStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  highlighted: {
    borderColor: `${colors.brand.primary}30`,
    backgroundColor: colors.dark[700],
  },
  gradient: {
    borderColor: `${colors.brand.primary}20`,
    backgroundColor: `${colors.brand.primary}08`,
  },
  gold: {
    borderColor: colors.gold[500],
    backgroundColor: colors.dark[700],
  },
  noPadding: {
    padding: 0,
  },
});

export default DSCard;
