import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  TextInput,
  Card,
} from 'react-native-paper';
import {useQuery, useMutation} from '@tanstack/react-query';
import {simulatorApi} from '../../services/api/simulatorApi';
import {banksApi} from '../../services/api/banksApi';
import {userFinancialDataApi} from '../../services/api/userFinancialDataApi';
import {ScoringRequest, CardCreditData, OverdraftData, CodebitorData} from '../../types/application.types';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';
import {BigButton, ProgressSteps} from '../../components/ui';

type SimulatorFormScreenNavigationProp = NativeStackNavigationProp<any>;

interface Props {
  navigation: SimulatorFormScreenNavigationProp;
}

/**
 * SimulatorFormScreen - Simulator Credit Redesign
 *
 * Principii UX (conform SRS):
 * - 1 ecran = 1 decizie
 * - Text mare și clar
 * - Butoane mari pentru toate vârstele
 * - Fără tehnicisme
 * - Pași simplificați și grupați logic
 */

// Pașii reorganizați pentru UX mai bun (5 pași în loc de 12)
const STEP_TITLES = [
  'Venitul tău',
  'Creditele existente',
  'Tipul de credit',
  'Istoric financiar',
  'Verificare',
];

const SimulatorFormScreen: React.FC<Props> = ({navigation}) => {
  const {data: banks} = useQuery({
    queryKey: ['banks'],
    queryFn: banksApi.getAll,
  });

  const {data: financialData} = useQuery({
    queryKey: ['userFinancialData'],
    queryFn: userFinancialDataApi.getMyData,
    retry: false,
  });

  // State-uri pentru date
  const [salariuNet, setSalariuNet] = useState('');
  const [bonuriMasa, setBonuriMasa] = useState(false);
  const [sumaBonuriMasa, setSumaBonuriMasa] = useState('');
  const [vechimeLuni, setVechimeLuni] = useState('');
  const [nrCrediteBanci, setNrCrediteBanci] = useState('0');
  const [nrIfn, setNrIfn] = useState('0');
  const [poprire, setPoprire] = useState<boolean>(false);
  const [soldTotal, setSoldTotal] = useState('');
  const [typeCredit, setTypeCredit] = useState<string>('nevoi_personale');
  const [tipOperatiune, setTipOperatiune] = useState<string>('nou');
  const [intarzieri, setIntarzieri] = useState<boolean>(false);
  const [intarzieriNumar, setIntarzieriNumar] = useState('');
  const [cardCredit, setCardCredit] = useState<boolean>(false);
  const [carduriCredit, setCarduriCredit] = useState<CardCreditData[]>([]);
  const [overdraft, setOverdraft] = useState<boolean>(false);
  const [descoperite, setDescoperite] = useState<OverdraftData[]>([]);
  const [nrCodebitori, setNrCodebitori] = useState('0');
  const [codebitori, setCodebitori] = useState<CodebitorData[]>([]);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (financialData) {
      if (financialData.salariuNet) setSalariuNet(String(financialData.salariuNet));
      if (financialData.bonuriMasa) {
        setBonuriMasa(true);
        if (financialData.sumaBonuriMasa) setSumaBonuriMasa(String(financialData.sumaBonuriMasa));
      }
      if (financialData.nrCrediteBanci != null) setNrCrediteBanci(String(financialData.nrCrediteBanci));
      if (financialData.nrIfn != null) setNrIfn(String(financialData.nrIfn));
      if (financialData.soldTotal) setSoldTotal(String(financialData.soldTotal));
      if (financialData.poprire != null) setPoprire(financialData.poprire);
      if (financialData.intarzieri != null) setIntarzieri(financialData.intarzieri);
      if (financialData.intarzieriNumar != null) setIntarzieriNumar(String(financialData.intarzieriNumar));
    }
  }, [financialData]);

  const calculateMutation = useMutation({
    mutationFn: (request: ScoringRequest) => simulatorApi.calculateScoring(request),
    onSuccess: (data) => {
      navigation.navigate('SimulatorResult', {result: data});
    },
  });

  const animateTransition = (callback: () => void) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      callback();
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      animateTransition(() => setCurrentStep(currentStep + 1));
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      animateTransition(() => setCurrentStep(currentStep - 1));
    }
  };

  const handleCalculate = () => {
    const request: ScoringRequest = {
      salariuNet: parseFloat(salariuNet) || 0,
      bonuriMasa: bonuriMasa,
      sumaBonuriMasa: bonuriMasa ? parseFloat(sumaBonuriMasa) || 0 : undefined,
      vechimeLuni: parseInt(vechimeLuni) || undefined,
      nrCrediteBanci: parseInt(nrCrediteBanci) || undefined,
      nrIfn: parseInt(nrIfn) || undefined,
      poprire: poprire,
      soldTotal: parseFloat(soldTotal) || undefined,
      intarzieri: intarzieri,
      intarzieriNumar: intarzieri ? parseInt(intarzieriNumar) || 0 : undefined,
      cardCredit: cardCredit ? JSON.stringify(carduriCredit) : undefined,
      overdraft: overdraft ? JSON.stringify(descoperite) : undefined,
      codebitori: codebitori.length > 0 ? JSON.stringify(codebitori) : undefined,
    };

    calculateMutation.mutate(request);
  };

  const formatCurrency = (value: string) => {
    const num = parseInt(value.replace(/\D/g, '')) || 0;
    return num.toLocaleString('ro-RO');
  };

  // Option Card Component
  const OptionCard = ({
    icon,
    title,
    subtitle,
    selected,
    onPress,
    color = colors.brand.primary,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    selected: boolean;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.optionCard,
        selected && [styles.optionCardSelected, {borderColor: color}],
      ]}>
      <View style={[
        styles.optionIcon,
        {backgroundColor: selected ? color : colors.dark[500]},
      ]}>
        <Icon name={icon} size={24} color={selected ? colors.light[100] : colors.light[60]} />
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionTitle, selected && {color}]}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      {selected && (
        <Icon name="check-circle" size={24} color={color} />
      )}
    </TouchableOpacity>
  );

  // Yes/No Toggle
  const YesNoToggle = ({
    label,
    value,
    onChange,
    description,
  }: {
    label: string;
    value: boolean;
    onChange: (val: boolean) => void;
    description?: string;
  }) => (
    <View style={styles.toggleContainer}>
      <View style={styles.toggleLabel}>
        <Text style={styles.toggleTitle}>{label}</Text>
        {description && <Text style={styles.toggleDescription}>{description}</Text>}
      </View>
      <View style={styles.toggleButtons}>
        <TouchableOpacity
          onPress={() => onChange(false)}
          style={[
            styles.toggleButton,
            !value && styles.toggleButtonActive,
          ]}>
          <Text style={[styles.toggleButtonText, !value && styles.toggleButtonTextActive]}>
            Nu
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onChange(true)}
          style={[
            styles.toggleButton,
            value && styles.toggleButtonActiveYes,
          ]}>
          <Text style={[styles.toggleButtonText, value && styles.toggleButtonTextActive]}>
            Da
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Number Input with plus/minus
  const NumberStepper = ({
    label,
    value,
    onChange,
    min = 0,
    max = 10,
  }: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    min?: number;
    max?: number;
  }) => {
    const numValue = parseInt(value) || 0;

    return (
      <View style={styles.stepperContainer}>
        <Text style={styles.stepperLabel}>{label}</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            onPress={() => onChange(Math.max(min, numValue - 1).toString())}
            style={styles.stepperButton}
            disabled={numValue <= min}>
            <Icon name="minus" size={24} color={numValue <= min ? colors.dark[400] : colors.brand.primary} />
          </TouchableOpacity>
          <View style={styles.stepperValue}>
            <Text style={styles.stepperValueText}>{numValue}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onChange(Math.min(max, numValue + 1).toString())}
            style={styles.stepperButton}
            disabled={numValue >= max}>
            <Icon name="plus" size={24} color={numValue >= max ? colors.dark[400] : colors.brand.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Animated.View style={[styles.stepContent, {opacity: fadeAnim}]}>
            <View style={styles.stepHeader}>
              <Icon name="wallet" size={48} color={colors.brand.primary} />
              <Text style={styles.stepTitle}>Care este venitul tău?</Text>
              <Text style={styles.stepSubtitle}>
                Introdu salariul net lunar (suma primită în mână)
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Salariu net lunar</Text>
              <View style={styles.currencyInput}>
                <TextInput
                  style={styles.largeInput}
                  value={salariuNet}
                  onChangeText={setSalariuNet}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.light[50]}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                />
                <Text style={styles.currencyLabel}>Lei</Text>
              </View>
            </View>

            <YesNoToggle
              label="Primești bonuri de masă?"
              value={bonuriMasa}
              onChange={setBonuriMasa}
            />

            {bonuriMasa && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Valoare bonuri (lei/lună)</Text>
                <View style={styles.currencyInput}>
                  <TextInput
                    style={styles.largeInput}
                    value={sumaBonuriMasa}
                    onChangeText={setSumaBonuriMasa}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.light[50]}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                  />
                  <Text style={styles.currencyLabel}>Lei</Text>
                </View>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Vechime la locul de muncă actual</Text>
              <View style={styles.currencyInput}>
                <TextInput
                  style={styles.largeInput}
                  value={vechimeLuni}
                  onChangeText={setVechimeLuni}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.light[50]}
                  mode="flat"
                  underlineColor="transparent"
                  activeUnderlineColor="transparent"
                />
                <Text style={styles.currencyLabel}>Luni</Text>
              </View>
            </View>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View style={[styles.stepContent, {opacity: fadeAnim}]}>
            <View style={styles.stepHeader}>
              <Icon name="credit-card-multiple" size={48} color={colors.warning[500]} />
              <Text style={styles.stepTitle}>Creditele tale existente</Text>
              <Text style={styles.stepSubtitle}>
                Ne ajută să calculăm capacitatea ta de îndatorare
              </Text>
            </View>

            <NumberStepper
              label="Câte credite bancare ai activ?"
              value={nrCrediteBanci}
              onChange={setNrCrediteBanci}
            />

            <NumberStepper
              label="Câte împrumuturi IFN ai activ?"
              value={nrIfn}
              onChange={setNrIfn}
              max={5}
            />

            {(parseInt(nrCrediteBanci) > 0 || parseInt(nrIfn) > 0) && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Sold total rămas de plată</Text>
                <View style={styles.currencyInput}>
                  <TextInput
                    style={styles.largeInput}
                    value={soldTotal}
                    onChangeText={setSoldTotal}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.light[50]}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                  />
                  <Text style={styles.currencyLabel}>Lei</Text>
                </View>
              </View>
            )}

            <YesNoToggle
              label="Ai card de credit?"
              value={cardCredit}
              onChange={setCardCredit}
            />

            <YesNoToggle
              label="Ai descoperit de cont (overdraft)?"
              value={overdraft}
              onChange={setOverdraft}
            />
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View style={[styles.stepContent, {opacity: fadeAnim}]}>
            <View style={styles.stepHeader}>
              <Icon name="file-document-edit" size={48} color={colors.success[500]} />
              <Text style={styles.stepTitle}>Ce tip de credit cauți?</Text>
              <Text style={styles.stepSubtitle}>
                Selectează tipul de finanțare care ți se potrivește
              </Text>
            </View>

            <Text style={styles.sectionLabel}>TIP CREDIT</Text>

            <OptionCard
              icon="home"
              title="Credit Ipotecar"
              subtitle="Pentru achiziția unei locuințe"
              selected={typeCredit === 'ipotecar'}
              onPress={() => setTypeCredit('ipotecar')}
              color={colors.brand.primary}
            />

            <OptionCard
              icon="cash"
              title="Credit Nevoi Personale"
              subtitle="Pentru orice ai nevoie"
              selected={typeCredit === 'nevoi_personale'}
              onPress={() => setTypeCredit('nevoi_personale')}
              color={colors.success[500]}
            />

            <Text style={[styles.sectionLabel, {marginTop: spacing.xl}]}>OPERATIUNE</Text>

            <OptionCard
              icon="plus-circle"
              title="Credit Nou"
              subtitle="Vreau un credit nou"
              selected={tipOperatiune === 'nou'}
              onPress={() => setTipOperatiune('nou')}
            />

            <OptionCard
              icon="refresh"
              title="Refinanțare"
              subtitle="Vreau să refinanțez un credit existent"
              selected={tipOperatiune === 'refinantare'}
              onPress={() => setTipOperatiune('refinantare')}
            />
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View style={[styles.stepContent, {opacity: fadeAnim}]}>
            <View style={styles.stepHeader}>
              <Icon name="history" size={48} color={colors.light[60]} />
              <Text style={styles.stepTitle}>Istoricul tău financiar</Text>
              <Text style={styles.stepSubtitle}>
                Aceste informații ne ajută să evaluăm șansele de aprobare
              </Text>
            </View>

            <YesNoToggle
              label="Ai avut întârzieri la rate în ultimii 2 ani?"
              value={intarzieri}
              onChange={setIntarzieri}
              description="Rate plătite cu mai mult de 30 de zile întârziere"
            />

            {intarzieri && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>De câte ori ai întârziat?</Text>
                <View style={styles.currencyInput}>
                  <TextInput
                    style={styles.largeInput}
                    value={intarzieriNumar}
                    onChangeText={setIntarzieriNumar}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.light[50]}
                    mode="flat"
                    underlineColor="transparent"
                    activeUnderlineColor="transparent"
                  />
                  <Text style={styles.currencyLabel}>ori</Text>
                </View>
              </View>
            )}

            <YesNoToggle
              label="Ai avut poprire pe salariu în ultimii 5 ani?"
              value={poprire}
              onChange={setPoprire}
              description="Rețineri forțate din salariu pentru datorii"
            />

            <NumberStepper
              label="Vei aplica cu codebitor? (soț/soție, rude)"
              value={nrCodebitori}
              onChange={setNrCodebitori}
              max={2}
            />
          </Animated.View>
        );

      case 5:
        return (
          <Animated.View style={[styles.stepContent, {opacity: fadeAnim}]}>
            <View style={styles.stepHeader}>
              <Icon name="check-decagram" size={48} color={colors.success[500]} />
              <Text style={styles.stepTitle}>Verifică datele</Text>
              <Text style={styles.stepSubtitle}>
                Asigură-te că informațiile sunt corecte înainte de calcul
              </Text>
            </View>

            <Card style={styles.summaryCard}>
              <Card.Content>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Salariu net:</Text>
                  <Text style={styles.summaryValue}>
                    {parseInt(salariuNet).toLocaleString('ro-RO') || 0} Lei
                  </Text>
                </View>
                {bonuriMasa && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Bonuri de masă:</Text>
                    <Text style={styles.summaryValue}>
                      {parseInt(sumaBonuriMasa).toLocaleString('ro-RO') || 0} Lei
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Vechime:</Text>
                  <Text style={styles.summaryValue}>
                    {vechimeLuni || 0} luni
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tip credit:</Text>
                  <Text style={styles.summaryValue}>
                    {typeCredit === 'ipotecar' ? 'Ipotecar' : 'Nevoi Personale'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Operațiune:</Text>
                  <Text style={styles.summaryValue}>
                    {tipOperatiune === 'nou' ? 'Credit nou' : 'Refinanțare'}
                  </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Credite active:</Text>
                  <Text style={styles.summaryValue}>
                    {nrCrediteBanci} bancă + {nrIfn} IFN
                  </Text>
                </View>
                {intarzieri && (
                  <View style={styles.summaryRow}>
                    <Icon name="alert-circle" size={16} color={colors.warning[500]} />
                    <Text style={[styles.summaryLabel, {marginLeft: 4, color: colors.warning[400]}]}>
                      {intarzieriNumar} întârzieri raportate
                    </Text>
                  </View>
                )}
                {poprire && (
                  <View style={styles.summaryRow}>
                    <Icon name="alert-circle" size={16} color={colors.error[500]} />
                    <Text style={[styles.summaryLabel, {marginLeft: 4, color: colors.error[400]}]}>
                      Poprire în ultimii 5 ani
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>

            <View style={styles.disclaimerBox}>
              <Icon name="information-outline" size={20} color={colors.brand.primary} />
              <Text style={styles.disclaimerText}>
                Rezultatul este orientativ. Pentru o analiză completă, vei primi oferte personalizate de la băncile partenere.
              </Text>
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>

        <ProgressSteps
          currentStep={currentStep}
          totalSteps={totalSteps}
          stepTitles={STEP_TITLES}
        />

        {renderStep()}

      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        {currentStep > 1 && (
          <BigButton
            title="Înapoi"
            variant="outline"
            icon="arrow-left"
            onPress={handlePrevious}
            style={styles.backButton}
            fullWidth={false}
          />
        )}

        {currentStep < totalSteps ? (
          <BigButton
            title="Continuă"
            icon="arrow-right"
            iconPosition="right"
            onPress={handleNext}
            style={styles.nextButton}
            fullWidth={currentStep === 1}
          />
        ) : (
          <BigButton
            title="Calculează Eligibilitatea"
            subtitle="Vezi ofertele personalizate"
            icon="calculator"
            variant="success"
            onPress={handleCalculate}
            loading={calculateMutation.isPending}
            style={styles.nextButton}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800], // #111214 main dark bg
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  stepContent: {
    marginTop: spacing.md,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  stepTitle: {
    ...typography.h3,
    color: colors.light[100], // #FFFFFF primary text
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    ...typography.bodyMedium,
    color: colors.light[60], // #8A8D91 secondary text
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  sectionLabel: {
    ...typography.labelUppercase, // uppercase with letterSpacing: 1.2
    color: colors.light[60], // #8A8D91 secondary text
    marginBottom: spacing.md,
  },

  // Input Styles
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.labelMedium,
    color: colors.light[60], // #8A8D91 secondary text
    marginBottom: spacing.sm,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[600], // #1F2226 input bg
    borderRadius: borderRadius.xl, // 20
    borderWidth: 1,
    borderColor: colors.dark[400], // #3A3D41 border
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  largeInput: {
    flex: 1,
    ...typography.h3,
    color: colors.light[100], // #FFFFFF primary text
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  currencyLabel: {
    ...typography.labelLarge,
    color: colors.light[50], // #6B7280 muted text
    marginLeft: spacing.sm,
  },

  // Option Card
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[700], // #191C1F card bg
    borderRadius: borderRadius.xl, // 20
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark[400], // #3A3D41 card border
  },
  optionCardSelected: {
    backgroundColor: colors.dark[600], // #1F2226 elevated surface
    borderWidth: 2,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    ...typography.labelLarge,
    color: colors.light[100], // #FFFFFF primary text
    marginBottom: 2,
  },
  optionSubtitle: {
    ...typography.bodySmall,
    color: colors.light[50], // #6B7280 muted text
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.dark[700], // #191C1F card bg
    borderRadius: borderRadius.xl, // 20
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark[400], // #3A3D41 card border
  },
  toggleLabel: {
    flex: 1,
    marginRight: spacing.md,
  },
  toggleTitle: {
    ...typography.labelLarge,
    color: colors.light[100], // #FFFFFF primary text
  },
  toggleDescription: {
    ...typography.caption,
    color: colors.light[50], // #6B7280 muted text
    marginTop: 2,
  },
  toggleButtons: {
    flexDirection: 'row',
    backgroundColor: colors.dark[500], // #2A2D31 secondary surface
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  toggleButtonActive: {
    backgroundColor: colors.dark[700], // #191C1F contrast against toggle bg
  },
  toggleButtonActiveYes: {
    backgroundColor: colors.success[500],
  },
  toggleButtonText: {
    ...typography.labelMedium,
    color: colors.light[60], // #8A8D91 secondary text
  },
  toggleButtonTextActive: {
    color: colors.light[100], // #FFFFFF
    fontWeight: '700',
  },

  // Stepper
  stepperContainer: {
    backgroundColor: colors.dark[700], // #191C1F card bg
    borderRadius: borderRadius.xl, // 20
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark[400], // #3A3D41 card border
  },
  stepperLabel: {
    ...typography.labelLarge,
    color: colors.light[100], // #FFFFFF primary text
    marginBottom: spacing.md,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.dark[500], // #2A2D31 secondary surface
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    minWidth: 80,
    alignItems: 'center',
    marginHorizontal: spacing.lg,
  },
  stepperValueText: {
    ...typography.h2,
    color: colors.brand.primary, // #0075EB Revolut blue
  },

  // Summary
  summaryCard: {
    backgroundColor: colors.dark[700], // #191C1F card bg
    borderRadius: borderRadius.xl, // 20
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark[400], // #3A3D41 card border
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    ...typography.bodyMedium,
    color: colors.light[60], // #8A8D91 secondary text
  },
  summaryValue: {
    ...typography.labelLarge,
    color: colors.light[100], // #FFFFFF primary text
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.dark[400], // #3A3D41 divider
    marginVertical: spacing.md,
  },

  // Disclaimer
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: colors.info[50], // rgba(0, 117, 235, 0.1)
    borderRadius: borderRadius.xl, // 20
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.info[100], // rgba(0, 117, 235, 0.15)
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.light[80], // #D1D5DB readable on dark bg
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },

  // Bottom Navigation
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
    backgroundColor: colors.dark[700], // #191C1F card bg
    borderTopWidth: 1,
    borderTopColor: colors.dark[400], // #3A3D41 border
    gap: spacing.md,
  },
  backButton: {
    flex: 0.4,
  },
  nextButton: {
    flex: 1,
  },
});

export default SimulatorFormScreen;
