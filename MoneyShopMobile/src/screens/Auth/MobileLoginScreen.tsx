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
} from 'react-native';
import {Snackbar} from 'react-native-paper';
import {useAuthStore} from '../../store/authStore';
import Logo from '../../components/Logo';
import {DSTextInput, BigButton} from '../../components/ui';
import {colors, spacing, typography, borderRadius, shadows} from '../../theme/designSystem';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {GuestStackParamList} from '../../navigation/GuestNavigator';

const WEB_APP_URL = 'https://moneyshop.ro';
const REGISTER_URL = `${WEB_APP_URL}/Account/Register`;

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
        <View style={styles.content}>
          <View style={styles.logoSection}>
            <Logo size="large" showTagline />
          </View>

          <View style={styles.formCard}>
            <Text style={styles.title}>Bine ai venit!</Text>
            <Text style={styles.subtitle}>Autentifica-te pentru a continua</Text>

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

            <View style={styles.forgotRow}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotText}>Ai uitat parola?</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('OtpLogin')}>
                <Text style={styles.forgotText}>Login cu SMS</Text>
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

            <BigButton
              title="Creeaza cont nou"
              onPress={handleRegister}
              variant="outline"
              icon="account-plus-outline"
            />
          </View>

          <View style={styles.trustBadges}>
            <View style={styles.badge}>
              <Icon name="shield-check" size={16} color={colors.success[500]} />
              <Text style={styles.badgeText}>Securizat</Text>
            </View>
            <View style={styles.badge}>
              <Icon name="lightning-bolt" size={16} color={colors.brand.primary} />
              <Text style={styles.badgeText}>Rapid</Text>
            </View>
            <View style={styles.badge}>
              <Icon name="cash-multiple" size={16} color={colors.gold[500]} />
              <Text style={styles.badgeText}>Gratuit</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>MoneyShop® — Broker autorizat ANPC</Text>
      </View>

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
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  content: {
    paddingHorizontal: spacing.lg,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.light[100],
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.light[60],
    marginBottom: spacing.xl,
  },
  forgotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  forgotText: {
    ...typography.labelSmall,
    color: colors.brand.primary,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
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
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dark[600],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  badgeText: {
    ...typography.labelSmall,
    color: colors.light[70],
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
  },
  footerText: {
    ...typography.caption,
    color: colors.light[50],
  },
  snackbar: {
    backgroundColor: colors.error[500],
  },
});

export default MobileLoginScreen;
