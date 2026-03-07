import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text} from 'react-native-paper';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

const MandateScreen = ({navigation}: any) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>MANDAT</Text>
          <Text style={styles.title}>
            Politica de Mandatare – MoneyShop.ro
          </Text>
          <Text style={styles.date}>
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO')}
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Natura Mandatului</Text>
            <Text style={styles.text}>
              Prezenta Politica stabileste conditiile in care acordati un mandat
              expres, limitat si temporar societatii POPIX BROKERAGE CONSULTING
              S.R.L.
            </Text>
            <Text style={styles.text}>
              Mandatul este acordat electronic, la distanta, prin actiune
              explicita (checkbox / confirmare digitala).
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Obiectul Mandatului</Text>
            <Text style={styles.text}>
              Mandatul consta exclusiv in:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Interogarea veniturilor la ANAF{'\n'}
              {'\u2022'} Interogarea situatiei la Biroul de Credit{'\n'}
              {'\u2022'} Analiza eligibilitatii de credit{'\n'}
              {'\u2022'} Realizarea analizei MoneyShop
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Durata Limitata</Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Mandatul este valabil pentru o perioada maxima de 30 (treizeci)
                de zile calendaristice, calculate de la data acordarii
                consimtamantului.
              </Text>
            </View>
            <Text style={styles.text}>
              La expirarea termenului, mandatul inceteaza de drept si orice noua
              interogare necesita un nou mandat expres.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>4. Limitari Exprese</Text>
            <Text style={styles.text}>
              Este expres interzis ca datele:
            </Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                {'\u2022'} Sa fie vandute{'\n'}
                {'\u2022'} Sa fie cesionate{'\n'}
                {'\u2022'} Sa fie utilizate in scopuri comerciale sau de marketing{'\n'}
                {'\u2022'} Sa fie transmise catre terti neimplicati
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>5. Revocarea Mandatului</Text>
            <Text style={styles.text}>Poti revoca mandatul:</Text>
            <Text style={styles.text}>
              {'\u2022'} In orice moment{'\n'}
              {'\u2022'} Fara justificare{'\n'}
              {'\u2022'} Cu efect pentru viitor
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            <Text style={styles.text}>
              Email: office@moneyshop.ro{'\n'}
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
});

export default MandateScreen;
