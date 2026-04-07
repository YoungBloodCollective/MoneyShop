import React from 'react';
import {View, StyleSheet, Text, Image} from 'react-native';
import {colors} from '../theme/designSystem';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
}

const logoImage = require('../../assets/images/logo/Logo.PNG');

const Logo: React.FC<LogoProps> = ({size = 'medium', showTagline = false}) => {
  const sizeMap = {
    small: { width: 160, height: 50 },
    medium: { width: 240, height: 75 },
    large: { width: 300, height: 94 },
  };

  const currentSize = sizeMap[size];

  return (
    <View style={styles.container}>
      <Image
        source={logoImage}
        style={{ width: currentSize.width, height: currentSize.height }}
        resizeMode="contain"
      />
      {showTagline && (
        <Text style={styles.tagline}>Simplu. Rapid. Transparent.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    color: colors.light[50],
    fontWeight: '400',
    letterSpacing: 0.8,
  },
});

export default Logo;
