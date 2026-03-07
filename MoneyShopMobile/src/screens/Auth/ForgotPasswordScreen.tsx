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
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPassword'
>;

interface Props {
  navigation: ForgotPasswordScreenNavigationProp;
}

const ForgotPasswordScreen: React.FC<Props> = ({navigation}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Te rugam sa introduci adresa de email');
      setShowError(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // TODO: Implement password reset API call
      // await authApi.forgotPassword(email);
      setSuccess(true);
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Eroare la resetarea parolei');
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
          <Text style={styles.title}>Resetare parola</Text>
          <Text style={styles.subtitle}>
            Introdu adresa ta de email si vei primi instructiuni pentru resetarea
            parolei.
          </Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <View style={styles.inputWrapper}>
              <Icon
                name="email-outline"
                size={20}
                color={colors.light[60]}
                style={styles.inputIcon}
              />
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

          {/* Reset Button */}
          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.8}
            style={[styles.primaryButton, loading && styles.buttonDisabled]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Trimite email</Text>
            )}
          </TouchableOpacity>

          {/* Back to login link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.linkButton}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={16} color={colors.brand.primary} />
            <Text style={styles.linkButtonText}>Inapoi la autentificare</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Snackbar
        visible={showError}
        onDismiss={() => setShowError(false)}
        duration={3000}
        style={styles.snackbar}>
        {error || 'Eroare'}
      </Snackbar>

      <Snackbar
        visible={success}
        onDismiss={() => setSuccess(false)}
        duration={3000}
        style={styles.successSnackbar}>
        Email trimis cu succes!
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
    lineHeight: 24,
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
  primaryButton: {
    backgroundColor: colors.brand.primary,
    minHeight: 56,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  linkButtonText: {
    ...typography.labelMedium,
    color: colors.brand.primary,
  },
  snackbar: {
    backgroundColor: colors.error[500],
  },
  successSnackbar: {
    backgroundColor: colors.success[500],
  },
});

export default ForgotPasswordScreen;
