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
  Dimensions,
} from 'react-native';
import {Snackbar} from 'react-native-paper';
import {useAuthStore} from '../../store/authStore';
import Logo from '../../components/Logo';
import {DSTextInput, BigButton} from '../../components/ui';
import {colors, spacing, typography} from '../../theme/designSystem';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {GuestStackParamList} from '../../navigation/GuestNavigator';

const WEB_APP_URL = 'https://moneyshop.ro';
const REGISTER_URL = `${WEB_APP_URL}/Account/Register`;

const {width} = Dimensions.get('window');

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.dark[900]} />

      {/* Background accents */}
      <View style={styles.bgAccent1} />
      <View style={styles.bgAccent2} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <Logo size="large" showTagline />
          </View>

          {/* Welcome */}
          <Text style={styles.title}>Bine ai venit!</Text>
          <Text style={styles.subtitle}>
            Autentifica-te pentru a continua
          </Text>

          {/* Login Form */}
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

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotButton}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Ai uitat parola?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <BigButton
            title={loading ? 'Se autentifica...' : 'Autentificare'}
            onPress={handleLogin}
            variant="primary"
            loading={loading}
            disabled={loading}
            icon="login"
          />

          {/* OTP Login link */}
          <TouchableOpacity
            style={styles.otpLink}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('OtpLogin')}>
            <Text style={styles.otpLinkText}>Autentificare cu cod SMS</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>sau</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register Button → opens browser */}
          <BigButton
            title="Creeaza cont nou"
            subtitle="Se deschide in browser"
            onPress={handleRegister}
            variant="outline"
            icon="account-plus-outline"
          />

          {/* Features */}
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, {backgroundColor: colors.success[500]}]} />
              <Text style={styles.featureText}>Securizat</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, {backgroundColor: colors.warning[500]}]} />
              <Text style={styles.featureText}>Rapid</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={[styles.featureDot, {backgroundColor: colors.gold[500]}]} />
              <Text style={styles.featureText}>Transparent</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          MoneyShop® - Broker de credite autorizat
        </Text>
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
    backgroundColor: colors.dark[900],
  },
  bgAccent1: {
    position: 'absolute',
    top: -width * 0.3,
    right: -width * 0.2,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: `${colors.brand.primary}08`,
  },
  bgAccent2: {
    position: 'absolute',
    bottom: -width * 0.2,
    left: -width * 0.15,
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    backgroundColor: `${colors.brand.secondary}05`,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
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
  title: {
    ...typography.h1,
    color: colors.light[100],
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.light[60],
    marginBottom: spacing.xl,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  forgotText: {
    ...typography.labelMedium,
    color: colors.brand.primary,
  },
  otpLink: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  otpLinkText: {
    ...typography.labelMedium,
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
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.xxl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  featureText: {
    ...typography.caption,
    color: colors.light[50],
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.lg,
  },
  footerText: {
    ...typography.caption,
    color: colors.light[40],
  },
  snackbar: {
    backgroundColor: colors.error[500],
  },
});

export default MobileLoginScreen;
