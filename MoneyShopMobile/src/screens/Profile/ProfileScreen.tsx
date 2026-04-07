import React from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text} from 'react-native';
import {useAuthStore} from '../../store/authStore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {DSMenuItem} from '../../components/ui';
import {colors, spacing, borderRadius, typography, shadows} from '../../theme/designSystem';

type ProfileScreenNavigationProp = NativeStackNavigationProp<any, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

const ProfileScreen = ({navigation}: Props) => {
  const {user, logout} = useAuthStore();

  const handleLogout = async () => {
    Alert.alert(
      'Deconectare',
      'Esti sigur ca vrei sa te deconectezi?',
      [
        {text: 'Anuleaza', style: 'cancel'},
        {
          text: 'Deconectare',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const completionSteps = [
    { done: !!user?.emailVerified, label: 'Email verificat' },
    { done: !!user?.phoneVerified, label: 'Telefon verificat' },
  ];
  const completionPercent = Math.round((completionSteps.filter(s => s.done).length / completionSteps.length) * 100);

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>

      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? getInitials(user.name) : 'U'}
            </Text>
          </View>
          <View style={styles.avatarBadge}>
            <Icon name="check" size={10} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.userName}>{user?.name || 'Utilizator'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {user?.role && (
          <View style={styles.roleBadge}>
            <Icon
              name={user.role === 'Administrator' ? 'shield-account' : 'account'}
              size={13}
              color={colors.brand.primary}
            />
            <Text style={styles.roleText}>{user.role}</Text>
          </View>
        )}
        {completionPercent < 100 && (
          <View style={{width: '100%', marginTop: spacing.md}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
              <Text style={{...typography.caption, color: colors.light[60]}}>Profil complet</Text>
              <Text style={{...typography.labelSmall, color: colors.brand.primary}}>{completionPercent}%</Text>
            </View>
            <View style={{height: 6, backgroundColor: colors.dark[500], borderRadius: 3}}>
              <View style={{height: 6, backgroundColor: colors.brand.primary, borderRadius: 3, width: `${completionPercent}%`}} />
            </View>
          </View>
        )}
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="file-document-check" size={22} color={colors.gold[500]} />
          <Text style={[styles.statValue, {color: colors.gold[500]}]}>0</Text>
          <Text style={styles.statLabel}>Credite active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="file-clock" size={22} color={colors.warning[400]} />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>In analiza</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Icon name="shield-check" size={22} color={colors.brand.primary} />
          <Text style={styles.statValue}>0</Text>
          <Text style={styles.statLabel}>Mandate</Text>
        </View>
      </View>

      {/* Main Menu - Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONTUL TAU</Text>
        <DSMenuItem
          icon="chart-line"
          label="Date Financiare"
          description="Vizualizeaza veniturile si istoricul"
          onPress={() => navigation.navigate('FinancialData')}
          iconColor={colors.success[400]}
          iconBgColor={colors.success[50]}
        />
        <DSMenuItem
          icon="file-sign"
          label="Mandate"
          description="Gestioneaza mandatele pentru ANAF/BC"
          onPress={() => navigation.navigate('MandateManagement')}
          iconColor={colors.brand.primary}
          iconBgColor={colors.info[50]}
        />
        <DSMenuItem
          icon="checkbox-marked-circle"
          label="Consimtamant"
          description="Gestioneaza acordurile tale"
          onPress={() => navigation.navigate('ConsentManagement')}
          iconColor={colors.warning[400]}
          iconBgColor={colors.warning[50]}
        />
      </View>

      {/* Verification Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VERIFICARI</Text>
        {user?.role !== 'Administrator' && (
          <DSMenuItem
            icon="card-account-details"
            label="Verificare Identitate (KYC)"
            description="Confirma-ti identitatea pentru siguranta"
            onPress={() => navigation.navigate('KycForm')}
            iconColor={colors.brand.primary}
            iconBgColor={colors.info[50]}
          />
        )}
        <DSMenuItem
          icon="email-check"
          label="Verifica Email"
          description={user?.email}
          onPress={() => {
            const parent = navigation.getParent();
            if (parent) {
              parent.navigate('Dashboard', {
                screen: 'Verification',
                params: {type: 'email', email: user?.email, onComplete: 'dashboard'},
              });
            }
          }}
          iconColor={colors.success[400]}
          iconBgColor={colors.success[50]}
        />
        <DSMenuItem
          icon="phone-check"
          label="Verifica Telefon"
          description="Confirma numarul de telefon"
          onPress={() => {
            const parent = navigation.getParent();
            if (parent) {
              parent.navigate('Dashboard', {
                screen: 'Verification',
                params: {type: 'phone', phone: user?.phone, onComplete: 'dashboard'},
              });
            }
          }}
          iconColor={colors.success[400]}
          iconBgColor={colors.success[50]}
        />
      </View>

      {/* Admin Section */}
      {user?.role === 'Administrator' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ADMINISTRARE</Text>
          <DSMenuItem
            icon="shield-check"
            label="Verificari KYC"
            description="Administreaza verificarile utilizatorilor"
            onPress={() => navigation.navigate('KycAdmin')}
            iconColor={colors.error[400]}
            iconBgColor={colors.error[50]}
          />
        </View>
      )}

      {/* Resources Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RESURSE</Text>
        <DSMenuItem
          icon="office-building"
          label="Director Brokeri"
          description="Gaseste un broker autorizat"
          onPress={() => navigation.navigate('BrokerDirectory')}
          iconColor={colors.brand.primary}
          iconBgColor={colors.info[50]}
        />
        <DSMenuItem
          icon="file-document-multiple"
          label="Informatii Legale"
          description="Termeni, confidentialitate, GDPR"
          onPress={() => navigation.navigate('LegalMenu')}
          iconColor={colors.brand.purple}
          iconBgColor={colors.info[50]}
        />
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APLICATIE</Text>
        <DSMenuItem
          icon="cog"
          label="Setari"
          description="Notificari, limba, tema"
          onPress={() => {}}
          iconColor={colors.light[80]}
          iconBgColor={colors.dark[500]}
        />
        <DSMenuItem
          icon="help-circle"
          label="Ajutor si Suport"
          description="Intrebari frecvente, contact"
          onPress={() => {}}
          iconColor={colors.brand.primary}
          iconBgColor={colors.info[50]}
        />
        <DSMenuItem
          icon="information"
          label="Despre MoneyShop"
          description="Versiune 1.0.0"
          onPress={() => {}}
          iconColor={colors.brand.primary}
          iconBgColor={colors.info[50]}
          rightElement={null}
        />
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <DSMenuItem
          icon="logout"
          label="Deconectare"
          onPress={handleLogout}
          danger
          rightElement={null}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          MoneyShop® - Broker de credite autorizat
        </Text>
        <Text style={styles.footerVersion}>Versiune 1.0.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.dark[700],
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[400],
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...typography.h2,
    color: '#FFFFFF',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success[500],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.dark[700],
  },
  userName: {
    ...typography.h3,
    color: colors.light[100],
    marginBottom: spacing.xs,
  },
  userEmail: {
    ...typography.bodyMedium,
    color: colors.light[60],
    marginBottom: spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.info[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    gap: spacing.xs,
  },
  roleText: {
    ...typography.labelSmall,
    color: colors.brand.primary,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.dark[700],
    marginHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark[400],
    ...shadows.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h4,
    color: colors.light[100],
    marginTop: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.light[60],
    marginTop: 2,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.dark[400],
    marginVertical: spacing.xs,
  },

  // Sections
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.labelUppercase,
    color: colors.light[50],
    marginBottom: spacing.md,
    marginLeft: spacing.xs,
  },

  // Logout
  logoutSection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.caption,
    color: colors.light[40],
  },
  footerVersion: {
    ...typography.caption,
    color: colors.light[40],
    marginTop: spacing.xs,
  },
});

export default ProfileScreen;
