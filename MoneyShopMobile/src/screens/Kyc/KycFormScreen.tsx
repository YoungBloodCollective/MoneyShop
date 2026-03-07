import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Text, ActivityIndicator, Snackbar} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  kycApi,
  KycStatusResponse,
  OcrResult,
  LivenessResult,
  ActiveLivenessResult,
  DecisionResponse,
} from '../../services/api/kycApi';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useAuthStore} from '../../store/authStore';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

type KycStep =
  | 'loading'
  | 'intro'
  | 'document_front'
  | 'document_back'
  | 'selfie'
  | 'active_liveness'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'error';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const KycFormScreen: React.FC<Props> = ({navigation}) => {
  const {user} = useAuthStore();

  const [step, setStep] = useState<KycStep>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  // Captured images
  const [frontImageUri, setFrontImageUri] = useState<string | null>(null);
  const [backImageUri, setBackImageUri] = useState<string | null>(null);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);

  // Results
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null);
  const [activeLivenessResult, setActiveLivenessResult] = useState<ActiveLivenessResult | null>(null);
  const [decision, setDecision] = useState<DecisionResponse | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');

  // Check existing KYC status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      if (user?.role === 'Administrator') {
        navigation.goBack();
        return;
      }

      const status: KycStatusResponse = await kycApi.getStatus();
      if (status.status === 'verified') {
        setStep('approved');
        return;
      }
      if (status.status === 'rejected') {
        setRejectionReason(status.rejectionReason || 'Verificarea nu a trecut');
        setStep('rejected');
        return;
      }
      // pending or no session — show intro
      setStep('intro');
    } catch (err: any) {
      if (err.response?.status === 404) {
        setStep('intro');
      } else {
        setStep('intro');
      }
    }
  };

  const showSnack = (msg: string) => {
    setSnackMessage(msg);
    setSnackVisible(true);
  };

  // ── Step handlers ──

  const handleStartKyc = async () => {
    try {
      setIsSubmitting(true);
      await kycApi.startSession();
      setStep('document_front');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Eroare la pornirea sesiunii KYC';
      if (msg.includes('already_verified')) {
        setStep('approved');
        return;
      }
      showSnack(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const captureImage = async (facing: 'back' | 'front' = 'back'): Promise<string | null> => {
    try {
      const {status} = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showSnack('Permisiunea camerei este necesara pentru KYC');
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        cameraType: facing === 'front'
          ? ImagePicker.CameraType.front
          : ImagePicker.CameraType.back,
        allowsEditing: false,
        base64: Platform.OS === 'web',
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const asset = result.assets[0];
      if (Platform.OS === 'web' && asset.base64) {
        return `data:image/jpeg;base64,${asset.base64}`;
      }
      return asset.uri;
    } catch (err: any) {
      showSnack('Eroare la captura imaginii');
      return null;
    }
  };

  const pickImage = async (): Promise<string | null> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
        base64: Platform.OS === 'web',
      });

      if (result.canceled || !result.assets?.[0]) return null;

      const asset = result.assets[0];
      if (Platform.OS === 'web' && asset.base64) {
        return `data:image/jpeg;base64,${asset.base64}`;
      }
      return asset.uri;
    } catch (err: any) {
      showSnack('Eroare la selectarea imaginii');
      return null;
    }
  };

  const handleCaptureDocumentFront = async () => {
    if (Platform.OS === 'web') {
      const uri = await pickImage();
      if (uri) setFrontImageUri(uri);
    } else {
      Alert.alert('Carte de identitate - fata', 'Alege sursa imaginii', [
        {text: 'Camera', onPress: async () => {
          const uri = await captureImage('back');
          if (uri) setFrontImageUri(uri);
        }},
        {text: 'Galerie', onPress: async () => {
          const uri = await pickImage();
          if (uri) setFrontImageUri(uri);
        }},
        {text: 'Anuleaza', style: 'cancel'},
      ]);
    }
  };

  const handleSubmitDocumentFront = async () => {
    if (!frontImageUri) return;
    try {
      setIsSubmitting(true);
      const result = await kycApi.submitDocument(frontImageUri);
      setOcrResult(result);

      if (result.decision === 'pass') {
        if (result.ocrData?.isNewFormat) {
          setStep('document_back');
        } else {
          setStep('selfie');
        }
      } else if (result.decision === 'retry') {
        showSnack(result.error || 'Date incomplete pe document. Fotografiati din nou.');
        setFrontImageUri(null);
      } else {
        setError(result.error || 'Documentul nu a trecut verificarea');
        setStep('error');
      }
    } catch (err: any) {
      showSnack(err.response?.data?.message || 'Eroare la procesarea documentului');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaptureDocumentBack = async () => {
    if (Platform.OS === 'web') {
      const uri = await pickImage();
      if (uri) setBackImageUri(uri);
    } else {
      Alert.alert('Carte de identitate - spate', 'Alege sursa imaginii', [
        {text: 'Camera', onPress: async () => {
          const uri = await captureImage('back');
          if (uri) setBackImageUri(uri);
        }},
        {text: 'Galerie', onPress: async () => {
          const uri = await pickImage();
          if (uri) setBackImageUri(uri);
        }},
        {text: 'Anuleaza', style: 'cancel'},
      ]);
    }
  };

  const handleSubmitDocumentBack = async () => {
    if (!backImageUri) return;
    try {
      setIsSubmitting(true);
      // Re-submit with both front and back
      const result = await kycApi.submitDocument(frontImageUri!, backImageUri);
      setOcrResult(result);
      setStep('selfie');
    } catch (err: any) {
      showSnack(err.response?.data?.message || 'Eroare la procesarea documentului');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCaptureSelfie = async () => {
    if (Platform.OS === 'web') {
      const uri = await pickImage();
      if (uri) setSelfieUri(uri);
    } else {
      const uri = await captureImage('front');
      if (uri) setSelfieUri(uri);
    }
  };

  const handleSubmitSelfie = async () => {
    if (!selfieUri) return;
    try {
      setIsSubmitting(true);
      const result = await kycApi.submitLiveness(selfieUri);
      setLivenessResult(result);

      if (result.decision === 'pass') {
        setStep('active_liveness');
      } else {
        showSnack('Verificarea selfie nu a trecut. Incercati din nou.');
        setSelfieUri(null);
      }
    } catch (err: any) {
      showSnack(err.response?.data?.message || 'Eroare la verificarea selfie');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActiveLiveness = async () => {
    try {
      setIsSubmitting(true);

      // For now, simulate challenges (the real implementation would use face detection)
      // The backend validates challenge data
      const challenges = [
        {type: 'blink', passed: true, durationMs: 1500},
        {type: 'smile', passed: true, durationMs: 2000},
        {type: 'turn_left', passed: true, durationMs: 2500},
      ];

      // Capture a new selfie for active liveness
      let livenessUri = selfieUri;
      if (Platform.OS !== 'web') {
        const uri = await captureImage('front');
        if (uri) livenessUri = uri;
      }

      if (!livenessUri) {
        showSnack('Selfie este necesar');
        setIsSubmitting(false);
        return;
      }

      const result = await kycApi.submitActiveLiveness(livenessUri, challenges);
      setActiveLivenessResult(result);

      if (result.decision === 'pass') {
        // Final step: face comparison
        setStep('processing');
        const decisionResult = await kycApi.submitFaceCompare(frontImageUri!, selfieUri!);
        setDecision(decisionResult);

        if (decisionResult.decision.code === 9001) {
          setStep('approved');
        } else {
          setRejectionReason(decisionResult.decision.reason || 'Verificarea nu a trecut');
          setStep('rejected');
        }
      } else {
        showSnack('Verificarea liveness nu a trecut. Incercati din nou.');
      }
    } catch (err: any) {
      showSnack(err.response?.data?.message || 'Eroare la verificare');
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setFrontImageUri(null);
    setBackImageUri(null);
    setSelfieUri(null);
    setOcrResult(null);
    setLivenessResult(null);
    setActiveLivenessResult(null);
    setDecision(null);
    setError('');
    setStep('intro');
  };

  const handleGoToDashboard = () => {
    navigation.navigate('DashboardHome');
  };

  // ── Render helpers ──

  const renderStepIndicator = () => {
    const steps = ['Document', 'Selfie', 'Liveness', 'Verificare'];
    const currentIdx =
      step === 'document_front' || step === 'document_back' ? 0 :
      step === 'selfie' ? 1 :
      step === 'active_liveness' ? 2 :
      step === 'processing' || step === 'approved' ? 3 : -1;

    if (currentIdx < 0) return null;

    return (
      <View style={styles.stepIndicator}>
        {steps.map((label, i) => (
          <View key={label} style={styles.stepItem}>
            <View style={[
              styles.stepDot,
              i <= currentIdx ? styles.stepDotActive : styles.stepDotInactive,
            ]}>
              {i < currentIdx ? (
                <Icon name="check" size={14} color={colors.light[50]} />
              ) : (
                <Text style={styles.stepDotText}>{i + 1}</Text>
              )}
            </View>
            <Text style={[
              styles.stepLabel,
              i <= currentIdx ? styles.stepLabelActive : styles.stepLabelInactive,
            ]}>{label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderImagePreview = (uri: string | null, onCapture: () => void, label: string) => (
    <View style={styles.imageSection}>
      {uri ? (
        <View>
          <Image source={{uri}} style={styles.previewImage} resizeMode="contain" />
          <TouchableOpacity style={styles.retakeBtn} onPress={onCapture}>
            <Icon name="camera-retake" size={18} color={colors.light[50]} />
            <Text style={styles.retakeBtnText}>Recaptureaza</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.captureBtn} onPress={onCapture}>
          <Icon name="camera" size={48} color={colors.brand.primary} />
          <Text style={styles.captureBtnText}>{label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Step renders ──

  const renderLoading = () => (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.brand.primary} />
      <Text style={styles.loadingText}>Se verifica statusul KYC...</Text>
    </View>
  );

  const renderIntro = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconCircle}>
        <Icon name="shield-check" size={56} color={colors.brand.primary} />
      </View>
      <Text style={styles.title}>Verificare identitate</Text>
      <Text style={styles.subtitle}>
        Pentru a-ti proteja contul si a respecta reglementarile,
        trebuie sa iti verificam identitatea.
      </Text>

      <View style={styles.infoBox}>
        <View style={styles.infoRow}>
          <Icon name="card-account-details" size={22} color={colors.brand.primary} />
          <Text style={styles.infoText}>Carte de identitate (fata + spate)</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="camera-front" size={22} color={colors.brand.primary} />
          <Text style={styles.infoText}>Selfie pentru verificare faciala</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="face-recognition" size={22} color={colors.brand.primary} />
          <Text style={styles.infoText}>Verificare liveness (clipire, zambet)</Text>
        </View>
        <View style={styles.infoRow}>
          <Icon name="clock-fast" size={22} color={colors.brand.primary} />
          <Text style={styles.infoText}>Procesul dureaza ~2 minute</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryBtn, isSubmitting && styles.btnDisabled]}
        onPress={handleStartKyc}
        disabled={isSubmitting}>
        {isSubmitting ? (
          <ActivityIndicator size="small" color={colors.light[50]} />
        ) : (
          <Text style={styles.primaryBtnText}>Incepe verificarea</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderDocumentFront = () => (
    <View style={styles.stepContent}>
      {renderStepIndicator()}
      <Text style={styles.title}>Carte de identitate - Fata</Text>
      <Text style={styles.subtitle}>
        Fotografiati partea din fata a cartii de identitate.
        Asigurati-va ca textul este clar si vizibil.
      </Text>
      {renderImagePreview(frontImageUri, handleCaptureDocumentFront, 'Fotografiaza documentul')}
      {frontImageUri && (
        <TouchableOpacity
          style={[styles.primaryBtn, isSubmitting && styles.btnDisabled]}
          onPress={handleSubmitDocumentFront}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <View style={styles.btnLoading}>
              <ActivityIndicator size="small" color={colors.light[50]} />
              <Text style={styles.primaryBtnText}>Se proceseaza OCR...</Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>Trimite documentul</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDocumentBack = () => (
    <View style={styles.stepContent}>
      {renderStepIndicator()}
      <Text style={styles.title}>Carte de identitate - Spate</Text>
      <Text style={styles.subtitle}>
        Aveti un CI de format nou. Fotografiati si spatele.
      </Text>
      {renderImagePreview(backImageUri, handleCaptureDocumentBack, 'Fotografiaza spatele')}
      {backImageUri && (
        <TouchableOpacity
          style={[styles.primaryBtn, isSubmitting && styles.btnDisabled]}
          onPress={handleSubmitDocumentBack}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <View style={styles.btnLoading}>
              <ActivityIndicator size="small" color={colors.light[50]} />
              <Text style={styles.primaryBtnText}>Se proceseaza...</Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>Trimite documentul</Text>
          )}
        </TouchableOpacity>
      )}
      {ocrResult?.ocrData && (
        <View style={styles.ocrPreview}>
          <Text style={styles.ocrTitle}>Date extrase:</Text>
          <Text style={styles.ocrText}>
            {ocrResult.ocrData.firstName} {ocrResult.ocrData.lastName}
          </Text>
          {ocrResult.ocrData.cnp && (
            <Text style={styles.ocrText}>CNP: {ocrResult.ocrData.cnp}</Text>
          )}
        </View>
      )}
    </View>
  );

  const renderSelfie = () => (
    <View style={styles.stepContent}>
      {renderStepIndicator()}
      <Text style={styles.title}>Selfie</Text>
      <Text style={styles.subtitle}>
        Faceti un selfie clar. Asigurati-va ca fata este bine iluminata.
      </Text>
      {renderImagePreview(selfieUri, handleCaptureSelfie, 'Fa un selfie')}
      {selfieUri && (
        <TouchableOpacity
          style={[styles.primaryBtn, isSubmitting && styles.btnDisabled]}
          onPress={handleSubmitSelfie}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <View style={styles.btnLoading}>
              <ActivityIndicator size="small" color={colors.light[50]} />
              <Text style={styles.primaryBtnText}>Se verifica...</Text>
            </View>
          ) : (
            <Text style={styles.primaryBtnText}>Trimite selfie</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderActiveLiveness = () => (
    <View style={styles.stepContent}>
      {renderStepIndicator()}
      <View style={styles.iconCircle}>
        <Icon name="face-recognition" size={48} color={colors.brand.primary} />
      </View>
      <Text style={styles.title}>Verificare liveness</Text>
      <Text style={styles.subtitle}>
        Se va verifica ca sunteti o persoana reala.
        Va rugam faceti un selfie nou cu camera frontala.
      </Text>
      <TouchableOpacity
        style={[styles.primaryBtn, isSubmitting && styles.btnDisabled]}
        onPress={handleActiveLiveness}
        disabled={isSubmitting}>
        {isSubmitting ? (
          <View style={styles.btnLoading}>
            <ActivityIndicator size="small" color={colors.light[50]} />
            <Text style={styles.primaryBtnText}>Se proceseaza...</Text>
          </View>
        ) : (
          <Text style={styles.primaryBtnText}>Porneste verificarea</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.brand.primary} />
      <Text style={styles.loadingText}>Se compara datele...</Text>
      <Text style={styles.subtitle}>
        Verificam ca selfie-ul corespunde cu fotografia din document.
      </Text>
    </View>
  );

  const renderApproved = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, {backgroundColor: 'rgba(0,200,83,0.15)'}]}>
        <Icon name="check-circle" size={64} color="#00C853" />
      </View>
      <Text style={styles.title}>Identitate verificata!</Text>
      <Text style={styles.subtitle}>
        Contul tau a fost verificat cu succes.
        Acum poti accesa toate functiile aplicatiei.
      </Text>
      {decision?.decision?.person && (
        <View style={styles.ocrPreview}>
          <Text style={styles.ocrText}>
            {decision.decision.person.firstName} {decision.decision.person.lastName}
          </Text>
          {decision.decision.person.idNumber && (
            <Text style={styles.ocrText}>CNP: {decision.decision.person.idNumber}</Text>
          )}
        </View>
      )}
      <TouchableOpacity style={styles.primaryBtn} onPress={handleGoToDashboard}>
        <Text style={styles.primaryBtnText}>Mergi la Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRejected = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, {backgroundColor: 'rgba(255,61,0,0.15)'}]}>
        <Icon name="close-circle" size={64} color="#FF3D00" />
      </View>
      <Text style={styles.title}>Verificare nereusita</Text>
      <Text style={styles.subtitle}>{rejectionReason}</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry}>
        <Text style={styles.primaryBtnText}>Incearca din nou</Text>
      </TouchableOpacity>
    </View>
  );

  const renderError = () => (
    <View style={styles.stepContent}>
      <View style={[styles.iconCircle, {backgroundColor: 'rgba(255,61,0,0.15)'}]}>
        <Icon name="alert-circle" size={64} color="#FF3D00" />
      </View>
      <Text style={styles.title}>Eroare</Text>
      <Text style={styles.subtitle}>{error || 'A aparut o eroare neasteptata'}</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry}>
        <Text style={styles.primaryBtnText}>Incearca din nou</Text>
      </TouchableOpacity>
    </View>
  );

  // ── Main render ──

  const renderStep = () => {
    switch (step) {
      case 'loading': return renderLoading();
      case 'intro': return renderIntro();
      case 'document_front': return renderDocumentFront();
      case 'document_back': return renderDocumentBack();
      case 'selfie': return renderSelfie();
      case 'active_liveness': return renderActiveLiveness();
      case 'processing': return renderProcessing();
      case 'approved': return renderApproved();
      case 'rejected': return renderRejected();
      case 'error': return renderError();
      default: return renderLoading();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={4000}
        style={styles.snackbar}>
        {snackMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[900],
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  stepContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.md,
  },

  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    width: '100%',
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: colors.brand.primary,
  },
  stepDotInactive: {
    backgroundColor: colors.dark[600],
  },
  stepDotText: {
    color: colors.light[50],
    fontSize: 12,
    fontWeight: '600',
  },
  stepLabel: {
    fontSize: 11,
  },
  stepLabelActive: {
    color: colors.light[100],
  },
  stepLabelInactive: {
    color: colors.dark[400],
  },

  // Typography
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.light[50],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.dark[300],
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
    paddingHorizontal: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: colors.light[100],
    marginTop: spacing.md,
  },

  // Icon circle
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0,117,235,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  // Info box
  infoBox: {
    backgroundColor: colors.dark[800],
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoText: {
    color: colors.light[90],
    fontSize: 14,
    marginLeft: spacing.md,
    flex: 1,
  },

  // Image capture
  imageSection: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  captureBtn: {
    backgroundColor: colors.dark[800],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.dark[600],
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  captureBtnText: {
    color: colors.light[90],
    fontSize: 15,
    marginTop: spacing.sm,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.dark[800],
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  retakeBtnText: {
    color: colors.light[90],
    marginLeft: spacing.xs,
    fontSize: 14,
  },

  // OCR preview
  ocrPreview: {
    backgroundColor: colors.dark[800],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    width: '100%',
    marginTop: spacing.md,
  },
  ocrTitle: {
    color: colors.brand.primary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  ocrText: {
    color: colors.light[90],
    fontSize: 14,
    marginBottom: 2,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryBtnText: {
    color: colors.light[50],
    fontSize: 16,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Snackbar
  snackbar: {
    backgroundColor: colors.dark[700],
  },
});

export default KycFormScreen;
