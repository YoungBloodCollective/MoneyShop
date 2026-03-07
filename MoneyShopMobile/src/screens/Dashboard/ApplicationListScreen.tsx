import React from 'react';
import {View, StyleSheet, FlatList} from 'react-native';
import {Text, ActivityIndicator} from 'react-native-paper';
import {useQuery} from '@tanstack/react-query';
import {applicationsApi} from '../../services/api/applicationsApi';
import {Application} from '../../types/application.types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

const ApplicationListScreen = () => {
  const {data: applications, isLoading} = useQuery({
    queryKey: ['applications'],
    queryFn: applicationsApi.getAll,
  });

  const getStatusStyle = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'aprobat':
        return {bg: colors.success[50], text: colors.success[400], icon: 'check-circle'};
      case 'rejected':
      case 'respins':
        return {bg: colors.error[50], text: colors.error[400], icon: 'close-circle'};
      case 'processing':
      case 'in_procesare':
        return {bg: colors.info[50], text: colors.info[400], icon: 'progress-clock'};
      default:
        return {bg: colors.warning[50], text: colors.warning[400], icon: 'clock-outline'};
    }
  };

  const getCreditIcon = (type?: string) => {
    return type === 'ipotecar' ? 'home-outline' : 'cash-multiple';
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  const renderApplication = ({item}: {item: Application}) => {
    const statusStyle = getStatusStyle(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconContainer}>
            <Icon
              name={getCreditIcon(item.typeCredit)}
              size={24}
              color={colors.brand.primary}
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>
              {item.typeCredit === 'ipotecar'
                ? 'Credit Ipotecar'
                : 'Credit Nevoi Personale'}
            </Text>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString('ro-RO')}
            </Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusStyle.bg}]}>
            <Icon name={statusStyle.icon} size={14} color={statusStyle.text} />
            <Text style={[styles.statusText, {color: statusStyle.text}]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={applications}
        renderItem={renderApplication}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="file-document-outline" size={64} color={colors.dark[400]} />
            <Text style={styles.emptyTitle}>Nu ai nicio cerere</Text>
            <Text style={styles.emptySubtitle}>
              Cererile tale de credit vor apărea aici
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark[800],
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.info[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.labelLarge,
    color: colors.light[100],
    marginBottom: spacing.xs,
  },
  status: {
    ...typography.bodySmall,
    color: colors.light[70],
    marginTop: spacing.sm,
  },
  date: {
    ...typography.caption,
    color: colors.light[60],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    gap: 4,
  },
  statusText: {
    ...typography.labelSmall,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.light[60],
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.light[50],
    textAlign: 'center',
  },
});

export default ApplicationListScreen;
