import React from 'react';
import {View, StyleSheet, Platform, StatusBar, TouchableOpacity, Text} from 'react-native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, typography} from '../theme/designSystem';

interface CustomHeaderProps {
  title?: string;
  onBack?: () => void;
  showLogo?: boolean;
  rightActions?: React.ReactNode;
  transparent?: boolean;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  onBack,
  showLogo = true,
  rightActions,
  transparent = false,
}) => {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={colors.dark[800]} />
      <View
        style={[
          styles.header,
          transparent && styles.transparentHeader,
        ]}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={22} color={colors.light[100]} />
          </TouchableOpacity>
        )}
        {showLogo && !onBack && (
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>
              MoneyShop<Text style={styles.logoReg}>®</Text>
            </Text>
          </View>
        )}
        {title && (!showLogo || onBack) && (
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
          </View>
        )}
        {rightActions && (
          <View style={styles.rightActions}>{rightActions}</View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.dark[800],
    height: Platform.OS === 'ios' ? 96 : 64,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[400],
  },
  transparentHeader: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.light[100],
    letterSpacing: -0.5,
  },
  logoReg: {
    fontSize: 10,
    fontWeight: '400',
    color: colors.light[60],
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.h4,
    color: colors.light[100],
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.dark[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
});

export default CustomHeader;
