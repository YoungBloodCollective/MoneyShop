import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

type StatusType = 'active' | 'pending' | 'expired' | 'revoked' | 'approved' | 'rejected' | 'processing';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'medium',
  showIcon = true,
}) => {
  const getStatusConfig = () => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'activ':
        return {
          label: label || 'Activ',
          icon: 'check-circle',
          backgroundColor: colors.success[50],
          textColor: colors.success[400],
          iconColor: colors.success[500],
        };
      case 'pending':
      case 'in asteptare':
        return {
          label: label || 'In asteptare',
          icon: 'clock-outline',
          backgroundColor: colors.warning[50],
          textColor: colors.warning[400],
          iconColor: colors.warning[500],
        };
      case 'expired':
      case 'expirat':
        return {
          label: label || 'Expirat',
          icon: 'calendar-remove',
          backgroundColor: colors.warning[50],
          textColor: colors.warning[400],
          iconColor: colors.warning[600],
        };
      case 'revoked':
      case 'revocat':
        return {
          label: label || 'Revocat',
          icon: 'close-circle',
          backgroundColor: colors.error[50],
          textColor: colors.error[400],
          iconColor: colors.error[500],
        };
      case 'approved':
      case 'aprobat':
        return {
          label: label || 'Aprobat',
          icon: 'check-decagram',
          backgroundColor: colors.success[50],
          textColor: colors.success[400],
          iconColor: colors.success[500],
        };
      case 'rejected':
      case 'refuzat':
      case 'respins':
        return {
          label: label || 'Refuzat',
          icon: 'close-octagon',
          backgroundColor: colors.error[50],
          textColor: colors.error[400],
          iconColor: colors.error[500],
        };
      case 'processing':
      case 'in_procesare':
      case 'in procesare':
        return {
          label: label || 'In procesare',
          icon: 'progress-clock',
          backgroundColor: colors.info[50],
          textColor: colors.brand.primary,
          iconColor: colors.brand.primary,
        };
      default:
        return {
          label: label || status,
          icon: 'information',
          backgroundColor: colors.dark[500],
          textColor: colors.light[80],
          iconColor: colors.light[60],
        };
    }
  };

  const config = getStatusConfig();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.containerSmall,
          text: styles.textSmall,
          iconSize: 14,
        };
      case 'large':
        return {
          container: styles.containerLarge,
          text: styles.textLarge,
          iconSize: 22,
        };
      default:
        return {
          container: styles.containerMedium,
          text: styles.textMedium,
          iconSize: 18,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        {backgroundColor: config.backgroundColor},
      ]}>
      {showIcon && (
        <Icon
          name={config.icon}
          size={sizeStyles.iconSize}
          color={config.iconColor}
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, sizeStyles.text, {color: config.textColor}]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.pill,
    alignSelf: 'flex-start',
  },
  containerSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  containerMedium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  containerLarge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  icon: {
    marginRight: spacing.xs,
  },
  text: {
    fontWeight: '600',
  },
  textSmall: {
    ...typography.caption,
  },
  textMedium: {
    ...typography.labelSmall,
  },
  textLarge: {
    ...typography.labelMedium,
  },
});

export default StatusBadge;
