import React from 'react';
import {View, StyleSheet, ScrollView, RefreshControl} from 'react-native';
import {
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import {useQuery} from '@tanstack/react-query';
import {userFinancialDataApi} from '../../services/api/userFinancialDataApi';
import CustomHeader from '../../components/CustomHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

const FinancialDataScreen = ({navigation}: any) => {
  const {
    data: financialData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['userFinancialData'],
    queryFn: userFinancialDataApi.getMyData,
    retry: false,
  });

  const formatCurrency = (value?: number) => {
    if (value == null) return 'N/A';
    return `${value.toLocaleString('ro-RO')} lei`;
  };

  const formatPercentage = (value?: number) => {
    if (value == null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  const getScoringColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'foarte_ridicat':
      case 'ridicat':
        return colors.success[400];
      case 'mediu':
        return colors.warning[400];
      case 'scazut':
      case 'foarte_scazut':
        return colors.error[400];
      default:
        return colors.light[60];
    }
  };

  const getScoringBg = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'foarte_ridicat':
      case 'ridicat':
        return colors.success[50];
      case 'mediu':
        return colors.warning[50];
      case 'scazut':
      case 'foarte_scazut':
        return colors.error[50];
      default:
        return colors.dark[500];
    }
  };

  const getScoringLabel = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'foarte_ridicat':
        return 'Foarte Ridicat';
      case 'ridicat':
        return 'Ridicat';
      case 'mediu':
        return 'Mediu';
      case 'scazut':
        return 'Scăzut';
      case 'foarte_scazut':
        return 'Foarte Scăzut';
      default:
        return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <CustomHeader title="Date Financiare" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.brand.primary} />
        </View>
      </View>
    );
  }

  if (!financialData) {
    return (
      <View style={styles.container}>
        <CustomHeader title="Date Financiare" onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Icon name="chart-line" size={64} color={colors.dark[400]} />
          <Text style={styles.emptyText}>
            Nu ai date financiare salvate
          </Text>
          <Text style={styles.emptySubtext}>
            Completează simulatorul pentru a salva datele tale
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title="Date Financiare" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand.primary}
          />
        }>
        <View style={styles.content}>
          {/* Venituri Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="cash-multiple" size={24} color={colors.success[400]} />
              <Text style={styles.cardTitle}>
                Venituri
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                Salariu Net
              </Text>
              <Text style={styles.value}>
                {formatCurrency(financialData.salariuNet)}
              </Text>
            </View>
            {financialData.bonuriMasa && (
              <View style={styles.dataRow}>
                <Text style={styles.label}>
                  Bonuri de masă
                </Text>
                <Text style={styles.value}>
                  {formatCurrency(financialData.sumaBonuriMasa)}
                </Text>
              </View>
            )}
            <View style={[styles.dataRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>
                Venit Total
              </Text>
              <Text style={styles.totalValue}>
                {formatCurrency(financialData.venitTotal)}
              </Text>
            </View>
          </View>

          {/* Credite Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="credit-card" size={24} color={colors.warning[400]} />
              <Text style={styles.cardTitle}>
                Credite Existente
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                Sold Total
              </Text>
              <Text style={styles.value}>
                {formatCurrency(financialData.soldTotal)}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                Rata Totală Lunară
              </Text>
              <Text style={styles.value}>
                {formatCurrency(financialData.rataTotalaLunara)}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                Număr Credite Bănci
              </Text>
              <Text style={styles.value}>
                {financialData.nrCrediteBanci ?? 'N/A'}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                Număr IFN
              </Text>
              <Text style={styles.value}>
                {financialData.nrIfn ?? 'N/A'}
              </Text>
            </View>
          </View>

          {/* Scoring Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="chart-bar" size={24} color={colors.brand.primary} />
              <Text style={styles.cardTitle}>
                Scoring & Eligibilitate
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                DTI (Debt-to-Income)
              </Text>
              <Text style={styles.value}>
                {formatPercentage(financialData.dti)}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                Nivel Scoring
              </Text>
              <View style={[
                styles.scoringBadge,
                {backgroundColor: getScoringBg(financialData.scoringLevel)},
              ]}>
                <Text style={[
                  styles.scoringBadgeText,
                  {color: getScoringColor(financialData.scoringLevel)},
                ]}>
                  {getScoringLabel(financialData.scoringLevel)}
                </Text>
              </View>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                Nivel Recomandat
              </Text>
              <Text style={styles.value}>
                {financialData.recommendedLevel ?? 'N/A'}
              </Text>
            </View>
          </View>

          {/* Status Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Icon name="alert-circle" size={24} color={colors.error[400]} />
              <Text style={styles.cardTitle}>
                Status
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                Poprire
              </Text>
              <View style={[
                styles.scoringBadge,
                {backgroundColor: financialData.poprire ? colors.error[50] : colors.success[50]},
              ]}>
                <Text style={[
                  styles.scoringBadgeText,
                  {color: financialData.poprire ? colors.error[400] : colors.success[400]},
                ]}>
                  {financialData.poprire ? 'Da' : 'Nu'}
                </Text>
              </View>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.label}>
                Întârzieri
              </Text>
              <View style={[
                styles.scoringBadge,
                {backgroundColor: financialData.intarzieri ? colors.error[50] : colors.success[50]},
              ]}>
                <Text style={[
                  styles.scoringBadgeText,
                  {color: financialData.intarzieri ? colors.error[400] : colors.success[400]},
                ]}>
                  {financialData.intarzieri
                    ? `Da (${financialData.intarzieriNumar ?? 0})`
                    : 'Nu'}
                </Text>
              </View>
            </View>
          </View>

          {/* Last Updated */}
          {financialData.lastUpdated && (
            <Text style={styles.lastUpdated}>
              Ultima actualizare:{' '}
              {new Date(financialData.lastUpdated).toLocaleString('ro-RO')}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h4,
    marginTop: spacing.md,
    color: colors.light[60],
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    color: colors.light[50],
    textAlign: 'center',
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    marginLeft: spacing.md,
    color: colors.light[100],
  },
  divider: {
    height: 1,
    backgroundColor: colors.dark[400],
    marginBottom: spacing.md,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.light[70],
    flex: 1,
  },
  value: {
    ...typography.labelLarge,
    color: colors.light[100],
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.dark[400],
  },
  totalLabel: {
    ...typography.labelLarge,
    color: colors.light[100],
  },
  totalValue: {
    ...typography.h3,
    color: colors.success[400],
  },
  scoringBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  scoringBadgeText: {
    ...typography.labelSmall,
    fontWeight: '600',
  },
  lastUpdated: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.light[50],
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});

export default FinancialDataScreen;
