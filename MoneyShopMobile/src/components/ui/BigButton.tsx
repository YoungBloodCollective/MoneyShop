import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography, shadows} from '../../theme/designSystem';

interface BigButtonProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'outline' | 'ghost' | 'accent' | 'gold';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const BigButton: React.FC<BigButtonProps> = ({
  title,
  subtitle,
  onPress,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
          iconColor: '#FFFFFF',
        };
      case 'secondary':
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText,
          iconColor: colors.brand.primary,
        };
      case 'success':
        return {
          container: styles.successContainer,
          text: styles.successText,
          iconColor: '#FFFFFF',
        };
      case 'outline':
        return {
          container: styles.outlineContainer,
          text: styles.outlineText,
          iconColor: colors.light[100],
        };
      case 'ghost':
        return {
          container: styles.ghostContainer,
          text: styles.ghostText,
          iconColor: colors.brand.primary,
        };
      case 'accent':
        return {
          container: styles.accentContainer,
          text: styles.accentText,
          iconColor: '#FFFFFF',
        };
      case 'gold':
        return {
          container: styles.goldContainer,
          text: styles.goldText,
          iconColor: colors.dark[900],
        };
      default:
        return {
          container: styles.primaryContainer,
          text: styles.primaryText,
          iconColor: '#FFFFFF',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.container,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variantStyles.iconColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Icon
              name={icon}
              size={22}
              color={variantStyles.iconColor}
              style={styles.iconLeft}
            />
          )}
          <View style={styles.textContainer}>
            <Text style={[styles.title, variantStyles.text, textStyle]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[styles.subtitle, {color: variantStyles.iconColor}]}>
                {subtitle}
              </Text>
            )}
          </View>
          {icon && iconPosition === 'right' && (
            <Icon
              name={icon}
              size={22}
              color={variantStyles.iconColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    ...typography.labelLarge,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
    opacity: 0.8,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  // Variants - Revolut style
  primaryContainer: {
    backgroundColor: colors.brand.primary,
    ...shadows.glow,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryContainer: {
    backgroundColor: colors.dark[600],
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  secondaryText: {
    color: colors.light[100],
  },
  successContainer: {
    backgroundColor: colors.success[500],
  },
  successText: {
    color: '#FFFFFF',
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.light[70],
  },
  outlineText: {
    color: colors.light[100],
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.brand.primary,
  },
  accentContainer: {
    backgroundColor: colors.brand.purple,
    ...shadows.md,
  },
  accentText: {
    color: '#FFFFFF',
  },
  goldContainer: {
    backgroundColor: colors.gold[500],
    ...shadows.glowGold,
  },
  goldText: {
    color: colors.dark[900],
  },
});

export default BigButton;
