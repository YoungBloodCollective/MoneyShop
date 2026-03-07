import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {brokerApi, BrokerInfo} from '../../services/api/brokerApi';
import {useAuthStore} from '../../store/authStore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as DocumentPicker from 'expo-document-picker';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

// Custom hook for debouncing
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const ITEMS_PER_PAGE = 20;

const BrokerDirectoryScreen = ({navigation}: any) => {
  const queryClient = useQueryClient();
  const {user} = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const isAdmin = user?.role === 'Administrator';

  // Debounce search query (wait 500ms after user stops typing)
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const {data: directoryData, isLoading: isLoadingDirectory} = useQuery({
    queryKey: ['brokerDirectory'],
    queryFn: () => brokerApi.getLatestDirectory(),
    retry: false,
    throwOnError: false,
  });

  // Fetch all brokers (no limit) - backend will return all
  const {data: brokersData, isLoading: isLoadingBrokers} = useQuery({
    queryKey: ['brokers', debouncedSearchQuery],
    queryFn: () => brokerApi.searchBrokers(debouncedSearchQuery || undefined, undefined), // No limit - get all
    enabled: !!directoryData,
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Paginate brokers on client side
  const brokers = brokersData?.brokers || [];
  const paginatedBrokers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return brokers.slice(startIndex, endIndex);
  }, [brokers, currentPage]);

  const totalPages = Math.ceil(brokers.length / ITEMS_PER_PAGE);

  const uploadMutation = useMutation({
    mutationFn: ({file, notes}: {file: File; notes?: string}) =>
      brokerApi.uploadExcel(file, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['brokerDirectory']});
      queryClient.invalidateQueries({queryKey: ['brokers']});
      Alert.alert('Succes', 'Fisierul Excel a fost incarcat cu succes');
    },
    onError: (error: any) => {
      Alert.alert('Eroare', error.message || 'Nu s-a putut incarca fisierul');
    },
  });

  const handleUploadExcel = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) {
        return;
      }

      // Convert to File object for API
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const fileObj = new File([blob], file.name, {type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});

      uploadMutation.mutate({file: fileObj});
    } catch (error: any) {
      Alert.alert('Eroare', error.message || 'Nu s-a putut selecta fisierul');
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'verified':
        return {bg: colors.success[50], text: colors.success[400], label: 'Verificat'};
      case 'suspended':
        return {bg: colors.error[50], text: colors.error[400], label: 'Suspendat'};
      default:
        return {bg: colors.warning[50], text: colors.warning[400], label: 'Pending'};
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
          <Text style={styles.title}>
            Director Brokeri
          </Text>
          <Text style={styles.subtitle}>
            Incarca un fisier Excel cu brokeri si cauta in lista
          </Text>

          {/* Upload Section - Only for Admin */}
          {isAdmin && (
            <View style={styles.card}>
              <View style={styles.uploadSection}>
                <Icon name="file-excel" size={48} color={colors.success[400]} />
                <Text style={styles.uploadTitle}>
                  Incarca Excel
                </Text>
                <Text style={styles.uploadDescription}>
                  {directoryData
                    ? `Ultimul fisier: ${directoryData.fileName}`
                    : 'Nu exista fisier incarcat'}
                </Text>
                {directoryData && (
                  <Text style={styles.uploadDate}>
                    Incarcat: {new Date(directoryData.uploadedAt).toLocaleDateString('ro-RO')}
                  </Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    uploadMutation.isPending && styles.buttonDisabled,
                  ]}
                  onPress={handleUploadExcel}
                  disabled={uploadMutation.isPending}
                  activeOpacity={0.8}>
                  {uploadMutation.isPending ? (
                    <View style={styles.buttonRow}>
                      <ActivityIndicator size="small" color={colors.light[100]} />
                      <Text style={styles.uploadButtonLabel}>Se incarca...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonRow}>
                      <Icon name="upload" size={20} color={colors.light[100]} />
                      <Text style={styles.uploadButtonLabel}>
                        {directoryData ? 'Actualizeaza Excel' : 'Incarca Excel'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Info Card for non-admin users */}
          {!isAdmin && directoryData && (
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Icon name="information" size={24} color={colors.brand.primary} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoTitle}>
                    Director Brokeri
                  </Text>
                  <Text style={styles.infoText}>
                    Ultimul fisier: {directoryData.fileName}
                  </Text>
                  <Text style={styles.infoText}>
                    Incarcat: {new Date(directoryData.uploadedAt).toLocaleDateString('ro-RO')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Search Section */}
          {directoryData && (
            <View style={styles.searchCard}>
              <View style={styles.searchInputContainer}>
                <Icon name="magnify" size={22} color={colors.light[60]} style={styles.searchIcon} />
                <TextInput
                  placeholder="Cauta broker (nume, firma, CUI, email, telefon)..."
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                  style={styles.searchInput}
                  placeholderTextColor={colors.light[50]}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.searchClear}
                    activeOpacity={0.7}>
                    <Icon name="close" size={20} color={colors.light[60]} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Brokers List with Pagination */}
          {isLoadingBrokers ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.brand.primary} />
            </View>
          ) : directoryData && brokers.length > 0 ? (
            <>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>
                  BROKERI ({brokers.length})
                  {debouncedSearchQuery && (
                    <Text style={styles.searchInfo}>
                      {' '}pentru "{debouncedSearchQuery}"
                    </Text>
                  )}
                </Text>
              </View>
              <FlatList
                data={paginatedBrokers}
                keyExtractor={(item) => item.brokerId}
                renderItem={({item: broker}) => {
                  const statusStyle = getStatusBadgeStyles(broker.status);
                  return (
                    <View style={styles.brokerCard}>
                      <View style={styles.brokerHeader}>
                        <View style={styles.brokerInfo}>
                          <Text style={styles.brokerName}>
                            {broker.fullName}
                          </Text>
                          {broker.firmName && (
                            <Text style={styles.brokerFirm}>
                              {broker.firmName}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.statusChip, {backgroundColor: statusStyle.bg}]}>
                          <Text style={[styles.statusChipText, {color: statusStyle.text}]}>
                            {statusStyle.label}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.brokerDetails}>
                        {broker.firmCui && (
                          <View style={styles.detailRow}>
                            <Icon name="identifier" size={16} color={colors.light[60]} />
                            <Text style={styles.detailText}>
                              CUI: {broker.firmCui}
                            </Text>
                          </View>
                        )}
                        {broker.publicEmail && (
                          <View style={styles.detailRow}>
                            <Icon name="email" size={16} color={colors.light[60]} />
                            <Text style={styles.detailText}>
                              {broker.publicEmail}
                            </Text>
                          </View>
                        )}
                        {broker.publicPhone && (
                          <View style={styles.detailRow}>
                            <Icon name="phone" size={16} color={colors.light[60]} />
                            <Text style={styles.detailText}>
                              {broker.publicPhone}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                }}
                ListFooterComponent={
                  totalPages > 1 ? (
                    <View style={styles.paginationContainer}>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage === 1 && styles.paginationButtonDisabled,
                        ]}
                        onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        activeOpacity={0.8}>
                        <Icon
                          name="chevron-left"
                          size={18}
                          color={currentPage === 1 ? colors.light[40] : colors.light[70]}
                        />
                        <Text style={[
                          styles.paginationButtonLabel,
                          currentPage === 1 && styles.paginationButtonLabelDisabled,
                        ]}>Anterior</Text>
                      </TouchableOpacity>
                      <Text style={styles.paginationText}>
                        Pagina {currentPage} din {totalPages}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.paginationButton,
                          currentPage === totalPages && styles.paginationButtonDisabled,
                        ]}
                        onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        activeOpacity={0.8}>
                        <Text style={[
                          styles.paginationButtonLabel,
                          currentPage === totalPages && styles.paginationButtonLabelDisabled,
                        ]}>Urmator</Text>
                        <Icon
                          name="chevron-right"
                          size={18}
                          color={currentPage === totalPages ? colors.light[40] : colors.light[70]}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : null
                }
              />
            </>
          ) : directoryData && brokers.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.centerContainer}>
                <Icon name="magnify" size={48} color={colors.dark[400]} />
                <Text style={styles.emptyText}>
                  {debouncedSearchQuery
                    ? `Nu s-au gasit brokeri pentru "${debouncedSearchQuery}"`
                    : 'Nu exista brokeri in fisierul Excel'}
                </Text>
              </View>
            </View>
          ) : !directoryData ? (
            <View style={styles.emptyCard}>
              <View style={styles.centerContainer}>
                <Icon name="file-upload-outline" size={48} color={colors.dark[400]} />
                <Text style={styles.emptyText}>
                  Incarca un fisier Excel pentru a incepe
                </Text>
              </View>
            </View>
          ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  listHeader: {
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  searchInfo: {
    color: colors.light[60],
    fontWeight: '400',
  },
  title: {
    ...typography.h2,
    color: colors.light[100],
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.light[70],
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  uploadSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  uploadTitle: {
    ...typography.h4,
    color: colors.light[100],
    marginTop: spacing.md,
  },
  uploadDescription: {
    ...typography.bodySmall,
    marginTop: spacing.sm,
    color: colors.light[70],
    textAlign: 'center',
  },
  uploadDate: {
    ...typography.caption,
    marginTop: spacing.xs,
    color: colors.light[60],
  },
  uploadButton: {
    marginTop: spacing.md,
    borderRadius: borderRadius.pill,
    minHeight: 56,
    backgroundColor: colors.brand.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  uploadButtonLabel: {
    ...typography.labelLarge,
    color: colors.light[100],
    marginLeft: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  searchCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dark[600],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.light[100],
    fontSize: 16,
    paddingVertical: spacing.md,
  },
  searchClear: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  centerContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  brokersList: {
    marginTop: spacing.sm,
  },
  listTitle: {
    ...typography.labelUppercase,
    color: colors.light[50],
  },
  brokerCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  brokerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  brokerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  brokerName: {
    ...typography.labelLarge,
    color: colors.light[100],
    marginBottom: spacing.xs,
  },
  brokerFirm: {
    ...typography.bodySmall,
    color: colors.light[70],
  },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  statusChipText: {
    ...typography.labelSmall,
  },
  brokerDetails: {
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  detailText: {
    ...typography.bodySmall,
    marginLeft: spacing.sm,
    color: colors.light[70],
  },
  emptyText: {
    ...typography.bodyMedium,
    marginTop: spacing.md,
    color: colors.light[60],
    textAlign: 'center',
  },
  emptyCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  infoCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  infoTitle: {
    ...typography.labelLarge,
    color: colors.light[100],
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.light[70],
    marginTop: 2,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
    borderColor: colors.dark[400],
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonLabel: {
    ...typography.labelSmall,
    color: colors.light[70],
  },
  paginationButtonLabelDisabled: {
    color: colors.light[40],
  },
  paginationText: {
    ...typography.labelMedium,
    color: colors.light[60],
  },
});

export default BrokerDirectoryScreen;
