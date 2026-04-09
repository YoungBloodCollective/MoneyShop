import React, {useState} from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

interface DSTextInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  leftIcon?: string;
  suffix?: string;
  containerStyle?: ViewStyle;
  secureTextEntry?: boolean;
}

const DSTextInput: React.FC<DSTextInputProps> = ({
  label,
  error,
  leftIcon,
  suffix,
  containerStyle,
  secureTextEntry,
  ...inputProps
}) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSecure = secureTextEntry && !showPassword;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
        ]}>
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={20}
            color={focused ? colors.brand.primary : colors.light[60]}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.light[50]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={isSecure}
          {...inputProps}
        />
        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            activeOpacity={0.7}>
            <Icon
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.light[60]}
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={14} color={colors.error[400]} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.labelUppercase,
    color: colors.light[60],
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[600],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark[400],
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  inputWrapperFocused: {
    borderColor: colors.brand.primary,
  },
  inputWrapperError: {
    borderColor: colors.error[400],
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.light[90],
    paddingVertical: spacing.md,
  },
  suffix: {
    ...typography.labelMedium,
    color: colors.light[50],
    marginLeft: spacing.sm,
  },
  eyeButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error[400],
  },
});

export default DSTextInput;
