import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity} from 'react-native';
import {
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import {useQuery} from '@tanstack/react-query';
import {userFinancialDataApi} from '../../services/api/userFinancialDataApi';
import {bcReportApi, type BcAccountSummary} from '../../services/api/bcReportApi';
import CustomHeader from '../../components/CustomHeader';
import {FicoGauge} from '../../components/ui';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography, shadows} from '../../theme/designSystem';

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

  const {data: bcReport} = useQuery({
    queryKey: ['bcReportLatest'],
    queryFn: bcReportApi.getLatest,
    retry: false,
  });

  const [showSalaries, setShowSalaries] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const accounts = bcReport?.parsedData?.accounts || [];
  const activeAccounts = accounts
    .filter(a => a.isActive && a.currentBalance > 0 && !!a.creditor)
    .filter((a, i, arr) => arr.findIndex(x => x.creditor === a.creditor && x.currentBalance === a.currentBalance) === i);

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
          {/* FICO Score */}
          {financialData.ficoScore != null && financialData.ficoScore > 0 && (
            <View style={styles.ficoCard}>
              <FicoGauge score={financialData.ficoScore} size={130} />
              <View style={styles.ficoInfo}>
                <Text style={styles.ficoTitle}>SCOR FICO</Text>
                <Text style={styles.ficoHint}>
                  {financialData.ficoScore >= 700 ? 'Eligibil pentru cele mai bune oferte' : financialData.ficoScore >= 500 ? 'Eligibil cu conditii standard' : 'Eligibilitate limitata'}
                </Text>
              </View>
            </View>
          )}

          {/* BC Report auto-import banner */}
          {financialData.ficoScore != null && financialData.ficoScore > 0 && (financialData.nrCrediteBanci ?? 0) > 0 && (
            <View style={styles.bcBanner}>
              <Icon name="information" size={18} color={colors.brand.primary} />
              <Text style={styles.bcBannerText}>
                Creditele au fost importate automat din Raportul BC. Poti modifica datele manual daca este necesar.
              </Text>
            </View>
          )}

          {/* Venituri Section */}
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => setShowSalaries(!showSalaries)}>
            <View style={styles.cardHeader}>
              <Icon name="cash-multiple" size={24} color={colors.success[400]} />
              <Text style={styles.cardTitle}>Venituri</Text>
              <View style={{flex: 1}} />
              <Text style={{...typography.h4, color: colors.success[500]}}>{formatCurrency(financialData.venitTotal)}</Text>
              <Icon name={showSalaries ? 'chevron-up' : 'chevron-down'} size={20} color={colors.light[50]} style={{marginLeft: 8}} />
            </View>
          </TouchableOpacity>
          {showSalaries && (
            <View style={[styles.card, {marginTop: -spacing.sm, borderTopLeftRadius: 0, borderTopRightRadius: 0}]}>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Salariu Net</Text>
                <Text style={styles.value}>{formatCurrency(financialData.salariuNet)}</Text>
              </View>
              {financialData.bonuriMasa && (
                <View style={styles.dataRow}>
                  <Text style={styles.label}>Bonuri de masa</Text>
                  <Text style={styles.value}>{formatCurrency(financialData.sumaBonuriMasa)}</Text>
                </View>
              )}
              {(financialData.salariu1 || financialData.salariu2 || financialData.salariu3) && (
                <>
                  <View style={styles.divider} />
                  <Text style={{...typography.labelSmall, color: colors.light[60], marginBottom: spacing.sm}}>Ultimele 3 salarii</Text>
                  {[
                    { label: 'Luna 1 (recent)', value: financialData.salariu1 },
                    { label: 'Luna 2', value: financialData.salariu2 },
                    { label: 'Luna 3', value: financialData.salariu3 },
                  ].filter(s => s.value).map((s, i) => (
                    <View key={i} style={styles.dataRow}>
                      <Text style={styles.label}>{s.label}</Text>
                      <Text style={styles.value}>{formatCurrency(s.value)}</Text>
                    </View>
                  ))}
                </>
              )}
              <View style={[styles.dataRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Venit Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(financialData.venitTotal)}</Text>
              </View>
            </View>
          )}

          {/* Credite Section */}
          <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={() => setShowCredits(!showCredits)}>
            <View style={styles.cardHeader}>
              <Icon name="credit-card" size={24} color={colors.warning[400]} />
              <Text style={styles.cardTitle}>Credite Existente</Text>
              <View style={{flex: 1}} />
              <Text style={{...typography.labelMedium, color: colors.light[100]}}>{financialData.nrCrediteBanci ?? 0}</Text>
              <Icon name={showCredits ? 'chevron-up' : 'chevron-down'} size={20} color={colors.light[50]} style={{marginLeft: 8}} />
            </View>
          </TouchableOpacity>
          {showCredits && (
            <View style={[styles.card, {marginTop: -spacing.sm, borderTopLeftRadius: 0, borderTopRightRadius: 0}]}>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Sold Total</Text>
                <Text style={styles.value}>{formatCurrency(financialData.soldTotal)}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Rata Totala Lunara</Text>
                <Text style={styles.value}>{formatCurrency(financialData.rataTotalaLunara)}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>Credite Banci</Text>
                <Text style={styles.value}>{financialData.nrCrediteBanci ?? 'N/A'}</Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.label}>IFN-uri</Text>
                <Text style={styles.value}>{financialData.nrIfn ?? 'N/A'}</Text>
              </View>
              {activeAccounts.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <Text style={{...typography.labelSmall, color: colors.light[60], marginBottom: spacing.sm}}>Detalii credite active</Text>
                  {activeAccounts.map((acc, i) => (
                    <View key={i} style={[styles.creditItem, i < activeAccounts.length - 1 && {borderBottomWidth: 1, borderBottomColor: colors.dark[400], paddingBottom: spacing.sm, marginBottom: spacing.sm}]}>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                        <Text style={{...typography.labelMedium, color: colors.light[100], flex: 1}} numberOfLines={1}>
                          {acc.creditor}
                        </Text>
                        {acc.arrearsAmount > 0 && (
                          <View style={{backgroundColor: colors.error[50], paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.pill}}>
                            <Text style={{...typography.caption, color: colors.error[500], fontWeight: '600'}}>Intarziere</Text>
                          </View>
                        )}
                      </View>
                      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 4}}>
                        <Text style={{...typography.caption, color: colors.light[60]}}>Sold: {formatCurrency(acc.currentBalance)}</Text>
                        <Text style={{...typography.caption, color: colors.light[60]}}>{acc.accountType || 'Credit'}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

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
  ficoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold[500],
    ...shadows.glowGold,
  },
  ficoInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  ficoTitle: {
    ...typography.labelUppercase,
    color: colors.gold[500],
    marginBottom: spacing.xs,
  },
  ficoHint: {
    ...typography.bodySmall,
    color: colors.light[60],
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
    color: colors.gold[500],
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
  creditItem: {
    paddingVertical: spacing.xs,
  },
  lastUpdated: {
    ...typography.caption,
    textAlign: 'center',
    color: colors.light[50],
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  bcBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: `${colors.brand.primary}15`,
    borderWidth: 1,
    borderColor: `${colors.brand.primary}30`,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  bcBannerText: {
    ...typography.bodySmall,
    color: colors.light[70],
    flex: 1,
  },
});

export default FinancialDataScreen;
