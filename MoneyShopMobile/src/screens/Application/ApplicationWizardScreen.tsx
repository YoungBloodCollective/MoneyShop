import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  RadioButton,
  ProgressBar,
} from 'react-native-paper';
import {useMutation} from '@tanstack/react-query';
import {applicationsApi} from '../../services/api/applicationsApi';
import {Application} from '../../types/application.types';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {appInsightsService} from '../../services/telemetry/appInsightsService';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

type ApplicationWizardScreenNavigationProp = NativeStackNavigationProp<any>;

interface Props {
  navigation: ApplicationWizardScreenNavigationProp;
}

const ApplicationWizardScreen: React.FC<Props> = ({navigation}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 7;

  // Step 1: Date personale
  const [nume, setNume] = useState('');
  const [prenume, setPrenume] = useState('');
  const [cnp, setCnp] = useState('');
  const [adresa, setAdresa] = useState('');

  // Step 2: Venituri
  const [salariuNet, setSalariuNet] = useState('');
  const [bonuriMasa, setBonuriMasa] = useState(false);
  const [sumaBonuriMasa, setSumaBonuriMasa] = useState('');
  const [venituriAlte, setVenituriAlte] = useState('');

  // Step 3: Credite existente
  const [nrCrediteBanci, setNrCrediteBanci] = useState('');
  const [soldTotal, setSoldTotal] = useState('');
  const [rataLunara, setRataLunara] = useState('');

  // Step 4: Tip credit
  const [typeCredit, setTypeCredit] = useState<string>('nevoi_personale');
  const [tipOperatiune, setTipOperatiune] = useState<string>('nou');
  const [sumaDorita, setSumaDorita] = useState('');
  const [perioada, setPerioada] = useState('');

  // Step 5: Upload documente (placeholder - fara upload real)
  const [documenteUploadate, setDocumenteUploadate] = useState<string[]>([]);

  // Step 6: Acorduri (fara OCR si semnatura)
  const [acordMarketing, setAcordMarketing] = useState(false);
  const [acordGdpr, setAcordGdpr] = useState(false);
  const [acordIntermediere, setAcordIntermediere] = useState(false);

  const createApplicationMutation = useMutation({
    mutationFn: (application: Partial<Application>) =>
      applicationsApi.create(application),
    onSuccess: (data, variables) => {
      // Track successful application creation
      appInsightsService.trackEvent('ApplicationCreated', {
        typeCredit: variables.typeCredit || 'unknown',
        tipOperatiune: variables.tipOperatiune || 'unknown',
      });
      navigation.navigate('ApplicationSuccess');
    },
    onError: (error: any) => {
      // Track application creation error
      appInsightsService.trackError(
        error instanceof Error ? error : new Error(error?.message || 'Unknown error'),
        {
          screen: 'ApplicationWizardScreen',
          errorType: 'ApplicationCreationError',
        }
      );
    },
  });

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // Track button click event
    appInsightsService.trackButtonClick('CreateApplication', 'submit', {
      screen: 'ApplicationWizardScreen',
      step: currentStep.toString(),
      typeCredit: typeCredit,
    });

    const application: Partial<Application> = {
      typeCredit,
      tipOperatiune,
      salariuNet: parseFloat(salariuNet) || undefined,
      bonuriMasa,
      sumaBonuriMasa: bonuriMasa ? parseFloat(sumaBonuriMasa) || undefined : undefined,
      soldTotal: parseFloat(soldTotal) || undefined,
      nrCrediteBanci: parseInt(nrCrediteBanci) || undefined,
    };

    createApplicationMutation.mutate(application);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>
              Pas 1: Date personale
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Nume</Text>
              <TextInput
                value={nume}
                onChangeText={setNume}
                style={styles.input}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti numele"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Prenume</Text>
              <TextInput
                value={prenume}
                onChangeText={setPrenume}
                style={styles.input}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti prenumele"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>CNP</Text>
              <TextInput
                value={cnp}
                onChangeText={setCnp}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti CNP-ul"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Adresa</Text>
              <TextInput
                value={adresa}
                onChangeText={setAdresa}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.inputMultiline]}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti adresa"
                textAlignVertical="top"
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>
              Pas 2: Venituri
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Salariu net (lei)</Text>
              <TextInput
                value={salariuNet}
                onChangeText={setSalariuNet}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti salariul net"
              />
            </View>
            <View style={styles.checkboxRow}>
              <RadioButton
                value="da"
                status={bonuriMasa ? 'checked' : 'unchecked'}
                onPress={() => setBonuriMasa(!bonuriMasa)}
                color={colors.brand.primary}
                uncheckedColor={colors.light[50]}
              />
              <Text style={styles.checkboxLabel}>Am bonuri de masa</Text>
            </View>
            {bonuriMasa && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Suma bonuri de masa (lei/luna)</Text>
                <TextInput
                  value={sumaBonuriMasa}
                  onChangeText={setSumaBonuriMasa}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholderTextColor={colors.light[50]}
                  placeholder="Introduceti suma"
                />
              </View>
            )}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Alte venituri (lei/luna) - optional</Text>
              <TextInput
                value={venituriAlte}
                onChangeText={setVenituriAlte}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti alte venituri"
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>
              Pas 3: Credite existente
            </Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Numar credite bancare active</Text>
              <TextInput
                value={nrCrediteBanci}
                onChangeText={setNrCrediteBanci}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti numarul"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Sold total ramas (lei)</Text>
              <TextInput
                value={soldTotal}
                onChangeText={setSoldTotal}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti soldul total"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Rata lunara totala (lei)</Text>
              <TextInput
                value={rataLunara}
                onChangeText={setRataLunara}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti rata lunara"
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>
              Pas 4: Tip credit
            </Text>
            <Text style={styles.sectionTitle}>
              TIP CREDIT DORIT
            </Text>
            <RadioButton.Group
              onValueChange={setTypeCredit}
              value={typeCredit}>
              <View style={styles.radioRow}>
                <RadioButton
                  value="ipotecar"
                  color={colors.brand.primary}
                  uncheckedColor={colors.light[50]}
                />
                <Text style={styles.radioLabel}>Ipotecar</Text>
              </View>
              <View style={styles.radioRow}>
                <RadioButton
                  value="nevoi_personale"
                  color={colors.brand.primary}
                  uncheckedColor={colors.light[50]}
                />
                <Text style={styles.radioLabel}>Nevoi personale</Text>
              </View>
            </RadioButton.Group>
            <Text style={styles.sectionTitle}>
              TIP OPERATIUNE
            </Text>
            <RadioButton.Group
              onValueChange={setTipOperatiune}
              value={tipOperatiune}>
              <View style={styles.radioRow}>
                <RadioButton
                  value="nou"
                  color={colors.brand.primary}
                  uncheckedColor={colors.light[50]}
                />
                <Text style={styles.radioLabel}>Nou</Text>
              </View>
              <View style={styles.radioRow}>
                <RadioButton
                  value="refinantare"
                  color={colors.brand.primary}
                  uncheckedColor={colors.light[50]}
                />
                <Text style={styles.radioLabel}>Refinantare</Text>
              </View>
            </RadioButton.Group>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Suma dorita (lei)</Text>
              <TextInput
                value={sumaDorita}
                onChangeText={setSumaDorita}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti suma dorita"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Perioada (luni)</Text>
              <TextInput
                value={perioada}
                onChangeText={setPerioada}
                keyboardType="numeric"
                style={styles.input}
                placeholderTextColor={colors.light[50]}
                placeholder="Introduceti perioada in luni"
              />
            </View>
          </View>
        );

      case 5:
        return (
          <View>
            <Text style={styles.stepTitle}>
              Pas 5: Upload documente
            </Text>
            <Text style={styles.infoText}>
              Documentele necesare vor fi incarcate ulterior prin interfata web sau
              prin aplicatie dupa finalizarea acestui formular.
            </Text>
            <Text style={styles.infoTextSmall}>
              Documente necesare: CI, fluturase salariu, extras de cont, etc.
            </Text>
          </View>
        );

      case 6:
        return (
          <View>
            <Text style={styles.stepTitle}>
              Pas 6: Acorduri
            </Text>
            <Text style={styles.infoText}>
              Te rugam sa citesti si sa accepti urmatoarele acorduri:
            </Text>
            <View style={styles.checkboxRow}>
              <RadioButton
                value="acord1"
                status={acordMarketing ? 'checked' : 'unchecked'}
                onPress={() => setAcordMarketing(!acordMarketing)}
                color={colors.brand.primary}
                uncheckedColor={colors.light[50]}
              />
              <Text style={styles.checkboxText}>
                Acord marketing Popix Brokerage Consulting SRL
              </Text>
            </View>
            <View style={styles.checkboxRow}>
              <RadioButton
                value="acord2"
                status={acordGdpr ? 'checked' : 'unchecked'}
                onPress={() => setAcordGdpr(!acordGdpr)}
                color={colors.brand.primary}
                uncheckedColor={colors.light[50]}
              />
              <Text style={styles.checkboxText}>
                Consimtamant GDPR - Popix Brokerage Consulting SRL colecteaza
                datele si le poate transmite catre Kingstone Management SRL, in
                scopul analizei eligibilitatii pentru un credit bancar.
              </Text>
            </View>
            <View style={styles.checkboxRow}>
              <RadioButton
                value="acord3"
                status={acordIntermediere ? 'checked' : 'unchecked'}
                onPress={() => setAcordIntermediere(!acordIntermediere)}
                color={colors.brand.primary}
                uncheckedColor={colors.light[50]}
              />
              <Text style={styles.checkboxText}>
                Acord intermediere credite (OUG 52/2016 - fara comision)
              </Text>
            </View>
          </View>
        );

      case 7:
        return (
          <View>
            <Text style={styles.stepTitle}>
              Pas 7: Confirmare
            </Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>
                REZUMAT CERERE
              </Text>
              <Text style={styles.summaryText}>
                Nume: {nume} {prenume}
              </Text>
              <Text style={styles.summaryText}>
                Tip credit: {typeCredit === 'ipotecar' ? 'Ipotecar' : 'Nevoi personale'}
              </Text>
              <Text style={styles.summaryText}>
                Suma dorita: {sumaDorita} lei
              </Text>
              <Text style={styles.summaryText}>
                Salariu net: {salariuNet} lei
              </Text>
            </View>
            <Text style={styles.confirmText}>
              Confirm ca datele introduse sunt corecte si accept acordurile
              mentionate.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return nume && prenume && cnp && adresa;
      case 2:
        return salariuNet;
      case 3:
        return true; // Optional
      case 4:
        return typeCredit && tipOperatiune && sumaDorita;
      case 5:
        return true;
      case 6:
        return acordMarketing && acordGdpr && acordIntermediere;
      case 7:
        return true;
      default:
        return false;
    }
  };

  const isSubmitting = createApplicationMutation.isPending;
  const isDisabled = !canProceed() || isSubmitting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.progressContainer}>
        <ProgressBar
          progress={currentStep / totalSteps}
          color={colors.brand.primary}
          style={styles.progressBar}
        />
        <Text style={styles.progressText}>
          Pas {currentStep} din {totalSteps}
        </Text>
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.card}>
          {renderStep()}
        </View>
        <View style={styles.buttons}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.buttonOutlined}
              onPress={handlePrevious}
              activeOpacity={0.8}>
              <Text style={styles.buttonOutlinedLabel}>Inapoi</Text>
            </TouchableOpacity>
          )}
          {currentStep < totalSteps ? (
            <TouchableOpacity
              style={[
                styles.buttonContained,
                isDisabled && styles.buttonDisabled,
              ]}
              onPress={handleNext}
              disabled={!canProceed()}
              activeOpacity={0.8}>
              <Text style={[
                styles.buttonContainedLabel,
                isDisabled && styles.buttonDisabledLabel,
              ]}>Urmatorul</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.buttonContained,
                isDisabled && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isDisabled}
              activeOpacity={0.8}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.light[100]} />
              ) : (
                <Text style={[
                  styles.buttonContainedLabel,
                  isDisabled && styles.buttonDisabledLabel,
                ]}>Trimite cererea</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  progressContainer: {
    padding: spacing.md,
    backgroundColor: colors.dark[700],
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[400],
  },
  progressBar: {
    height: 8,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.dark[500],
  },
  progressText: {
    textAlign: 'center',
    ...typography.labelSmall,
    color: colors.light[60],
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: spacing.md,
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  stepTitle: {
    ...typography.h4,
    marginBottom: spacing.md,
    fontWeight: '700',
    color: colors.light[100],
  },
  sectionTitle: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    ...typography.labelUppercase,
    color: colors.light[60],
  },
  inputWrapper: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.labelSmall,
    color: colors.light[70],
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.dark[600],
    borderWidth: 1,
    borderColor: colors.dark[400],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.light[100],
    minHeight: 56,
  },
  inputMultiline: {
    minHeight: 90,
    paddingTop: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.dark[600],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  checkboxLabel: {
    ...typography.bodyMedium,
    color: colors.light[100],
  },
  checkboxText: {
    flex: 1,
    marginLeft: spacing.sm,
    ...typography.bodySmall,
    color: colors.light[80],
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    backgroundColor: colors.dark[600],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  radioLabel: {
    ...typography.bodyMedium,
    color: colors.light[100],
  },
  infoText: {
    marginBottom: spacing.md,
    ...typography.bodyMedium,
    color: colors.light[60],
  },
  infoTextSmall: {
    marginBottom: spacing.md,
    ...typography.bodySmall,
    color: colors.light[50],
  },
  summaryCard: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.dark[600],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.brand.primary,
    padding: spacing.lg,
  },
  summaryTitle: {
    marginBottom: spacing.md,
    ...typography.labelUppercase,
    color: colors.brand.primary,
  },
  summaryText: {
    marginBottom: spacing.sm,
    ...typography.bodyMedium,
    color: colors.light[90],
  },
  confirmText: {
    marginTop: spacing.md,
    textAlign: 'center',
    ...typography.bodyMedium,
    color: colors.light[50],
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.md,
  },
  buttonOutlined: {
    flex: 1,
    borderRadius: borderRadius.pill,
    borderColor: colors.dark[400],
    borderWidth: 1,
    backgroundColor: 'transparent',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonOutlinedLabel: {
    ...typography.labelLarge,
    color: colors.light[100],
  },
  buttonContained: {
    flex: 1,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.brand.primary,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonContainedLabel: {
    ...typography.labelLarge,
    color: colors.light[100],
  },
  buttonDisabled: {
    backgroundColor: colors.dark[500],
    opacity: 0.6,
  },
  buttonDisabledLabel: {
    color: colors.light[50],
  },
});

export default ApplicationWizardScreen;
