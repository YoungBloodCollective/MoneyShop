import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
  Linking,
  StatusBar,
  Image,
} from 'react-native';
import {Snackbar} from 'react-native-paper';
import {useAuthStore} from '../../store/authStore';
import {DSTextInput, BigButton} from '../../components/ui';
import {colors, spacing, typography, borderRadius, shadows} from '../../theme/designSystem';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {GuestStackParamList} from '../../navigation/GuestNavigator';

const WEB_APP_URL = 'https://moneyshop.ro';
const REGISTER_URL = `${WEB_APP_URL}/Account/Register`;
const logoImage = require('../../../assets/images/logo/Logo.PNG');

type Props = {
  navigation: NativeStackNavigationProp<GuestStackParamList, 'MobileLogin'>;
};

const MobileLoginScreen: React.FC<Props> = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  const {login} = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Te rugam sa completezi toate campurile');
      setShowError(true);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Email sau parola incorecte');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      await Linking.openURL(REGISTER_URL);
    } catch {
      setError('Nu s-a putut deschide browser-ul');
      setShowError(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Image source={logoImage} style={styles.logo} resizeMode="contain" />
          <Text style={styles.heroTitle}>Gaseste cel mai bun credit</Text>
          <Text style={styles.heroSubtitle}>Compara ofertele de la 10+ banci. Gratuit si 100% online.</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formSection}>
          <DSTextInput
            label="EMAIL"
            leftIcon="email-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="exemplu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <DSTextInput
            label="PAROLA"
            leftIcon="lock-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Introdu parola"
            secureTextEntry
          />

          <View style={styles.linksRow}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.linkText}>Ai uitat parola?</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('OtpLogin')}>
              <Text style={styles.linkText}>Login cu SMS</Text>
            </TouchableOpacity>
          </View>

          <BigButton
            title={loading ? 'Se autentifica...' : 'Autentificare'}
            onPress={handleLogin}
            variant="primary"
            loading={loading}
            disabled={loading}
            icon="login"
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>sau</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.registerButton} activeOpacity={0.7} onPress={handleRegister}>
            <Icon name="account-plus-outline" size={20} color={colors.brand.primary} />
            <Text style={styles.registerText}>Creeaza cont nou</Text>
          </TouchableOpacity>
        </View>

        {/* Trust Section */}
        <View style={styles.trustSection}>
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Icon name="shield-check-outline" size={28} color={colors.success[500]} />
              <Text style={styles.trustLabel}>Securizat</Text>
              <Text style={styles.trustDesc}>GDPR compliant</Text>
            </View>
            <View style={styles.trustItem}>
              <Icon name="lightning-bolt-outline" size={28} color={colors.brand.primary} />
              <Text style={styles.trustLabel}>Rapid</Text>
              <Text style={styles.trustDesc}>Sub 2 minute</Text>
            </View>
            <View style={styles.trustItem}>
              <Icon name="hand-coin-outline" size={28} color={colors.gold[600]} />
              <Text style={styles.trustLabel}>Gratuit</Text>
              <Text style={styles.trustDesc}>0 comisioane</Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer}>MoneyShop® — Broker autorizat ANPC</Text>
      </ScrollView>

      <Snackbar
        visible={showError}
        onDismiss={() => setShowError(false)}
        duration={3000}
        style={styles.snackbar}>
        {error || 'Eroare'}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    ...shadows.sm,
  },
  logo: {
    width: 220,
    height: 60,
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.light[100],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.bodyMedium,
    color: colors.light[60],
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  linkText: {
    ...typography.labelSmall,
    color: colors.brand.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.dark[400],
  },
  dividerText: {
    ...typography.caption,
    color: colors.light[50],
    marginHorizontal: spacing.md,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 56,
    borderRadius: borderRadius.pill,
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
    backgroundColor: '#FFFFFF',
  },
  registerText: {
    ...typography.labelLarge,
    color: colors.brand.primary,
  },
  trustSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  trustRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    ...shadows.sm,
  },
  trustLabel: {
    ...typography.labelMedium,
    color: colors.light[100],
    marginTop: spacing.sm,
  },
  trustDesc: {
    ...typography.caption,
    color: colors.light[60],
    marginTop: 2,
  },
  footer: {
    ...typography.caption,
    color: colors.light[50],
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
  },
  snackbar: {
    backgroundColor: colors.error[500],
  },
});

export default MobileLoginScreen;
