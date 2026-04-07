import React from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity, Text} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../../store/authStore';
import {useQuery} from '@tanstack/react-query';
import {userFinancialDataApi} from '../../services/api/userFinancialDataApi';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {FicoGauge} from '../../components/ui';
import {colors, spacing, borderRadius, typography, shadows} from '../../theme/designSystem';

type SimulatorScreenNavigationProp = NativeStackNavigationProp<any, 'Simulator'>;

interface Props {
  navigation: SimulatorScreenNavigationProp;
}

const SimulatorScreen: React.FC<Props> = ({navigation}) => {
  const {isAuthenticated} = useAuthStore();

  const {data: financialData} = useQuery({
    queryKey: ['userFinancialData'],
    queryFn: userFinancialDataApi.getMyData,
    retry: false,
    enabled: isAuthenticated,
  });

  const fmt = (v: number) => v.toLocaleString('ro-RO', { maximumFractionDigits: 0 });
  const hasFico = financialData?.ficoScore != null && financialData.ficoScore > 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.pageTitle}>Simulator Credit</Text>
        <Text style={styles.pageSubtitle}>Calculeaza eligibilitatea ta in cateva minute</Text>

        {/* Financial Summary if available */}
        {hasFico && (
          <View style={styles.summaryCard}>
            <FicoGauge score={financialData!.ficoScore!} size={90} />
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>Datele tale financiare</Text>
              {financialData?.salariuNet ? (
                <Text style={styles.summaryDetail}>Salariu: {fmt(financialData.salariuNet)} lei</Text>
              ) : null}
              {financialData?.venitTotal ? (
                <Text style={styles.summaryDetail}>Venit total: {fmt(financialData.venitTotal)} lei</Text>
              ) : null}
              <Text style={styles.summaryHint}>Datele se preiau automat in simulator</Text>
            </View>
          </View>
        )}

        {/* Calculator CTA */}
        <TouchableOpacity
          style={styles.calculatorCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SimulatorForm')}>
          <View style={styles.calculatorIcon}>
            <Icon name="calculator-variant" size={32} color="#FFFFFF" />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.calculatorTitle}>Calculator Avansat</Text>
            <Text style={styles.calculatorDesc}>Analiza completa cu toate datele tale financiare</Text>
          </View>
          <Icon name="arrow-right" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Features */}
        <View style={styles.featuresGrid}>
          {[
            { icon: 'clock-fast', label: 'Sub 2 minute', color: colors.success[500], bg: colors.success[50] },
            { icon: 'shield-check', label: 'Date sigure', color: colors.brand.primary, bg: colors.info[50] },
            { icon: 'cash-multiple', label: '0 comision', color: colors.gold[600], bg: colors.gold[50] },
            { icon: 'bank', label: '10+ banci', color: colors.brand.purple, bg: 'rgba(110,76,229,0.08)' },
          ].map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <View style={[styles.featureIcon, {backgroundColor: f.bg}]}>
                <Icon name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={styles.featureText}>{f.label}</Text>
            </View>
          ))}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Icon name="information-outline" size={20} color={colors.brand.primary} />
          <Text style={styles.infoText}>
            Simulatorul foloseste datele tale din Biroul de Credit si ANAF pentru a calcula eligibilitatea reala. Rezultatele sunt orientative.
          </Text>
        </View>

        {/* Auth prompt for guests */}
        {!isAuthenticated && (
          <View style={styles.authCard}>
            <Text style={styles.authTitle}>Autentifica-te pentru rezultate exacte</Text>
            <Text style={styles.authDesc}>Cu un cont, simulatorul preia automat datele tale financiare.</Text>
            <View style={styles.authButtons}>
              <TouchableOpacity
                style={styles.authBtn}
                activeOpacity={0.7}
                onPress={() => (navigation as any).navigate('Auth', {screen: 'Login'})}>
                <Icon name="login" size={18} color={colors.brand.primary} />
                <Text style={styles.authBtnText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.authBtn, {backgroundColor: colors.success[50]}]}
                activeOpacity={0.7}
                onPress={() => (navigation as any).navigate('Auth', {screen: 'Register'})}>
                <Icon name="account-plus" size={18} color={colors.success[500]} />
                <Text style={[styles.authBtnText, {color: colors.success[500]}]}>Cont nou</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    paddingBottom: spacing.xxxl,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light[100],
    marginTop: spacing.sm,
  },
  pageSubtitle: {
    ...typography.bodyMedium,
    color: colors.light[60],
    marginBottom: spacing.lg,
    marginTop: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xxl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark[400],
    ...shadows.sm,
  },
  summaryInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  summaryLabel: {
    ...typography.labelMedium,
    color: colors.light[100],
  },
  summaryDetail: {
    ...typography.caption,
    color: colors.light[60],
    marginTop: 2,
  },
  summaryHint: {
    ...typography.caption,
    color: colors.brand.primary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  calculatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.glow,
  },
  calculatorIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  calculatorTitle: {
    ...typography.h4,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  calculatorDesc: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  featureItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark[400],
    gap: spacing.sm,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    ...typography.labelSmall,
    color: colors.light[80],
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.info[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoText: {
    ...typography.caption,
    color: colors.light[70],
    flex: 1,
    lineHeight: 18,
  },
  authCard: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  authTitle: {
    ...typography.labelLarge,
    color: colors.light[100],
    marginBottom: 4,
  },
  authDesc: {
    ...typography.caption,
    color: colors.light[60],
    marginBottom: spacing.md,
  },
  authButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  authBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.info[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  authBtnText: {
    ...typography.labelMedium,
    color: colors.brand.primary,
  },
});

export default SimulatorScreen;
