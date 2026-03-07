import React from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

type ApplicationSuccessScreenNavigationProp = NativeStackNavigationProp<any>;

interface Props {
  navigation: ApplicationSuccessScreenNavigationProp;
}

const ApplicationSuccessScreen: React.FC<Props> = ({navigation}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon name="check-circle" size={80} color={colors.success[500]} />
          </View>
          <Text style={styles.title}>
            Cererea a fost trimisă!
          </Text>
          <Text style={styles.message}>
            Cererea ta de credit a fost înregistrată cu succes. Vei primi
            notificări despre statusul cererii.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('DashboardHome')}
            activeOpacity={0.8}>
            <Text style={styles.buttonLabel}>Mergi la Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark[800],
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.dark[400],
  },
  content: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.light[100],
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyMedium,
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: colors.light[60],
  },
  button: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.pill,
    minHeight: 48,
    width: '100%',
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonLabel: {
    ...typography.labelLarge,
    color: colors.light[100],
  },
});

export default ApplicationSuccessScreen;
