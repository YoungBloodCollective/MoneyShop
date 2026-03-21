import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Svg, {Circle, G} from 'react-native-svg';
import {colors, typography} from '../../theme/designSystem';

interface FicoGaugeProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 700) return colors.gold[500];
  if (score >= 500) return colors.brand.primary;
  if (score >= 300) return colors.warning[500];
  return colors.error[500];
};

const getScoreLabel = (score: number): string => {
  if (score >= 750) return 'Excelent';
  if (score >= 700) return 'Foarte bun';
  if (score >= 650) return 'Bun';
  if (score >= 500) return 'Moderat';
  if (score >= 300) return 'Scăzut';
  return 'Foarte scăzut';
};

const FicoGauge: React.FC<FicoGaugeProps> = ({
  score,
  maxScore = 850,
  size = 160,
  strokeWidth = 12,
  label,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / maxScore, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const scoreColor = getScoreColor(score);

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.dark[500]}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={[styles.scoreText, {color: scoreColor, fontSize: size * 0.22}]}>
          {score}
        </Text>
        <Text style={[styles.labelText, {fontSize: size * 0.085}]}>
          {label || getScoreLabel(score)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: '800',
    letterSpacing: -1,
  },
  labelText: {
    color: colors.light[60],
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
  },
});

export default FicoGauge;
