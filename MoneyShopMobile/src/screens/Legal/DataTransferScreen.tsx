import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text} from 'react-native-paper';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

const DataTransferScreen = ({navigation}: any) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>TRANSMITERE DATE</Text>
          <Text style={styles.title}>
            Politica de Transmitere a Datelor catre Brokeri Autorizati
          </Text>
          <Text style={styles.date}>
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO')}
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              1. Principiul Consimtamantului Distinct
            </Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Transmiterea datelor catre brokeri se face EXCLUSIV cu
                consimtamant separat si distinct de utilizator.
              </Text>
            </View>
            <Text style={styles.text}>Aceasta transmitere:</Text>
            <Text style={styles.text}>
              {'\u2022'} Este initiata doar de utilizator{'\n'}
              {'\u2022'} Nu este conditie pentru utilizarea Platformei{'\n'}
              {'\u2022'} Nu afecteaza accesul la serviciile MoneyShop in cazul
              refuzului
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Datele Transmise</Text>
            <Text style={styles.text}>
              La solicitarea expresa a utilizatorului, MoneyShop poate transmite
              catre brokerul ales:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Analiza MoneyShop de eligibilitate credit{'\n'}
              {'\u2022'} O copie a raportului ANAF (daca a fost interogat){'\n'}
              {'\u2022'} O copie a raportului Biroului de Credit (daca a fost
              interogat){'\n'}
              {'\u2022'} Documentele KYC (doar daca utilizatorul accepta
              explicit)
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Brokerii Autorizati</Text>
            <Text style={styles.text}>
              MoneyShop transmite datele exclusiv catre:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Brokeri inscrisi in lista publica ANPC{'\n'}
              {'\u2022'} Brokeri care au trecut procesul de verificare KYC{'\n'}
              {'\u2022'} Brokeri alesi explicit de utilizator
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>4. Securitatea Transmiterii</Text>
            <Text style={styles.text}>Transmiterea datelor se face:</Text>
            <Text style={styles.text}>
              {'\u2022'} Prin canale securizate (criptare){'\n'}
              {'\u2022'} Cu confirmare de primire{'\n'}
              {'\u2022'} Cu logare a evenimentului in sistemul de audit
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              5. Retragerea Consimtamantului
            </Text>
            <Text style={styles.text}>
              Poti retrage consimtamantul pentru transmiterea datelor:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} In orice moment{'\n'}
              {'\u2022'} Fara consecinte{'\n'}
              {'\u2022'} Cu efect pentru viitor (nu afecteaza transmiterile deja
              efectuate)
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            <Text style={styles.text}>
              Pentru intrebari despre transmiterea datelor:{'\n'}
              Email: gdpr@moneyshop.ro{'\n'}
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
    fontWeight: '600',
  },
});

export default DataTransferScreen;
