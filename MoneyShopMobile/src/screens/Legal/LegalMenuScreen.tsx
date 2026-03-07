import React from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {Text} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

const menuItems = [
  {
    icon: 'file-document-outline',
    title: 'Termeni si Conditii',
    description: 'Conditiile de utilizare a platformei',
    route: 'Terms',
  },
  {
    icon: 'shield-lock-outline',
    title: 'Politica de Confidentialitate',
    description: 'GDPR si protectia datelor personale',
    route: 'Privacy',
  },
  {
    icon: 'file-sign',
    title: 'Politica de Mandatare',
    description: 'Mandat ANAF si Biroul de Credit',
    route: 'Mandate',
  },
  {
    icon: 'file-document-multiple-outline',
    title: 'Pachet de Conformitate',
    description: 'Documente pentru ANAF si Biroul de Credit',
    route: 'Compliance',
  },
  {
    icon: 'file-send-outline',
    title: 'Politica de Transmitere Date',
    description: 'Transmiterea datelor catre brokeri autorizati',
    route: 'DataTransfer',
  },
];

const LegalMenuScreen = ({navigation}: any) => {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.sectionLabel}>DOCUMENTE</Text>
          <Text style={styles.title}>Documente Legale</Text>
          <Text style={styles.subtitle}>
            Acceseaza documentele legale si politicile MoneyShop
          </Text>

          <View style={styles.card}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.route}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => navigation.navigate(item.route)}
                  activeOpacity={0.6}>
                  <View style={styles.iconCircle}>
                    <Icon
                      name={item.icon}
                      size={20}
                      color={colors.brand.primary}
                    />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemDescription}>
                      {item.description}
                    </Text>
                  </View>
                  <Icon
                    name="chevron-right"
                    size={20}
                    color={colors.light[50]}
                  />
                </TouchableOpacity>
                {index < menuItems.length - 1 && (
                  <View style={styles.divider} />
                )}
              </React.Fragment>
            ))}
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
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dark[400],
    paddingVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.dark[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  menuItemTitle: {
    ...typography.labelLarge,
    color: colors.light[100],
  },
  menuItemDescription: {
    ...typography.caption,
    color: colors.light[60],
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.dark[400],
    marginLeft: 72,
  },
});

export default LegalMenuScreen;
