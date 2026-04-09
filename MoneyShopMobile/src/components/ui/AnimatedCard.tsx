import React, {useEffect, useRef} from 'react';
import {Animated, ViewStyle} from 'react-native';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
  slideFrom?: 'bottom' | 'left' | 'right' | 'none';
  slideDistance?: number;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  duration = 400,
  style,
  slideFrom = 'bottom',
  slideDistance = 20,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(
    slideFrom === 'none' ? 0 : slideDistance
  )).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translate, delay, duration]);

  const transformStyle = slideFrom === 'none' ? {} :
    slideFrom === 'left' || slideFrom === 'right'
      ? { transform: [{ translateX: translate }] }
      : { transform: [{ translateY: translate }] };

  return (
    <Animated.View style={[{ opacity }, transformStyle, style]}>
      {children}
    </Animated.View>
  );
};

export default AnimatedCard;
