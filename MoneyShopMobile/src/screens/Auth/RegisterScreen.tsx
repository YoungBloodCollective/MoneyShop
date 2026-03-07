import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {Snackbar} from 'react-native-paper';
import {useAuthStore} from '../../store/authStore';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';
import {appInsightsService} from '../../services/telemetry/appInsightsService';

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Register'
>;

interface Props {
  navigation: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<Props> = ({navigation}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {register} = useAuthStore();

  const handleRegister = async () => {
    // Track button click event
    appInsightsService.trackButtonClick('Register', 'submit', {
      screen: 'RegisterScreen',
    });

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setError('Te rugam sa completezi toate campurile obligatorii');
      setShowError(true);
      return;
    }

    if (password !== confirmPassword) {
      setError('Parolele nu coincid');
      setShowError(true);
      return;
    }

    if (password.length < 8) {
      setError('Parola trebuie sa aiba minim 8 caractere');
      setShowError(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await register(email, password, firstName, lastName, phone || undefined);

      // Track successful registration
      appInsightsService.trackEvent('UserRegistered', {
        email: email,
        hasPhone: phone ? 'true' : 'false',
      });

      // After successful registration:
      // 1. authStore sets isAuthenticated=true → AppNavigator switches to MainNavigator
      // 2. User lands on DashboardScreen (first tab)
      // 3. DashboardScreen auto-checks KYC status → redirects to KycFormScreen
      // 4. KYC is blocking — user cannot access the app until verified
    } catch (err: any) {
      // Track registration error
      appInsightsService.trackError(err instanceof Error ? err : new Error(err?.message || 'Unknown error'), {
        screen: 'RegisterScreen',
        errorType: 'RegistrationError',
      });

      setError(err.response?.data?.message || 'Eroare la inregistrare');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={22} color={colors.light[100]} />
          </TouchableOpacity>

          {/* Logo */}
          <Text style={styles.logo}>
            MoneyShop<Text style={styles.logoReg}>{'\u00AE'}</Text>
          </Text>

          {/* Title */}
          <Text style={styles.title}>Creaza cont nou</Text>
          <Text style={styles.subtitle}>
            Completeaza datele pentru a incepe
          </Text>

          {/* First Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>PRENUME</Text>
            <View style={styles.inputWrapper}>
              <Icon name="account-outline" size={20} color={colors.light[60]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Introdu prenumele"
                placeholderTextColor={colors.light[50]}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Last Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>NUME</Text>
            <View style={styles.inputWrapper}>
              <Icon name="account-outline" size={20} color={colors.light[60]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Introdu numele"
                placeholderTextColor={colors.light[50]}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <View style={styles.inputWrapper}>
              <Icon name="email-outline" size={20} color={colors.light[60]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="exemplu@email.com"
                placeholderTextColor={colors.light[50]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>TELEFON (OPTIONAL)</Text>
            <View style={styles.inputWrapper}>
              <Icon name="phone-outline" size={20} color={colors.light[60]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+40 700 000 000"
                placeholderTextColor={colors.light[50]}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>PAROLA</Text>
            <View style={styles.inputWrapper}>
              <Icon name="lock-outline" size={20} color={colors.light[60]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Minim 8 caractere"
                placeholderTextColor={colors.light[50]}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}>
                <Icon
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.light[60]}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>CONFIRMA PAROLA</Text>
            <View style={styles.inputWrapper}>
              <Icon name="lock-check-outline" size={20} color={colors.light[60]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeta parola"
                placeholderTextColor={colors.light[50]}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}>
                <Icon
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.light[60]}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
            style={[styles.registerButton, loading && styles.registerButtonDisabled]}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>Inregistrare</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Ai deja cont? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Autentifica-te</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: colors.dark[800],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  content: {
    padding: spacing.lg,
    maxWidth: 450,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dark[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.light[100],
    letterSpacing: -0.5,
    marginBottom: spacing.xxl,
  },
  logoReg: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.light[60],
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
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.labelUppercase,
    color: colors.light[60],
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[600],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.dark[400],
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.light[100],
    paddingVertical: spacing.md,
  },
  eyeButton: {
    padding: spacing.sm,
  },
  registerButton: {
    backgroundColor: colors.brand.primary,
    minHeight: 56,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  registerButtonDisabled: {
    opacity: 0.5,
  },
  registerButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    ...typography.bodyMedium,
    color: colors.light[60],
  },
  loginLink: {
    ...typography.labelLarge,
    color: colors.brand.primary,
  },
  snackbar: {
    backgroundColor: colors.error[500],
  },
});

export default RegisterScreen;
