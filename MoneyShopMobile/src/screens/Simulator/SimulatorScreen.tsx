import React from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity, Text} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../../store/authStore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography, shadows} from '../../theme/designSystem';

type SimulatorScreenNavigationProp = NativeStackNavigationProp<any, 'Simulator'>;

interface Props {
  navigation: SimulatorScreenNavigationProp;
}

const SimulatorScreen: React.FC<Props> = ({navigation}) => {
  const {isAuthenticated} = useAuthStore();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.brandName}>
            MoneyShop<Text style={styles.superscript}>®</Text>
          </Text>
          <Text style={styles.tagline}>Simplu. Rapid. Transparent.</Text>
          <Text style={styles.description}>
            Platforma digitala de intermediere credite. Analizeaza eligibilitatea
            ta de credit in cateva minute, cu transparenta totala.
          </Text>
        </View>

        {/* Simulator Card */}
        <TouchableOpacity
          style={styles.simulatorCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SimulatorForm')}>
          <View style={styles.simulatorGradientBar} />
          <View style={styles.simulatorCardContent}>
            <View style={styles.simulatorHeader}>
              <View style={styles.simulatorIconContainer}>
                <Icon name="calculator-variant" size={36} color="#FFFFFF" />
              </View>
              <View style={styles.simulatorTextContainer}>
                <Text style={styles.simulatorTitle}>Simulator Credit</Text>
                <Text style={styles.simulatorDescription}>
                  Calculeaza rata ta lunara si vezi ofertele disponibile
                </Text>
              </View>
            </View>
            <View style={styles.simulatorFooter}>
              <Text style={styles.simulatorActionText}>Incepe simularea</Text>
              <Icon name="arrow-right" size={20} color={colors.brand.primary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Icon name="information-outline" size={22} color={colors.brand.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Gratuit si fara inregistrare</Text>
              <Text style={styles.infoText}>
                Simulatorul este complet gratuit. Pentru a salva datele si a vedea
                istoricul, te poti autentifica.
              </Text>
            </View>
          </View>
        </View>

        {/* Features mini */}
        <View style={styles.featuresRow}>
          <View style={styles.featureMini}>
            <Icon name="clock-fast" size={24} color={colors.success[400]} />
            <Text style={styles.featureMiniText}>Sub 2 minute</Text>
          </View>
          <View style={styles.featureMini}>
            <Icon name="shield-check" size={24} color={colors.brand.primary} />
            <Text style={styles.featureMiniText}>Date sigure</Text>
          </View>
          <View style={styles.featureMini}>
            <Icon name="cash-multiple" size={24} color={colors.warning[400]} />
            <Text style={styles.featureMiniText}>0 comision</Text>
          </View>
        </View>

        {/* Auth Actions for non-authenticated users */}
        {!isAuthenticated && (
          <View style={styles.authSection}>
            <Text style={styles.authSectionTitle}>Ai deja cont?</Text>
            <View style={styles.authButtons}>
              <TouchableOpacity
                style={styles.authCard}
                activeOpacity={0.7}
                onPress={() => (navigation as any).navigate('Auth', {screen: 'Login'})}>
                <View style={[styles.authIcon, {backgroundColor: colors.info[50]}]}>
                  <Icon name="login" size={26} color={colors.brand.primary} />
                </View>
                <Text style={styles.authCardText}>Autentificare</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.authCard}
                activeOpacity={0.7}
                onPress={() => (navigation as any).navigate('Auth', {screen: 'Register'})}>
                <View style={[styles.authIcon, {backgroundColor: colors.success[50]}]}>
                  <Icon name="account-plus" size={26} color={colors.success[500]} />
                </View>
                <Text style={styles.authCardText}>Inregistrare</Text>
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
  headerSection: {
    marginBottom: spacing.xl,
    paddingTop: spacing.sm,
    alignItems: 'center',
  },
  brandName: {
    ...typography.h1,
    color: colors.light[100],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  superscript: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.light[60],
  },
  tagline: {
    ...typography.labelLarge,
    color: colors.brand.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  description: {
    ...typography.bodyMedium,
    color: colors.light[60],
    textAlign: 'center',
    lineHeight: 24,
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
  simulatorCardContent: {
    padding: spacing.lg,
  },
  simulatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  simulatorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  simulatorTextContainer: {
    flex: 1,
  },
  simulatorTitle: {
    ...typography.h3,
    color: colors.light[100],
    marginBottom: 4,
  },
  simulatorDescription: {
    ...typography.bodySmall,
    color: colors.light[60],
  },
  simulatorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.dark[400],
    paddingTop: spacing.md,
  },
  simulatorActionText: {
    ...typography.labelLarge,
    color: colors.brand.primary,
  },

  // Info Card
  infoCard: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.info[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    ...typography.labelLarge,
    color: colors.light[100],
    marginBottom: 4,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.light[60],
    lineHeight: 20,
  },

  // Features Mini
  featuresRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureMini: {
    flex: 1,
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  featureMiniText: {
    ...typography.labelSmall,
    color: colors.light[80],
    textAlign: 'center',
  },

  // Auth Section
  authSection: {
    marginTop: spacing.sm,
  },
  authSectionTitle: {
    ...typography.h4,
    color: colors.light[100],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  authButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  authCard: {
    flex: 1,
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  authIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  authCardText: {
    ...typography.labelMedium,
    color: colors.light[90],
    textAlign: 'center',
  },
});

export default SimulatorScreen;
