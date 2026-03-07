import React from 'react';
import {View, StyleSheet, ScrollView} from 'react-native';
import {Text} from 'react-native-paper';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

const TermsScreen = ({navigation}: any) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>LEGAL</Text>
          <Text style={styles.title}>
            Termeni si Conditii de Utilizare – MoneyShop.ro
          </Text>
          <Text style={styles.date}>
            Ultima actualizare: {new Date().toLocaleDateString('ro-RO')}
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>1. Dispozitii Generale</Text>
            <Text style={styles.text}>
              Prezentul document stabileste termenii si conditiile de utilizare a
              platformei digitale www.MoneyShop.ro, precum si a aplicatiilor
              mobile MoneyShop.
            </Text>
            <Text style={styles.text}>
              Platforma este operata de{' '}
              <Text style={styles.bold}>
                POPIX BROKERAGE CONSULTING S.R.L.
              </Text>
              , societate romana organizata si functionand in conformitate cu
              legislatia in vigoare din Romania.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>2. Identitatea Operatorului</Text>
            <Text style={styles.text}>
              <Text style={styles.bold}>
                POPIX BROKERAGE CONSULTING S.R.L.
              </Text>
            </Text>
            <Text style={styles.text}>
              Nr. ONRC: J2024018340008{'\n'}
              CUI: 50477260{'\n'}
              Sediu: Mun. Ramnicu Valcea, Str. Constantin Brancusi nr. 8{'\n'}
              Telefon: 031 434 0940{'\n'}
              E-mail: office@moneyshop.ro
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              3. Statutul Juridic al MoneyShop
            </Text>
            <Text style={styles.text}>
              MoneyShop este o platforma digitala de intermediere, informare si
              analiza financiara.
            </Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                In mod expres, se precizeaza ca:{'\n'}
                {'\u2022'} MoneyShop NU este institutie de credit{'\n'}
                {'\u2022'} MoneyShop NU este IFN{'\n'}
                {'\u2022'} MoneyShop NU acorda credite{'\n'}
                {'\u2022'} MoneyShop NU aproba cereri de credit
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>4. Natura Serviciilor</Text>
            <Text style={styles.text}>
              Platforma pune la dispozitie:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Simulari financiare orientative{'\n'}
              {'\u2022'} Informatii generale despre produse de creditare{'\n'}
              {'\u2022'} Analiza preliminara de eligibilitate{'\n'}
              {'\u2022'} Servicii de intermediere intre utilizator si creditori
            </Text>
            <Text style={styles.text}>
              Toate simularile au caracter strict informativ, nefiind oferte
              ferme sau promisiuni de creditare.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>5. Limitarea Raspunderii</Text>
            <Text style={styles.text}>
              In limitele permise de lege, MoneyShop nu raspunde pentru:
            </Text>
            <Text style={styles.text}>
              {'\u2022'} Deciziile creditorilor{'\n'}
              {'\u2022'} Refuzuri de creditare{'\n'}
              {'\u2022'} Modificari de dobanzi sau conditii{'\n'}
              {'\u2022'} Pierderi indirecte sau de oportunitate
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact</Text>
            <Text style={styles.text}>
              Pentru intrebari sau clarificari:{'\n'}
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
  bold: {
    fontWeight: '700',
    color: colors.light[100],
  },
  warningBox: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning[500],
  },
  warningText: {
    ...typography.bodyMedium,
    color: colors.warning[400],
    lineHeight: 24,
  },
});

export default TermsScreen;
