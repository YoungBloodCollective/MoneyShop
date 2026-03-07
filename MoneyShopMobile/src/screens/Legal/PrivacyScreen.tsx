import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text} from 'react-native-paper';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

const PrivacyScreen = ({navigation}: any) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>GDPR</Text>
          <Text style={styles.title}>
            Politica de Confidentialitate (GDPR) – MoneyShop.ro
          </Text>
          <Text style={styles.date}>
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO')}
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Operatorul de Date</Text>
            <Text style={styles.text}>
              <Text style={styles.bold}>
                POPIX BROKERAGE CONSULTING S.R.L.
              </Text>
            </Text>
            <Text style={styles.text}>
              Nr. ONRC: J2024018340008{'\n'}
              CUI: 50477260{'\n'}
              E-mail GDPR: gdpr@moneyshop.ro{'\n'}
              E-mail DPO: dpo@moneyshop.ro
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Scopurile Prelucrarii</Text>
            <Text style={styles.text}>
              Datele sunt prelucrate exclusiv pentru:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Analiza eligibilitatii financiare{'\n'}
              {'\u2022'} Realizarea analizelor MoneyShop{'\n'}
              {'\u2022'} Intermedierea solicitarilor de credit{'\n'}
              {'\u2022'} Indeplinirea obligatiilor legale
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              3. Prelucrarea Datelor ANAF/BC
            </Text>
            <Text style={styles.text}>
              Datele obtinute de la ANAF si Biroul de Credit sunt prelucrate:
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {'\u2022'} Exclusiv pentru analiza eligibilitatii de credit{'\n'}
                {'\u2022'} In baza mandatului temporar (max. 30 zile){'\n'}
                {'\u2022'} Fara transmitere catre brokeri sau terti neimplicati
              </Text>
            </View>
            <Text style={styles.text}>
              Aceste date NU sunt vandute, NU sunt cesionate si NU sunt
              utilizate in scopuri de marketing.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              4. Transmiterea catre Brokeri
            </Text>
            <Text style={styles.text}>
              Transmiterea analizei catre un broker:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Se face exclusiv cu consimtamant separat{'\n'}
              {'\u2022'} Este initiata doar de utilizator{'\n'}
              {'\u2022'} Nu este conditie pentru utilizarea Platformei{'\n'}
              {'\u2022'} Poate fi refuzata fara consecinte
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>5. Drepturile Tale</Text>
            <Text style={styles.text}>
              Beneficiezi de drepturile prevazute la art. 12-22 GDPR:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Dreptul de acces{'\n'}
              {'\u2022'} Dreptul la rectificare{'\n'}
              {'\u2022'} Dreptul la stergere{'\n'}
              {'\u2022'} Dreptul la portabilitate{'\n'}
              {'\u2022'} Dreptul de opozitie
            </Text>
            <Text style={styles.text}>Solicitari: gdpr@moneyshop.ro</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact GDPR</Text>
            <Text style={styles.text}>
              Email GDPR: gdpr@moneyshop.ro{'\n'}
              Email DPO: dpo@moneyshop.ro{'\n'}
              Telefon: 031 434 0940
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
  date: {
    ...typography.caption,
    color: colors.light[60],
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
  bold: {
    fontWeight: '700',
    color: colors.light[100],
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

export default PrivacyScreen;
