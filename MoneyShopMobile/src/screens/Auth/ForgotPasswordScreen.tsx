import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import {Snackbar} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {DSTextInput, BigButton} from '../../components/ui';
import Logo from '../../components/Logo';
import {colors, spacing, typography} from '../../theme/designSystem';

interface Props {
  navigation: any;
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
      setSuccess(true);
      setTimeout(() => {
        navigation.goBack();
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
          <Text style={styles.title}>Resetare parola</Text>
          <Text style={styles.subtitle}>
            Introdu adresa ta de email si vei primi instructiuni pentru resetarea
            parolei.
          </Text>

          {/* Email Input */}
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

          {/* Reset Button */}
          <BigButton
            title={loading ? 'Se trimite...' : 'Trimite email'}
            onPress={handleResetPassword}
            variant="primary"
            loading={loading}
            disabled={loading}
            icon="email-send-outline"
          />

          {/* Back to login link */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
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
    lineHeight: 24,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
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
