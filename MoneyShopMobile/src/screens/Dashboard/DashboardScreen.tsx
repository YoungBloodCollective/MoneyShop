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

  // Onboarding chain: Email verification → Phone verification → KYC
  const runOnboardingChecks = useCallback(async () => {
    if (!user || user.role === 'Administrator') return;

    // 1. Check email verification
    if (!user.emailVerified) {
      navigation.navigate('Verification', {
        type: 'email',
        email: user.email,
        onComplete: 'phone_verification',
      });
      return;
    }

    // 2. Check phone verification
    if (!user.phoneVerified) {
      navigation.navigate('Verification', {
        type: 'phone',
        phone: user.phone,
        onComplete: 'dashboard',
      });
      return;
    }

    // 3. Check KYC status
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

  // Run onboarding checks after navigator transition completes
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
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand.primary}
          />
        }>
        <View style={styles.content}>
          {/* Welcome */}
          <View style={styles.headerSection}>
            <Text style={styles.greeting}>
              Bine ai venit, {user?.name?.split(' ')[0]}!
            </Text>
            <Text style={styles.subtitle}>
              Iata un rezumat al activitatii tale
            </Text>
          </View>

          {/* FICO Score Hero */}
          {financialData?.ficoScore != null && financialData.ficoScore > 0 && (
            <View style={styles.ficoHero}>
              <FicoGauge score={financialData.ficoScore} size={140} />
              <View style={styles.ficoDetails}>
                <Text style={styles.ficoLabel}>SCOR FICO</Text>
                <Text style={styles.ficoSublabel}>
                  {financialData.venitTotal
                    ? `Venit: ${financialData.venitTotal.toLocaleString('ro-RO')} lei`
                    : 'Actualizat recent'}
                </Text>
              </View>
            </View>
          )}

          {/* Simulator Card - Gradient accent */}
          <TouchableOpacity
            style={styles.simulatorCard}
            activeOpacity={0.85}
            onPress={() => navigation.getParent()?.navigate('Simulator')}>
            <View style={styles.simulatorGradientBar} />
            <View style={styles.simulatorContent}>
              <View style={styles.simulatorIconContainer}>
                <Icon name="calculator-variant" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.simulatorTextContainer}>
                <Text style={styles.simulatorTitle}>Simulator Credit</Text>
                <Text style={styles.simulatorDescription}>
                  Calculeaza rata ta lunara si vezi ofertele disponibile
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.light[60]} />
            </View>
          </TouchableOpacity>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, {backgroundColor: colors.info[50]}]}>
                <Icon name="file-document" size={22} color={colors.brand.primary} />
              </View>
              <Text style={styles.statNumber}>{activeApplications.length}</Text>
              <Text style={styles.statLabel}>Cereri active</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, {backgroundColor: colors.success[50]}]}>
                <Icon name="check-circle" size={22} color={colors.success[500]} />
              </View>
              <Text style={styles.statNumber}>
                {applicationsList.filter(app => app.status === 'PREAPROBAT').length}
              </Text>
              <Text style={styles.statLabel}>Preaprobate</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Actiuni rapide</Text>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.quickActionCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ApplicationWizard')}>
                <View style={[styles.quickActionIcon, {backgroundColor: colors.success[50]}]}>
                  <Icon name="plus-circle" size={26} color={colors.success[500]} />
                </View>
                <Text style={styles.quickActionText}>Cerere noua</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ApplicationList')}>
                <View style={[styles.quickActionIcon, {backgroundColor: colors.info[50]}]}>
                  <Icon name="file-document-multiple" size={26} color={colors.brand.primary} />
                </View>
                <Text style={styles.quickActionText}>Toate cererile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                activeOpacity={0.7}
                onPress={() => navigation.getParent()?.navigate('Profile')}>
                <View style={[styles.quickActionIcon, {backgroundColor: colors.info[50]}]}>
                  <Icon name="account" size={26} color={colors.brand.purple} />
                </View>
                <Text style={styles.quickActionText}>Profil</Text>
              </TouchableOpacity>

              {user?.role === 'Administrator' && (
                <TouchableOpacity
                  style={styles.quickActionCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('KycAdmin')}>
                  <View style={[styles.quickActionIcon, {backgroundColor: colors.error[50]}]}>
                    <Icon name="shield-check" size={26} color={colors.error[500]} />
                  </View>
                  <Text style={styles.quickActionText}>KYC Admin</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Recent Applications */}
          {activeApplications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cereri recente</Text>
              {activeApplications.slice(0, 3).map(app => (
                <TouchableOpacity
                  key={app.id}
                  style={styles.applicationCard}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('ApplicationList', {applicationId: app.id})
                  }>
                  <View style={styles.applicationHeader}>
                    <View style={styles.applicationInfo}>
                      <Text style={styles.applicationType}>
                        {app.typeCredit === 'ipotecar'
                          ? 'Credit Ipotecar'
                          : 'Credit Nevoi Personale'}
                      </Text>
                      <Text style={styles.dateText}>
                        {new Date(app.createdAt).toLocaleDateString('ro-RO')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {backgroundColor: `${getStatusColor(app.status)}20`},
                      ]}>
                      <View style={[styles.statusDot, {backgroundColor: getStatusColor(app.status)}]} />
                      <Text style={[styles.statusText, {color: getStatusColor(app.status)}]}>
                        {app.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
    paddingBottom: spacing.xxxl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark[800],
  },
  headerSection: {
    marginBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  greeting: {
    ...typography.h2,
    color: colors.light[100],
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.light[60],
  },

  // FICO Hero
  ficoHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold[500],
    ...shadows.glowGold,
  },
  ficoDetails: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  ficoLabel: {
    ...typography.labelUppercase,
    color: colors.gold[500],
    marginBottom: spacing.xs,
  },
  ficoSublabel: {
    ...typography.bodySmall,
    color: colors.light[60],
  },

  // Simulator Card
  simulatorCard: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.dark[400],
    ...shadows.md,
  },
  simulatorGradientBar: {
    height: 3,
    backgroundColor: colors.brand.primary,
  },
  simulatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  simulatorIconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  simulatorTextContainer: {
    flex: 1,
  },
  simulatorTitle: {
    ...typography.h4,
    color: colors.light[100],
    marginBottom: 4,
  },
  simulatorDescription: {
    ...typography.bodySmall,
    color: colors.light[60],
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statNumber: {
    ...typography.h2,
    color: colors.light[100],
    marginBottom: 2,
  },
  statLabel: {
    ...typography.caption,
    color: colors.light[60],
    textAlign: 'center',
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  quickActionCard: {
    width: '47%',
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickActionText: {
    ...typography.labelMedium,
    color: colors.light[90],
    textAlign: 'center',
  },

  // Sections
  section: {
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.labelUppercase,
    color: colors.light[60],
    marginBottom: spacing.md,
  },

  // Application Cards
  applicationCard: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  applicationInfo: {
    flex: 1,
  },
  applicationType: {
    ...typography.labelLarge,
    color: colors.light[100],
    marginBottom: 4,
  },
  dateText: {
    ...typography.caption,
    color: colors.light[50],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default DashboardScreen;
