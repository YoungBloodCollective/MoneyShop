import React from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity, Alert, Text} from 'react-native';
import {useAuthStore} from '../../store/authStore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, borderRadius, typography, shadows} from '../../theme/designSystem';

type ProfileScreenNavigationProp = NativeStackNavigationProp<any, 'Profile'>;

interface Props {
  navigation: ProfileScreenNavigationProp;
}

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  iconBg?: string;
  iconColor?: string;
  chevron?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  iconBg = colors.dark[500],
  iconColor = colors.light[80],
  chevron = true,
}) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={styles.menuItem}>
    <View style={[styles.menuIcon, {backgroundColor: iconBg}]}>
      <Icon name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.menuContent}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    {chevron && (
      <Icon name="chevron-right" size={20} color={colors.dark[300]} />
    )}
  </TouchableOpacity>
);

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
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Icon name="file-document-check" size={22} color={colors.success[400]} />
          <Text style={styles.statValue}>0</Text>
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

      {/* Main Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>CONTUL TAU</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="chart-line"
            title="Date Financiare"
            subtitle="Vizualizeaza veniturile si istoricul"
            onPress={() => navigation.navigate('FinancialData')}
            iconBg={colors.success[50]}
            iconColor={colors.success[400]}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="file-sign"
            title="Mandate"
            subtitle="Gestioneaza mandatele pentru ANAF/BC"
            onPress={() => navigation.navigate('MandateManagement')}
            iconBg={colors.info[50]}
            iconColor={colors.brand.primary}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="checkbox-marked-circle"
            title="Consimtamant"
            subtitle="Gestioneaza acordurile tale"
            onPress={() => navigation.navigate('ConsentManagement')}
            iconBg={colors.warning[50]}
            iconColor={colors.warning[400]}
          />
        </View>
      </View>

      {/* Verification Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VERIFICARI</Text>
        <View style={styles.menuCard}>
          {user?.role !== 'Administrator' && (
            <>
              <MenuItem
                icon="card-account-details"
                title="Verificare Identitate (KYC)"
                subtitle="Confirma-ti identitatea pentru siguranta"
                onPress={() => navigation.navigate('KycForm')}
                iconBg={colors.info[50]}
                iconColor={colors.brand.primary}
              />
              <View style={styles.menuDivider} />
            </>
          )}
          <MenuItem
            icon="email-check"
            title="Verifica Email"
            subtitle={user?.email}
            onPress={() => {
              const parent = navigation.getParent();
              if (parent) {
                parent.navigate('Dashboard', {
                  screen: 'Verification',
                  params: {type: 'email', email: user?.email, onComplete: 'dashboard'},
                });
              }
            }}
            iconBg={colors.success[50]}
            iconColor={colors.success[400]}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="phone-check"
            title="Verifica Telefon"
            subtitle="Confirma numarul de telefon"
            onPress={() => {
              const parent = navigation.getParent();
              if (parent) {
                parent.navigate('Dashboard', {
                  screen: 'Verification',
                  params: {type: 'phone', phone: user?.phone, onComplete: 'dashboard'},
                });
              }
            }}
            iconBg={colors.success[50]}
            iconColor={colors.success[400]}
          />
        </View>
      </View>

      {/* Admin Section */}
      {user?.role === 'Administrator' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ADMINISTRARE</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="shield-check"
              title="Verificari KYC"
              subtitle="Administreaza verificarile utilizatorilor"
              onPress={() => navigation.navigate('KycAdmin')}
              iconBg={colors.error[50]}
              iconColor={colors.error[400]}
            />
          </View>
        </View>
      )}

      {/* Resources Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RESURSE</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="office-building"
            title="Director Brokeri"
            subtitle="Gaseste un broker autorizat"
            onPress={() => navigation.navigate('BrokerDirectory')}
            iconBg={colors.dark[500]}
            iconColor={colors.light[80]}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="file-document-multiple"
            title="Informatii Legale"
            subtitle="Termeni, confidentialitate, GDPR"
            onPress={() => navigation.navigate('LegalMenu')}
            iconBg={colors.dark[500]}
            iconColor={colors.light[80]}
          />
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>APLICATIE</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon="cog"
            title="Setari"
            subtitle="Notificari, limba, tema"
            onPress={() => {}}
            iconBg={colors.dark[500]}
            iconColor={colors.light[80]}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="help-circle"
            title="Ajutor si Suport"
            subtitle="Intrebari frecvente, contact"
            onPress={() => {}}
            iconBg={colors.dark[500]}
            iconColor={colors.light[80]}
          />
          <View style={styles.menuDivider} />
          <MenuItem
            icon="information"
            title="Despre MoneyShop"
            subtitle="Versiune 1.0.0"
            onPress={() => {}}
            iconBg={colors.info[50]}
            iconColor={colors.brand.primary}
            chevron={false}
          />
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        onPress={handleLogout}
        activeOpacity={0.8}
        style={styles.logoutButton}>
        <Icon name="logout" size={20} color={colors.error[400]} />
        <Text style={styles.logoutText}>Deconectare</Text>
      </TouchableOpacity>

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

  // Menu Card
  menuCard: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dark[400],
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    ...typography.labelLarge,
    color: colors.light[100],
    marginBottom: 2,
  },
  menuSubtitle: {
    ...typography.bodySmall,
    color: colors.light[60],
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.dark[400],
    marginLeft: 72,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.error[50],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: `${colors.error[500]}30`,
  },
  logoutText: {
    ...typography.labelLarge,
    color: colors.error[400],
    marginLeft: spacing.sm,
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
