import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import {Text} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography, shadows} from '../../theme/designSystem';

const logoImage = require('../../../assets/images/logo/Logo.PNG');

const {width, height} = Dimensions.get('window');

// URL-ul aplicației web pentru autentificare
const WEB_APP_URL = 'https://moneyshop.ro'; // Înlocuiește cu URL-ul real
const LOGIN_URL = `${WEB_APP_URL}/Account/Login`;

/**
 * MobileLoginScreen - Ecran simplu de login pentru mobile
 * 
 * Utilizatorul trebuie să deschidă browser-ul pentru autentificare.
 * După autentificare, se revine în aplicație.
 */

const MobileLoginScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenBrowser = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const canOpen = await Linking.canOpenURL(LOGIN_URL);
      
      if (canOpen) {
        await Linking.openURL(LOGIN_URL);
      } else {
        setError('Nu s-a putut deschide browser-ul. Te rugăm să încerci din nou.');
      }
    } catch (err) {
      console.error('Error opening browser:', err);
      setError('A apărut o eroare. Te rugăm să încerci din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCalculator = async () => {
    try {
      await Linking.openURL(WEB_APP_URL);
    } catch (err) {
      console.error('Error opening calculator:', err);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.dark[900]} />
      
      {/* Background gradient effect */}
      <View style={styles.backgroundGradient1} />
      <View style={styles.backgroundGradient2} />
      
      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={logoImage}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        {/* Title */}
        <Text style={styles.title}>Bine ai venit!</Text>
        <Text style={styles.subtitle}>
          Simulează și decide informat cu MoneyShop
        </Text>
        
        {/* Badge */}
        <View style={styles.badge}>
          <Icon name="tag" size={16} color={colors.success[400]} />
          <Text style={styles.badgeText}>FARĂ COMISION</Text>
          <Text style={styles.badgeSubtext}>(complet gratuit)</Text>
        </View>
        
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="information-outline" size={24} color={colors.brand.primary} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Autentificare securizată</Text>
            <Text style={styles.infoText}>
              Pentru siguranța ta, autentificarea se face prin browser-ul web. Vei fi redirecționat către pagina de login.
            </Text>
          </View>
        </View>
        
        {/* Error message */}
        {error && (
          <View style={styles.errorBox}>
            <Icon name="alert-circle" size={20} color={colors.error[500]} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Main Button */}
        <TouchableOpacity
          style={styles.mainButton}
          onPress={handleOpenBrowser}
          disabled={isLoading}
          activeOpacity={0.8}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon name="login" size={22} color="#fff" />
              <Text style={styles.mainButtonText}>Conectează-te</Text>
              <Icon name="open-in-new" size={18} color="rgba(255,255,255,0.7)" />
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.browserNote}>
          Se va deschide în browser
        </Text>
        
        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>sau</Text>
          <View style={styles.dividerLine} />
        </View>
        
        {/* Secondary Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleOpenCalculator}
          activeOpacity={0.8}>
          <Icon name="calculator" size={20} color={colors.brand.primary} />
          <Text style={styles.secondaryButtonText}>Calculator Credite</Text>
        </TouchableOpacity>
        
        {/* Features */}
        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <Icon name="shield-check" size={18} color={colors.success[400]} />
            <Text style={styles.featureText}>Securizat</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="speedometer" size={18} color={colors.warning[400]} />
            <Text style={styles.featureText}>Rapid</Text>
          </View>
          <View style={styles.featureItem}>
            <Icon name="eye" size={18} color={colors.brand.primary} />
            <Text style={styles.featureText}>Transparent</Text>
          </View>
        </View>
      </View>
      
      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          MoneyShop® - Broker de credite autorizat
        </Text>
        <Text style={styles.footerVersion}>
          Versiune {Platform.OS === 'ios' ? 'iOS' : 'Android'} 1.0.0
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[900],
  },
  backgroundGradient1: {
    position: 'absolute',
    top: -height * 0.2,
    right: -width * 0.3,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: 'rgba(0, 117, 235, 0.08)',
  },
  backgroundGradient2: {
    position: 'absolute',
    bottom: -height * 0.1,
    left: -width * 0.2,
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    backgroundColor: 'rgba(127, 132, 246, 0.05)',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 80 : 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: spacing.xl,
  },
  logo: {
    width: 280,
    height: 100,
  },
  title: {
    ...typography.h1,
    color: '#fff',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    marginBottom: spacing.xl,
    gap: spacing.xs,
  },
  badgeText: {
    ...typography.labelMedium,
    color: colors.success[400],
  },
  badgeSubtext: {
    ...typography.caption,
    color: colors.success[400],
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    width: '100%',
  },
  infoContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoTitle: {
    ...typography.labelLarge,
    color: colors.brand.primary,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.bodySmall,
    color: '#94a3b8',
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    width: '100%',
    gap: spacing.sm,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error[400],
    flex: 1,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.primary,
    width: '100%',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.pill,
    gap: spacing.md,
    ...shadows.lg,
  },
  mainButtonText: {
    ...typography.h4,
    color: '#fff',
  },
  browserNote: {
    ...typography.caption,
    color: '#64748b',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1e293b',
  },
  dividerText: {
    ...typography.caption,
    color: '#64748b',
    paddingHorizontal: spacing.md,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#334155',
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.labelLarge,
    color: '#94a3b8',
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.xl,
  },
  featureItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureText: {
    ...typography.caption,
    color: '#64748b',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxl : spacing.xl,
  },
  footerText: {
    ...typography.caption,
    color: '#475569',
  },
  footerVersion: {
    ...typography.caption,
    color: '#374151',
    marginTop: spacing.xs,
  },
});

export default MobileLoginScreen;

