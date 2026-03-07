import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

interface ProgressStepsProps {
  currentStep: number;
  totalSteps: number;
  stepTitles?: string[];
  showNumbers?: boolean;
  variant?: 'horizontal' | 'compact';
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
  showNumbers = true,
  variant = 'compact',
}) => {
  const progress = (currentStep / totalSteps) * 100;

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <View style={styles.stepIndicator}>
            <Text style={styles.stepNumber}>{currentStep}</Text>
            <Text style={styles.stepSeparator}>/</Text>
            <Text style={styles.stepTotal}>{totalSteps}</Text>
          </View>
          {stepTitles && stepTitles[currentStep - 1] && (
            <Text style={styles.currentStepTitle} numberOfLines={1}>
              {stepTitles[currentStep - 1]}
            </Text>
          )}
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, {width: `${progress}%`}]} />
        </View>
        <Text style={styles.progressText}>
          {progress < 100
            ? `Mai ai ${totalSteps - currentStep} ${totalSteps - currentStep === 1 ? 'pas' : 'pasi'}`
            : 'Ultimul pas!'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.horizontalContainer}>
      <View style={styles.stepsRow}>
        {Array.from({length: totalSteps}, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <React.Fragment key={index}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isCurrent && styles.stepCircleCurrent,
                    isUpcoming && styles.stepCircleUpcoming,
                  ]}>
                  {isCompleted ? (
                    <Icon name="check" size={16} color="#FFFFFF" />
                  ) : (
                    showNumbers && (
                      <Text
                        style={[
                          styles.stepCircleText,
                          isCurrent && styles.stepCircleTextCurrent,
                        ]}>
                        {stepNumber}
                      </Text>
                    )
                  )}
                </View>
                {stepTitles && stepTitles[index] && (
                  <Text
                    style={[
                      styles.stepTitle,
                      isCurrent && styles.stepTitleCurrent,
                      isCompleted && styles.stepTitleCompleted,
                    ]}
                    numberOfLines={2}>
                    {stepTitles[index]}
                  </Text>
                )}
              </View>
              {index < totalSteps - 1 && (
                <View
                  style={[
                    styles.connector,
                    isCompleted && styles.connectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Compact variant
  compactContainer: {
    backgroundColor: colors.dark[700],
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.info[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  stepNumber: {
    ...typography.h4,
    color: colors.brand.primary,
  },
  stepSeparator: {
    ...typography.bodyMedium,
    color: colors.light[50],
    marginHorizontal: 2,
  },
  stepTotal: {
    ...typography.bodyMedium,
    color: colors.light[60],
  },
  currentStepTitle: {
    ...typography.labelMedium,
    color: colors.light[100],
    marginLeft: spacing.md,
    flex: 1,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.dark[500],
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.brand.primary,
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption,
    color: colors.light[50],
    textAlign: 'center',
  },

  // Horizontal variant
  horizontalContainer: {
    backgroundColor: colors.dark[700],
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  stepItem: {
    alignItems: 'center',
    maxWidth: 80,
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepCircleCompleted: {
    backgroundColor: colors.success[500],
  },
  stepCircleCurrent: {
    backgroundColor: colors.brand.primary,
  },
  stepCircleUpcoming: {
    backgroundColor: colors.dark[500],
  },
  stepCircleText: {
    ...typography.labelMedium,
    color: colors.light[50],
  },
  stepCircleTextCurrent: {
    color: '#FFFFFF',
  },
  stepTitle: {
    ...typography.caption,
    color: colors.light[50],
    textAlign: 'center',
  },
  stepTitleCurrent: {
    color: colors.brand.primary,
    fontWeight: '600',
  },
  stepTitleCompleted: {
    color: colors.success[400],
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.dark[500],
    marginTop: 17,
    marginHorizontal: spacing.xs,
    maxWidth: 40,
  },
  connectorCompleted: {
    backgroundColor: colors.success[500],
  },
});

export default ProgressSteps;
