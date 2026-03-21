import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Text,
} from 'react-native';
import {Snackbar} from 'react-native-paper';
import {otpApi} from '../../services/api/otpApi';
import {useAuthStore} from '../../store/authStore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {DSTextInput, BigButton, DSCard} from '../../components/ui';
import Logo from '../../components/Logo';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

interface Props {
  navigation: any;
}

const OtpLoginScreen: React.FC<Props> = ({navigation}) => {
  const [phone, setPhone] = useState('');
  const [otpId, setOtpId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpFromServer, setOtpFromServer] = useState<string | null>(null);
  const otpInputRef = useRef<TextInput>(null);
  const {loginWithToken} = useAuthStore();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleRequestOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Te rugam sa introduci un numar de telefon valid');
      setShowError(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await otpApi.requestOtp({
        phone: phone.startsWith('+') ? phone : `+40${phone}`,
        purpose: 'LOGIN_SMS',
      });

      setOtpId(response.otpId);
      setCountdown(300);
      if (response.otpCode) {
        setOtpFromServer(response.otpCode);
      }
      otpInputRef.current?.focus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Eroare la trimiterea codului OTP');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpId || !otpCode || otpCode.length !== 6) {
      setError('Te rugam sa introduci codul OTP de 6 cifre');
      setShowError(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await otpApi.verifyOtp({
        otpId,
        code: otpCode,
        phone: phone.startsWith('+') ? phone : `+40${phone}`,
        purpose: 'LOGIN_SMS',
      });

      if (response.accessToken && response.user) {
        await loginWithToken(response.accessToken, response.user);
      } else {
        setError(response.message || 'Eroare la verificarea codului');
        setShowError(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Cod OTP invalid');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}>
            <Icon name="arrow-left" size={22} color={colors.light[100]} />
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoSection}>
            <Logo size="medium" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Autentificare cu cod SMS</Text>
          <Text style={styles.subtitle}>
            Introdu numarul de telefon pentru a primi codul
          </Text>

          {!otpId ? (
            <>
              {/* Phone Input */}
              <DSTextInput
                label="NUMAR DE TELEFON"
                leftIcon="phone-outline"
                value={phone}
                onChangeText={setPhone}
                placeholder="0712345678"
                keyboardType="phone-pad"
              />

              {/* Send OTP Button */}
              <BigButton
                title={loading ? 'Se trimite...' : 'Trimite cod SMS'}
                onPress={handleRequestOtp}
                variant="primary"
                loading={loading}
                disabled={loading}
                icon="message-text-outline"
              />

              {/* Dev OTP display */}
              {otpFromServer && (
                <DSCard style={styles.devOtpCard} variant="highlighted">
                  <Text style={styles.devOtpLabel}>COD OTP (DEVELOPMENT)</Text>
                  <Text style={styles.devOtpCode}>{otpFromServer}</Text>
                </DSCard>
              )}
            </>
          ) : (
            <>
              {/* Info text */}
              <DSCard variant="highlighted" style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Icon name="message-text-outline" size={20} color={colors.brand.primary} />
                  <Text style={styles.infoText}>
                    Am trimis un cod SMS la {phone}
                  </Text>
                </View>
              </DSCard>

              {/* OTP Input */}
              <DSTextInput
                label="COD OTP"
                leftIcon="lock-outline"
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
              />

              {/* Countdown */}
              {countdown > 0 && (
                <View style={styles.countdownContainer}>
                  <Icon name="timer-outline" size={16} color={colors.warning[400]} />
                  <Text style={styles.countdownText}>
                    Codul expira in: {formatCountdown(countdown)}
                  </Text>
                </View>
              )}

              {/* Verify Button */}
              <BigButton
                title={loading ? 'Se verifica...' : 'Verifica cod'}
                onPress={handleVerifyOtp}
                variant="primary"
                loading={loading}
                disabled={loading || otpCode.length !== 6}
                icon="check-circle-outline"
              />

              {/* Change number */}
              <TouchableOpacity
                onPress={() => {
                  setOtpId(null);
                  setOtpCode('');
                  setOtpFromServer(null);
                  setCountdown(0);
                }}
                style={styles.linkButton}
                activeOpacity={0.7}>
                <Text style={styles.linkButtonText}>Schimba numarul</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>sau</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email login link */}
          <BigButton
            title="Autentificare cu email/parola"
            onPress={() => navigation.goBack()}
            variant="secondary"
            icon="email-outline"
          />
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
    backgroundColor: colors.dark[900],
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.dark[600],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoSection: {
    alignItems: 'flex-start',
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
  infoCard: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.light[80],
    flex: 1,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  countdownText: {
    ...typography.labelMedium,
    color: colors.warning[400],
  },
  devOtpCard: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  devOtpLabel: {
    ...typography.labelUppercase,
    color: colors.brand.primary,
    marginBottom: spacing.sm,
  },
  devOtpCode: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.brand.primary,
    textAlign: 'center',
    letterSpacing: 6,
  },
  linkButton: {
    alignSelf: 'center',
    paddingVertical: spacing.md,
  },
  linkButtonText: {
    ...typography.labelMedium,
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
  snackbar: {
    backgroundColor: colors.error[500],
  },
});

export default OtpLoginScreen;
