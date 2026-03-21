import React from 'react';
import {View, StyleSheet, ScrollView, Text} from 'react-native';
import {DSMenuItem} from '../../components/ui';
import {colors, spacing, typography} from '../../theme/designSystem';

const menuItems = [
  {
    icon: 'file-document-outline',
    title: 'Termeni si Conditii',
    description: 'Conditiile de utilizare a platformei',
    route: 'Terms',
    iconColor: colors.brand.primary,
    iconBgColor: colors.info[50],
  },
  {
    icon: 'shield-lock-outline',
    title: 'Politica de Confidentialitate',
    description: 'GDPR si protectia datelor personale',
    route: 'Privacy',
    iconColor: colors.success[400],
    iconBgColor: colors.success[50],
  },
  {
    icon: 'file-sign',
    title: 'Politica de Mandatare',
    description: 'Mandat ANAF si Biroul de Credit',
    route: 'Mandate',
    iconColor: colors.warning[400],
    iconBgColor: colors.warning[50],
  },
  {
    icon: 'file-document-multiple-outline',
    title: 'Pachet de Conformitate',
    description: 'Documente pentru ANAF si Biroul de Credit',
    route: 'Compliance',
    iconColor: colors.brand.purple,
    iconBgColor: colors.info[50],
  },
  {
    icon: 'file-send-outline',
    title: 'Politica de Transmitere Date',
    description: 'Transmiterea datelor catre brokeri autorizati',
    route: 'DataTransfer',
    iconColor: colors.brand.primary,
    iconBgColor: colors.info[50],
  },
];

const LegalMenuScreen = ({navigation}: any) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Documente Legale</Text>
          <Text style={styles.subtitle}>
            Acceseaza documentele legale si politicile MoneyShop
          </Text>

          {menuItems.map(item => (
            <DSMenuItem
              key={item.route}
              icon={item.icon}
              label={item.title}
              description={item.description}
              onPress={() => navigation.navigate(item.route)}
              iconColor={item.iconColor}
              iconBgColor={item.iconBgColor}
            />
          ))}
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
  title: {
    ...typography.h3,
    color: colors.light[100],
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.light[60],
    marginBottom: spacing.lg,
  },
});

export default LegalMenuScreen;
