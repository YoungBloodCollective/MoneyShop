import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {ScoringResult} from '../../types/application.types';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {LineChart} from 'react-native-chart-kit';
import {Dimensions} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

type SimulatorResultScreenNavigationProp = NativeStackNavigationProp<any>;

interface Props {
  navigation: SimulatorResultScreenNavigationProp;
  route: {
    params: {
      result: ScoringResult;
    };
  };
}

const SimulatorResultScreen: React.FC<Props> = ({navigation, route}) => {
  const {result} = route.params;

  const getScoringEmoji = (level: string) => {
    switch (level) {
      case 'foarte_mare':
        return '1️⃣';
      case 'mare':
        return '2️⃣';
      case 'bun':
        return '3️⃣';
      case 'conditii_speciale':
        return '4️⃣';
      case 'foarte_scazut':
        return '5️⃣';
      default:
        return '';
    }
  };

  const getScoringText = (level: string) => {
    switch (level) {
      case 'foarte_mare':
        return 'Sanse foarte mari';
      case 'mare':
        return 'Sanse bune';
      case 'bun':
        return 'Posibile, dar cu conditii';
      case 'conditii_speciale':
        return 'Scazute';
      case 'foarte_scazut':
        return 'Foarte scazute';
      default:
        return level;
    }
  };

  const getScoringColor = (level: string) => {
    switch (level) {
      case 'foarte_mare':
        return colors.success[500];
      case 'mare':
        return colors.success[400];
      case 'bun':
        return colors.warning[500];
      case 'conditii_speciale':
        return colors.warning[600];
      case 'foarte_scazut':
        return colors.error[500];
      default:
        return colors.light[50];
    }
  };

  const screenWidth = Dimensions.get('window').width;

  const chartData = {
    labels: ['DTI'],
    datasets: [
      {
        data: [result.dti * 100],
        color: (opacity = 1) => getScoringColor(result.scoringLevel),
        strokeWidth: 2,
      },
    ],
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Text style={styles.emoji}>
              {getScoringEmoji(result.scoringLevel)}
            </Text>
            <Text style={styles.resultTitle}>
              {getScoringText(result.scoringLevel)}
            </Text>
          </View>

          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>DTI</Text>
              <Text style={styles.metricValue}>
                {(result.dti * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>NIVEL RECOMANDAT</Text>
              <View
                style={[
                  styles.chip,
                  {backgroundColor: getScoringColor(result.scoringLevel)},
                ]}>
                <Text style={styles.chipText}>
                  {result.recommendedLevel}
                </Text>
              </View>
            </View>
          </View>

          <LineChart
            data={chartData}
            width={screenWidth - spacing.lg * 2 - spacing.lg * 2}
            height={200}
            chartConfig={{
              backgroundColor: colors.dark[700],
              backgroundGradientFrom: colors.dark[700],
              backgroundGradientTo: colors.dark[600],
              decimalPlaces: 1,
              color: (opacity = 1) => getScoringColor(result.scoringLevel),
              labelColor: (opacity = 1) => colors.light[60],
              style: {
                borderRadius: borderRadius.lg,
              },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: getScoringColor(result.scoringLevel),
              },
              propsForBackgroundLines: {
                stroke: colors.dark[400],
                strokeDasharray: '',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {result.reasoning && result.reasoning.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              OBSERVATII
            </Text>
            {result.reasoning.map((reason, index) => (
              <View key={index} style={styles.reasonItem}>
                <Text style={styles.reasonText}>• {reason}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            navigation.navigate('Dashboard', {
              screen: 'ApplicationWizard',
            });
          }}
          activeOpacity={0.8}>
          <Text style={styles.primaryButtonLabel}>
            Aplica acum – trimite dosarul spre analiza completa
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlinedButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}>
          <Text style={styles.outlinedButtonLabel}>
            Inapoi la simulator
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  content: {
    padding: spacing.lg,
  },
  resultCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  resultTitle: {
    ...typography.h2,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.light[100],
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    ...typography.labelUppercase,
    color: colors.light[60],
  },
  metricValue: {
    ...typography.h3,
    marginTop: spacing.sm,
    color: colors.light[100],
  },
  chip: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipText: {
    ...typography.labelSmall,
    color: colors.light[100],
    fontWeight: '600',
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelUppercase,
    color: colors.light[60],
    marginBottom: spacing.md,
  },
  reasonItem: {
    marginBottom: spacing.sm,
  },
  reasonText: {
    ...typography.bodyMedium,
    color: colors.light[80],
  },
  primaryButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.brand.primary,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  outlinedButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.pill,
    borderColor: colors.dark[400],
    borderWidth: 1,
    backgroundColor: 'transparent',
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  primaryButtonLabel: {
    ...typography.labelLarge,
    color: colors.light[100],
    textAlign: 'center',
  },
  outlinedButtonLabel: {
    ...typography.labelLarge,
    color: colors.light[100],
    textAlign: 'center',
  },
});

export default SimulatorResultScreen;
