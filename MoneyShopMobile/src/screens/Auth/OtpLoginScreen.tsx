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
  ActivityIndicator,
} from 'react-native';
import {Snackbar} from 'react-native-paper';
import {otpApi} from '../../services/api/otpApi';
import {useAuthStore} from '../../store/authStore';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

type OtpLoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'OtpLogin'
>;

interface Props {
  navigation: OtpLoginScreenNavigationProp;
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
      setCountdown(300); // 5 minutes
      if (response.otpCode) {
        // Development mode - show OTP
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
        // Login successful
        await loginWithToken(response.accessToken, response.user);
        // Navigation will be handled by AppNavigator
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
          <Text style={styles.title}>Autentificare cu cod SMS</Text>
          <Text style={styles.subtitle}>
            Introdu numarul de telefon pentru a primi codul
          </Text>

          {!otpId ? (
            <>
              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>NUMAR DE TELEFON</Text>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="phone-outline"
                    size={20}
                    color={colors.light[60]}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="0712345678"
                    placeholderTextColor={colors.light[50]}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Send OTP Button */}
              <TouchableOpacity
                onPress={handleRequestOtp}
                disabled={loading}
                activeOpacity={0.8}
                style={[styles.primaryButton, loading && styles.buttonDisabled]}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Trimite cod SMS</Text>
                )}
              </TouchableOpacity>

              {/* Dev OTP display */}
              {otpFromServer && (
                <View style={styles.devOtpContainer}>
                  <Text style={styles.devOtpLabel}>COD OTP (DEVELOPMENT)</Text>
                  <Text style={styles.devOtpCode}>{otpFromServer}</Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Info text */}
              <View style={styles.infoCard}>
                <Icon name="message-text-outline" size={20} color={colors.brand.primary} />
                <Text style={styles.infoText}>
                  Am trimis un cod SMS la {phone}
                </Text>
              </View>

              {/* OTP Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>COD OTP</Text>
                <View style={styles.inputWrapper}>
                  <Icon
                    name="lock-outline"
                    size={20}
                    color={colors.light[60]}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={otpInputRef}
                    style={styles.input}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    placeholder="000000"
                    placeholderTextColor={colors.light[50]}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

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
              <TouchableOpacity
                onPress={handleVerifyOtp}
                disabled={loading || otpCode.length !== 6}
                activeOpacity={0.8}
                style={[
                  styles.primaryButton,
                  (loading || otpCode.length !== 6) && styles.buttonDisabled,
                ]}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verifica cod</Text>
                )}
              </TouchableOpacity>

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
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
            style={styles.secondaryButton}>
            <Icon name="email-outline" size={20} color={colors.light[100]} />
            <Text style={styles.secondaryButtonText}>
              Autentificare cu email/parola
            </Text>
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
  primaryButton: {
    backgroundColor: colors.brand.primary,
    minHeight: 56,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: borderRadius.pill,
    borderWidth: 1.5,
    borderColor: colors.dark[400],
    backgroundColor: colors.dark[700],
  },
  secondaryButtonText: {
    ...typography.labelLarge,
    color: colors.light[100],
  },
  linkButton: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  linkButtonText: {
    ...typography.labelMedium,
    color: colors.brand.primary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.info[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    padding: spacing.md,
    marginBottom: spacing.lg,
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
  devOtpContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.info[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.brand.primary,
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
