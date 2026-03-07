import React, {useState, useEffect} from 'react';
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
import {authApi} from '../../services/api/authApi';
import {useAuthStore} from '../../store/authStore';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

interface Props {
  navigation: NativeStackNavigationProp<any>;
  route: {
    params: {
      type: 'email' | 'phone';
      email?: string;
      phone?: string;
      onComplete?: 'phone_verification' | 'dashboard';
    };
  };
}

const VerificationScreen: React.FC<Props> = ({navigation, route}) => {
  const {type, email, phone, onComplete} = route.params;
  const {setUser} = useAuthStore();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    sendVerificationCode();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendVerificationCode = async () => {
    try {
      setSending(true);
      setError(null);

      let result;
      if (type === 'email') {
        result = await authApi.sendEmailVerification(email);
      } else {
        result = await authApi.sendPhoneVerification(phone);
      }

      setOtpId(result.otpId);
      setCountdown(Math.floor(result.expiresInSeconds / 60));
      setSuccess('Codul de verificare a fost trimis');
      setShowSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Eroare la trimiterea codului');
      setShowError(true);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Te rugam sa introduci codul de 6 cifre');
      setShowError(true);
      return;
    }

    if (!otpId) {
      setError('Te rugam sa trimiti mai intai codul de verificare');
      setShowError(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let result;
      if (type === 'email') {
        result = await authApi.verifyEmail(otpId, code, email);
      } else {
        result = await authApi.verifyPhone(otpId, code, phone);
      }

      // Refresh user in auth store to reflect verified status
      let refreshedPhone = phone;
      try {
        const updatedUser = await authApi.getCurrentUser();
        setUser(updatedUser);
        refreshedPhone = updatedUser?.phone || phone;
      } catch (_) {
        // Non-critical — store will refresh on next app launch
      }

      setSuccess(result.message);
      setShowSuccess(true);

      setTimeout(() => {
        if (onComplete === 'phone_verification') {
          // Navigate to phone verification (replace to avoid back-stack buildup)
          navigation.replace('Verification', {
            type: 'phone',
            phone: refreshedPhone,
            onComplete: 'dashboard',
          });
        } else if (onComplete === 'dashboard') {
          // Go back to Dashboard — it will re-check status (KYC, etc.)
          navigation.goBack();
        } else {
          // Default: go back (used from Profile stack or Auth stack)
          navigation.goBack();
        }
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Cod invalid');
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

          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon
              name={type === 'email' ? 'email-check-outline' : 'phone-check-outline'}
              size={48}
              color={colors.brand.primary}
            />
          </View>

          <Text style={styles.title}>
            Verificare {type === 'email' ? 'Email' : 'Telefon'}
          </Text>

          <Text style={styles.subtitle}>
            {type === 'email'
              ? `Am trimis un cod de verificare la ${email}`
              : `Am trimis un cod de verificare la ${phone}`}
          </Text>

          {/* Code Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>COD DE VERIFICARE</Text>
            <View style={styles.inputWrapper}>
              <Icon name="lock-outline" size={20} color={colors.light[60]} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="000000"
                placeholderTextColor={colors.light[50]}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading && !sending}
              />
            </View>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            onPress={handleVerify}
            disabled={loading || sending || !code || code.length !== 6}
            activeOpacity={0.8}
            style={[
              styles.verifyButton,
              (loading || sending || !code || code.length !== 6) && styles.buttonDisabled,
            ]}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verifica</Text>
            )}
          </TouchableOpacity>

          {/* Resend */}
          <TouchableOpacity
            onPress={sendVerificationCode}
            disabled={sending || countdown > 0}
            activeOpacity={0.7}
            style={styles.resendButton}>
            {sending ? (
              <ActivityIndicator color={colors.brand.primary} size="small" />
            ) : (
              <Text style={[
                styles.resendText,
                (sending || countdown > 0) && styles.resendTextDisabled,
              ]}>
                {countdown > 0
                  ? `Retrimite codul (${countdown} min)`
                  : 'Retrimite codul'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Snackbar
        visible={showError}
        onDismiss={() => setShowError(false)}
        duration={3000}
        style={styles.errorSnackbar}
        action={{
          label: 'OK',
          onPress: () => setShowError(false),
          textColor: '#FFFFFF',
        }}>
        {error}
      </Snackbar>

      <Snackbar
        visible={showSuccess}
        onDismiss={() => setShowSuccess(false)}
        duration={2000}
        style={styles.successSnackbar}>
        {success}
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
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dark[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.info[50],
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.light[100],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.light[60],
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
    ...typography.h3,
    color: colors.light[100],
    paddingVertical: spacing.md,
    letterSpacing: 8,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: colors.brand.primary,
    minHeight: 56,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  verifyButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
  },
  resendButton: {
    alignItems: 'center',
    padding: spacing.md,
  },
  resendText: {
    ...typography.labelLarge,
    color: colors.brand.primary,
  },
  resendTextDisabled: {
    color: colors.light[50],
  },
  errorSnackbar: {
    backgroundColor: colors.error[500],
  },
  successSnackbar: {
    backgroundColor: colors.success[500],
  },
});

export default VerificationScreen;
