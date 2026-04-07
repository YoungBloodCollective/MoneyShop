import React, {useEffect, useState, useCallback} from 'react';
import {View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Text, ActivityIndicator, InteractionManager} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {applicationsApi} from '../../services/api/applicationsApi';
import {userFinancialDataApi} from '../../services/api/userFinancialDataApi';
import {kycApi} from '../../services/api/kycApi';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../../store/authStore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {FicoGauge} from '../../components/ui';
import {colors, spacing, borderRadius, typography, shadows} from '../../theme/designSystem';

type DashboardScreenNavigationProp = NativeStackNavigationProp<any, 'DashboardHome'>;

interface Props {
  navigation: DashboardScreenNavigationProp;
}

const DashboardScreen: React.FC<Props> = ({navigation}) => {
  const {user} = useAuthStore();
  const [kycChecked, setKycChecked] = useState(false);

  const {
    data: applications,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.getAll,
  });

  const {data: financialData} = useQuery({
    queryKey: ['userFinancialData'],
    queryFn: userFinancialDataApi.getMyData,
    retry: false,
    enabled: !!user,
  });

  const runOnboardingChecks = useCallback(async () => {
    if (!user || user.role === 'Administrator') return;
    if (!user.emailVerified) {
      navigation.navigate('Verification', { type: 'email', email: user.email, onComplete: 'phone_verification' });
      return;
    }
    if (!user.phoneVerified) {
      navigation.navigate('Verification', { type: 'phone', phone: user.phone, onComplete: 'dashboard' });
      return;
    }
    try {
      const kycStatus = await kycApi.getStatus();
      if (!kycStatus || kycStatus.status !== 'verified') {
        navigation.navigate('KycForm');
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        navigation.navigate('KycForm');
      }
    }
  }, [user, navigation]);

  useEffect(() => {
    if (user != null) {
      const task = InteractionManager.runAfterInteractions(() => {
        runOnboardingChecks().finally(() => setKycChecked(true));
      });
      return () => task.cancel();
    } else {
      setKycChecked(true);
    }
  }, [user, runOnboardingChecks]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refetch();
      if (user && user.role !== 'Administrator') {
        runOnboardingChecks();
      }
    });
    return unsubscribe;
  }, [navigation, refetch, user, runOnboardingChecks]);

  const applicationsList = Array.isArray(applications) ? applications : [];
  const activeApplications = applicationsList.filter(
    app => app.status !== 'RESPINS' && app.status !== 'DISBURSAT',
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'INREGISTRAT': return colors.brand.primary;
      case 'IN_ANALIZA': return colors.warning[500];
      case 'PREAPROBAT': return colors.success[500];
      case 'RESPINS': return colors.error[500];
      case 'DISBURSAT': return colors.brand.purple;
      default: return colors.light[60];
    }
  };

  const fmt = (v: number) => v.toLocaleString('ro-RO', { maximumFractionDigits: 0 });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brand.primary} />
        }>
        <View style={styles.content}>
          <Text style={styles.greeting}>
            Buna, {user?.name?.split(' ')[0]}! 👋
          </Text>
          <Text style={styles.subtitle}>Iata un rezumat al contului tau</Text>

          {/* FICO Score Hero */}
          {financialData?.ficoScore != null && financialData.ficoScore > 0 ? (
            <View style={styles.ficoCard}>
              <FicoGauge score={financialData.ficoScore} size={120} />
              <View style={styles.ficoInfo}>
                <Text style={styles.ficoLabel}>SCOR FICO</Text>
                {financialData.venitTotal ? (
                  <Text style={styles.ficoDetail}>Venit: {fmt(financialData.venitTotal)} lei</Text>
                ) : null}
                {financialData.dti != null ? (
                  <Text style={styles.ficoDetail}>DTI: {(financialData.dti * 100).toFixed(1)}%</Text>
                ) : null}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.ficoEmptyCard}
              activeOpacity={0.7}
              onPress={() => navigation.getParent()?.navigate('Simulator')}>
              <Icon name="chart-arc" size={40} color={colors.brand.primary} />
              <View style={{flex: 1, marginLeft: spacing.md}}>
                <Text style={styles.ficoEmptyTitle}>Afla scorul tau FICO</Text>
                <Text style={styles.ficoEmptyDesc}>Completeaza simulatorul pentru a vedea eligibilitatea ta</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.light[50]} />
            </TouchableOpacity>
          )}

          {/* Primary CTA */}
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ApplicationWizard')}>
            <View style={styles.ctaIcon}>
              <Icon name="plus" size={24} color="#FFFFFF" />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.ctaTitle}>Aplica pentru credit</Text>
              <Text style={styles.ctaDesc}>Depune o cerere noua</Text>
            </View>
            <Icon name="arrow-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{activeApplications.length}</Text>
              <Text style={styles.statLabel}>Cereri active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, {color: colors.success[500]}]}>
                {applicationsList.filter(app => app.status === 'PREAPROBAT').length}
              </Text>
              <Text style={styles.statLabel}>Preaprobate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statNumber, {color: colors.brand.primary}]}>
                {applicationsList.filter(app => app.status === 'DISBURSAT').length}
              </Text>
              <Text style={styles.statLabel}>Finalizate</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Actiuni rapide</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.getParent()?.navigate('Simulator')}>
              <View style={[styles.actionIcon, {backgroundColor: colors.info[50]}]}>
                <Icon name="calculator-variant" size={22} color={colors.brand.primary} />
              </View>
              <Text style={styles.actionText}>Simulator</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate('ApplicationList')}>
              <View style={[styles.actionIcon, {backgroundColor: colors.success[50]}]}>
                <Icon name="file-document-multiple" size={22} color={colors.success[500]} />
              </View>
              <Text style={styles.actionText}>Cereri</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.getParent()?.navigate('Profile')}>
              <View style={[styles.actionIcon, {backgroundColor: colors.gold[50]}]}>
                <Icon name="account" size={22} color={colors.gold[600]} />
              </View>
              <Text style={styles.actionText}>Profil</Text>
            </TouchableOpacity>
            {user?.role === 'Administrator' && (
              <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={() => navigation.navigate('KycAdmin')}>
                <View style={[styles.actionIcon, {backgroundColor: colors.error[50]}]}>
                  <Icon name="shield-check" size={22} color={colors.error[500]} />
                </View>
                <Text style={styles.actionText}>KYC</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Recent Applications */}
          {activeApplications.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Cereri recente</Text>
              {activeApplications.slice(0, 3).map(app => (
                <TouchableOpacity
                  key={app.id}
                  style={styles.appCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('ApplicationList', {applicationId: app.id})}>
                  <View style={{flex: 1}}>
                    <Text style={styles.appType}>
                      {app.typeCredit === 'ipotecar' ? 'Credit Ipotecar' : 'Credit Nevoi Personale'}
                    </Text>
                    <Text style={styles.appDate}>
                      {new Date(app.createdAt).toLocaleDateString('ro-RO')}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, {backgroundColor: `${getStatusColor(app.status)}15`}]}>
                    <View style={[styles.statusDot, {backgroundColor: getStatusColor(app.status)}]} />
                    <Text style={[styles.statusText, {color: getStatusColor(app.status)}]}>{app.status}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
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
  scrollView: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark[800],
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light[100],
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.light[60],
    marginBottom: spacing.lg,
  },
  ficoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gold[500],
    ...shadows.md,
  },
  ficoInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  ficoLabel: {
    ...typography.labelUppercase,
    color: colors.gold[600],
    marginBottom: spacing.xs,
  },
  ficoDetail: {
    ...typography.bodySmall,
    color: colors.light[60],
    marginTop: 2,
  },
  ficoEmptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark[400],
    ...shadows.sm,
  },
  ficoEmptyTitle: {
    ...typography.labelLarge,
    color: colors.light[100],
  },
  ficoEmptyDesc: {
    ...typography.caption,
    color: colors.light[60],
    marginTop: 2,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.glow,
  },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ctaTitle: {
    ...typography.labelLarge,
    color: '#FFFFFF',
  },
  ctaDesc: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.light[100],
  },
  statLabel: {
    ...typography.caption,
    color: colors.light[60],
    marginTop: 2,
  },
  sectionTitle: {
    ...typography.labelUppercase,
    color: colors.light[60],
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  actionText: {
    ...typography.labelSmall,
    color: colors.light[80],
    textAlign: 'center',
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  appType: {
    ...typography.labelMedium,
    color: colors.light[100],
  },
  appDate: {
    ...typography.caption,
    color: colors.light[50],
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default DashboardScreen;
