import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet, Animated, Easing} from 'react-native';
import Svg, {Path, Circle, G, Defs, LinearGradient, Stop} from 'react-native-svg';
import {colors} from '../../theme/designSystem';

interface FicoGaugeProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  animated?: boolean;
}

const getScoreColor = (score: number): string => {
  if (score >= 700) return '#10B981';
  if (score >= 600) return '#FFC003';
  if (score >= 500) return '#F59E0B';
  if (score >= 300) return '#EF4444';
  return '#DC2626';
};

const getScoreLabel = (score: number): string => {
  if (score >= 750) return 'Excelent';
  if (score >= 700) return 'Foarte bun';
  if (score >= 650) return 'Bun';
  if (score >= 500) return 'Moderat';
  if (score >= 300) return 'Scazut';
  return 'Foarte scazut';
};

const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
};

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
};

const FicoGauge: React.FC<FicoGaugeProps> = ({
  score,
  maxScore = 850,
  size = 160,
  strokeWidth = 14,
  label,
  animated = true,
}) => {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score);
  const animValue = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2 - 4;
  const startAngle = -225;
  const endAngle = 45;
  const totalArc = endAngle - startAngle;
  const progress = Math.min(Math.max(score / maxScore, 0), 1);
  const scoreAngle = startAngle + totalArc * (animated ? displayScore / maxScore : progress);

  useEffect(() => {
    if (!animated || hasAnimated.current) return;
    hasAnimated.current = true;

    const listener = animValue.addListener(({value}) => {
      setDisplayScore(Math.round(value));
    });

    Animated.timing(animValue, {
      toValue: score,
      duration: 1800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => animValue.removeListener(listener);
  }, [score, animated, animValue]);

  const scoreColor = getScoreColor(displayScore || score);
  const bgArcPath = describeArc(cx, cy, radius, startAngle, endAngle);
  const currentProgress = Math.min(displayScore / maxScore, 1);
  const fillAngle = startAngle + totalArc * currentProgress;
  const fillArcPath = currentProgress > 0.01 ? describeArc(cx, cy, radius, startAngle, fillAngle) : '';

  const needleAngle = startAngle + totalArc * currentProgress;
  const needleTip = polarToCartesian(cx, cy, radius - 8, needleAngle);
  const needleBase1 = polarToCartesian(cx, cy, 6, needleAngle - 90);
  const needleBase2 = polarToCartesian(cx, cy, 6, needleAngle + 90);

  const tickMarks = [];
  const tickCount = 9;
  for (let i = 0; i <= tickCount; i++) {
    const angle = startAngle + (totalArc / tickCount) * i;
    const outer = polarToCartesian(cx, cy, radius + strokeWidth / 2 + 2, angle);
    const inner = polarToCartesian(cx, cy, radius + strokeWidth / 2 - 4, angle);
    const isMajor = i % 3 === 0;
    tickMarks.push(
      <Path
        key={`tick-${i}`}
        d={`M ${outer.x} ${outer.y} L ${inner.x} ${inner.y}`}
        stroke={isMajor ? colors.light[60] : colors.light[50]}
        strokeWidth={isMajor ? 2 : 1}
        strokeLinecap="round"
      />
    );
  }

  const scoreLabels = [300, 500, 700, 850];
  const labelElements = scoreLabels.map((val, i) => {
    const angle = startAngle + totalArc * (val / maxScore);
    const pos = polarToCartesian(cx, cy, radius - strokeWidth - 8, angle);
    return (
      <Text
        key={`label-${i}`}
        style={[styles.tickLabel, {
          position: 'absolute',
          left: pos.x - 14,
          top: pos.y - 6,
        }]}
      >
        {val}
      </Text>
    );
  });

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#DC2626" />
            <Stop offset="0.35" stopColor="#F59E0B" />
            <Stop offset="0.65" stopColor="#FFC003" />
            <Stop offset="1" stopColor="#10B981" />
          </LinearGradient>
        </Defs>

        {tickMarks}

        <Path
          d={bgArcPath}
          stroke={colors.dark[500]}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />

        {fillArcPath ? (
          <Path
            d={fillArcPath}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        ) : null}

        <Circle cx={cx} cy={cy} r={8} fill={colors.light[60]} />

        {currentProgress > 0.01 && (
          <Path
            d={`M ${needleTip.x} ${needleTip.y} L ${needleBase1.x} ${needleBase1.y} L ${needleBase2.x} ${needleBase2.y} Z`}
            fill={scoreColor}
          />
        )}

        <Circle cx={cx} cy={cy} r={4} fill={scoreColor} />
      </Svg>

      <View style={[styles.scoreContainer, {top: cy + 10}]}>
        <Text style={[styles.scoreText, {color: scoreColor, fontSize: size * 0.2}]}>
          {displayScore || score}
        </Text>
        <Text style={[styles.labelText, {fontSize: size * 0.075}]}>
          {label || getScoreLabel(displayScore || score)}
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
  scoreContainer: {
    position: 'absolute',
    alignItems: 'center',
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
  tickLabel: {
    fontSize: 8,
    color: colors.light[50],
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default FicoGauge;
