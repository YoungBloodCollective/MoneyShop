import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, ViewStyle} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

interface InfoCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  iconColor?: string;
  iconBackgroundColor?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'primary';
  onPress?: () => void;
  style?: ViewStyle;
  large?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  iconColor,
  iconBackgroundColor,
  variant = 'default',
  onPress,
  style,
  large = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          borderColor: `${colors.success[500]}30`,
          backgroundColor: colors.dark[700],
          valueColor: colors.success[400],
          defaultIconBg: colors.success[50],
          defaultIconColor: colors.success[500],
        };
      case 'warning':
        return {
          borderColor: `${colors.warning[500]}30`,
          backgroundColor: colors.dark[700],
          valueColor: colors.warning[400],
          defaultIconBg: colors.warning[50],
          defaultIconColor: colors.warning[500],
        };
      case 'error':
        return {
          borderColor: `${colors.error[500]}30`,
          backgroundColor: colors.dark[700],
          valueColor: colors.error[400],
          defaultIconBg: colors.error[50],
          defaultIconColor: colors.error[500],
        };
      case 'primary':
        return {
          borderColor: `${colors.brand.primary}30`,
          backgroundColor: colors.dark[700],
          valueColor: colors.brand.primary,
          defaultIconBg: colors.info[50],
          defaultIconColor: colors.brand.primary,
        };
      default:
        return {
          borderColor: colors.dark[400],
          backgroundColor: colors.dark[700],
          valueColor: colors.light[100],
          defaultIconBg: colors.dark[500],
          defaultIconColor: colors.light[80],
        };
    }
  };

  const variantStyles = getVariantStyles();

  const CardContent = (
    <View
      style={[
        styles.container,
        large && styles.containerLarge,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
        },
        style,
      ]}>
      {icon && (
        <View
          style={[
            styles.iconContainer,
            large && styles.iconContainerLarge,
            {
              backgroundColor: iconBackgroundColor || variantStyles.defaultIconBg,
            },
          ]}>
          <Icon
            name={icon}
            size={large ? 28 : 24}
            color={iconColor || variantStyles.defaultIconColor}
          />
        </View>
      )}
      <View style={styles.textContainer}>
        <Text style={[styles.title, large && styles.titleLarge]}>{title}</Text>
        <Text
          style={[
            styles.value,
            large && styles.valueLarge,
            {color: variantStyles.valueColor},
          ]}>
          {value}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, large && styles.subtitleLarge]}>
            {subtitle}
          </Text>
        )}
      </View>
      {onPress && (
        <Icon
          name="chevron-right"
          size={24}
          color={colors.dark[300]}
          style={styles.chevron}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {CardContent}
      </TouchableOpacity>
    );
  }

  return CardContent;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  containerLarge: {
    padding: spacing.xl,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerLarge: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    marginRight: spacing.lg,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...typography.labelMedium,
    color: colors.light[60],
    marginBottom: 4,
  },
  titleLarge: {
    ...typography.labelLarge,
    marginBottom: 6,
  },
  value: {
    ...typography.h4,
  },
  valueLarge: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.caption,
    color: colors.light[50],
    marginTop: 4,
  },
  subtitleLarge: {
    ...typography.bodySmall,
    marginTop: 6,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});

export default InfoCard;
