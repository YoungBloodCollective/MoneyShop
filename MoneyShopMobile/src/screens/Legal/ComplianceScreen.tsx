import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text} from 'react-native-paper';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

const ComplianceScreen = ({navigation}: any) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>CONFORMITATE</Text>
          <Text style={styles.title}>Pachet Oficial de Conformitate</Text>
          <Text style={styles.subtitle}>
            MoneyShop – POPIX BROKERAGE CONSULTING S.R.L.
          </Text>
          <Text style={styles.subtitleSecondary}>
            (pentru ANAF & Biroul de Credit)
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Declaratie Oficiala MoneyShop</Text>
            <Text style={styles.text}>
              MoneyShop, operata de POPIX BROKERAGE CONSULTING S.R.L., declara:
            </Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                1. MoneyShop NU este institutie de credit si NU este IFN{'\n'}
                2. MoneyShop NU este participant in sistemul Biroului de Credit
                S.A.{'\n'}
                3. MoneyShop NU este afiliat cu ANAF sau Biroul de Credit{'\n'}
                4. MoneyShop NU vinde, nu comercializeaza si nu revinde rapoarte
                {'\n'}
                5. MoneyShop actioneaza exclusiv ca mandatar
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fluxul Operational</Text>
            <Text style={styles.text}>
              1. Utilizatorul solicita analiza eligibilitatii de credit{'\n'}
              2. Utilizatorul acorda mandat expres, limitat la maximum 30 de
              zile{'\n'}
              3. MoneyShop interogheaza ANAF si Biroul de Credit{'\n'}
              4. Datele sunt utilizate exclusiv pentru analiza eligibilitatii
              {'\n'}
              5. Transmiterea catre broker are loc doar cu consimtamant distinct
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Politica de Mandatare</Text>
            <Text style={styles.text}>Mandatul este:</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {'\u2022'} Expres, individual, acordat electronic{'\n'}
                {'\u2022'} Durata maxima: 30 zile calendaristice{'\n'}
                {'\u2022'} Scop unic: analiza eligibilitate credit{'\n'}
                {'\u2022'} Nu este permanent sau general{'\n'}
                {'\u2022'} Revocabil oricand de utilizator
              </Text>
            </View>
            <Text style={styles.text}>
              Fara mandat valid - nicio interogare nu este efectuata.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              GDPR – Structura Dual Consent
            </Text>
            <Text style={styles.textBold}>
              Nivel 1 – Prelucrare in baza mandatului ANAF/BC:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Fara transmitere catre broker{'\n'}
              {'\u2022'} Temei: art. 6 alin. (1) lit. b, c, f GDPR{'\n'}
              {'\u2022'} Date utilizate exclusiv intern pentru analiza
            </Text>
            <Text style={styles.textBold}>
              Nivel 2 – Transmitere catre broker:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Consimtamant separat, voluntar{'\n'}
              {'\u2022'} Temei: art. 6 alin. (1) lit. a GDPR{'\n'}
              {'\u2022'} Utilizatorul poate refuza fara consecinte
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Cele doua consimtaminte sunt distincte, necondionate intre ele.
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Log Juridic de Consimtamant
            </Text>
            <Text style={styles.text}>
              MoneyShop utilizeaza un log juridic care inregistreaza:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Identitatea utilizatorului{'\n'}
              {'\u2022'} Textul exact al consimtamantului{'\n'}
              {'\u2022'} Data si ora{'\n'}
              {'\u2022'} IP, device, sesiune{'\n'}
              {'\u2022'} Durata mandatului{'\n'}
              {'\u2022'} Evenimentul de confirmare
            </Text>
            <Text style={styles.text}>
              Logul este nealterabil, stocat securizat si disponibil ca proba in
              caz de control.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Date de Contact Oficiale</Text>
            <Text style={styles.text}>
              Pentru orice clarificari suplimentare:{'\n'}
              office@moneyshop.ro{'\n'}
              gdpr@moneyshop.ro{'\n'}
              031 434 0940
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  sectionLabel: {
    ...typography.labelUppercase,
    color: colors.light[50],
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    color: colors.light[100],
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.light[60],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitleSecondary: {
    ...typography.caption,
    color: colors.light[50],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h4,
    color: colors.brand.primary,
    marginBottom: spacing.md,
  },
  text: {
    ...typography.bodyMedium,
    color: colors.light[70],
    marginBottom: spacing.md,
  },
  textBold: {
    ...typography.labelLarge,
    color: colors.light[100],
    marginBottom: spacing.sm,
  },
  warningBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning[500],
    marginBottom: spacing.md,
  },
  warningText: {
    ...typography.bodyMedium,
    color: colors.warning[400],
    lineHeight: 24,
  },
  infoBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.info[50],
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand.primary,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.bodyMedium,
    color: colors.info[400],
    lineHeight: 24,
  },
});

export default ComplianceScreen;
