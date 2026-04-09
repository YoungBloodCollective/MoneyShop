import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

interface DSMenuItemProps {
  icon: string;
  label: string;
  description?: string;
  onPress: () => void;
  rightElement?: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  style?: ViewStyle;
  danger?: boolean;
}

const DSMenuItem: React.FC<DSMenuItemProps> = ({
  icon,
  label,
  description,
  onPress,
  rightElement,
  iconColor,
  iconBgColor,
  style,
  danger = false,
}) => {
  const finalIconColor = danger
    ? colors.error[400]
    : iconColor || colors.brand.primary;
  const finalIconBg = danger
    ? colors.error[50]
    : iconBgColor || `${colors.brand.primary}15`;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.container, style]}>
      <View style={[styles.iconContainer, {backgroundColor: finalIconBg}]}>
        <Icon name={icon} size={20} color={finalIconColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, danger && styles.dangerLabel]}>{label}</Text>
        {description && <Text style={styles.description}>{description}</Text>}
      </View>
      {rightElement !== null && (rightElement || (
        <Icon name="chevron-right" size={20} color={colors.light[50]} />
      ))}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark[400],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.labelMedium,
    color: colors.light[90],
  },
  dangerLabel: {
    color: colors.error[400],
  },
  description: {
    ...typography.caption,
    color: colors.light[60],
    marginTop: 2,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});

export default DSMenuItem;
