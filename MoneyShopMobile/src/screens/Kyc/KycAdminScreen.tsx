import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  Modal,
  Text as RNText,
  TextInput as RNTextInput,
  TouchableOpacity,
  Platform,
  Pressable,
} from 'react-native';
import {
  Text,
  Button,
  ActivityIndicator,
  Dialog,
  Portal,
} from 'react-native-paper';
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {kycApi, KycPending, KycDetails} from '../../services/api/kycApi';
import CustomHeader from '../../components/CustomHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, borderRadius, typography} from '../../theme/designSystem';

type KycAdminScreenNavigationProp = NativeStackNavigationProp<any>;

interface Props {
  navigation: KycAdminScreenNavigationProp;
}

// Type declaration for window on web
declare const window: {
  confirm?: (message?: string) => boolean;
  prompt?: (message?: string, defaultValue?: string) => string | null;
} | undefined;

const KycAdminScreen: React.FC<Props> = ({navigation}) => {
  const queryClient = useQueryClient();
  const [selectedKyc, setSelectedKyc] = useState<KycDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedKycId, setSelectedKycId] = useState<string | null>(null);
  const [viewingFile, setViewingFile] = useState<string | null>(null);

  const {
    data: pendingKyc,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['kyc-pending'],
    queryFn: () => kycApi.getAllPending(),
    select: (data) => Array.isArray(data) ? data : [], // Ensure it's always an array
  });

  const approveMutation = useMutation({
    mutationFn: (kycId: string) => {
      console.log('[KycAdmin] Approving KYC:', kycId);
      return kycApi.updateStatus(kycId, 'verified');
    },
    onSuccess: () => {
      console.log('[KycAdmin] KYC approved successfully');
      queryClient.invalidateQueries({queryKey: ['kyc-pending']});
      setShowDetailsModal(false);
      setSelectedKyc(null);
      Alert.alert('Succes', 'KYC-ul a fost aprobat cu succes!');
    },
    onError: (error: any) => {
      console.error('[KycAdmin] Error approving KYC:', error);
      Alert.alert(
        'Eroare',
        error.response?.data?.message || error.message || 'Eroare la aprobarea KYC-ului',
      );
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({kycId, reason}: {kycId: string; reason: string}) => {
      console.log('[KycAdmin] Rejecting KYC:', kycId, 'Reason:', reason);
      return kycApi.updateStatus(kycId, 'rejected', reason);
    },
    onSuccess: () => {
      console.log('[KycAdmin] KYC rejected successfully');
      queryClient.invalidateQueries({queryKey: ['kyc-pending']});
      setShowRejectDialog(false);
      setShowDetailsModal(false);
      setSelectedKyc(null);
      setRejectionReason('');
      Alert.alert('Succes', 'KYC-ul a fost respins!');
    },
    onError: (error: any) => {
      console.error('[KycAdmin] Error rejecting KYC:', error);
      Alert.alert(
        'Eroare',
        error.response?.data?.message || error.message || 'Eroare la respingerea KYC-ului',
      );
    },
  });

  const loadKycDetails = async (kycId: string) => {
    try {
      const details = await kycApi.getDetails(kycId);
      setSelectedKyc(details);
      setShowDetailsModal(true);
    } catch (error: any) {
      Alert.alert(
        'Eroare',
        error.response?.data?.message || 'Eroare la incarcarea detaliilor',
      );
    }
  };

  const handleApprove = (kycId: string) => {
    console.log('[KycAdmin] handleApprove called with kycId:', kycId);

    // On web, use window.confirm; on mobile, use Alert.alert
    if (Platform.OS === 'web') {
      const win = typeof window !== 'undefined' ? window : null;
      const confirmed = win?.confirm?.('Esti sigur ca vrei sa aprobi acest KYC? Pozele vor fi sterse permanent.') ?? false;
      if (confirmed) {
        console.log('[KycAdmin] Approve confirmed (web), calling mutation with kycId:', kycId);
        approveMutation.mutate(kycId);
      } else {
        console.log('[KycAdmin] Approve cancelled (web)');
      }
    } else {
      Alert.alert(
        'Confirmare',
        'Esti sigur ca vrei sa aprobi acest KYC? Pozele vor fi sterse permanent.',
        [
          {text: 'Anuleaza', style: 'cancel', onPress: () => console.log('[KycAdmin] Approve cancelled')},
          {
            text: 'Aproba',
            style: 'default',
            onPress: () => {
              console.log('[KycAdmin] Approve confirmed, calling mutation with kycId:', kycId);
              approveMutation.mutate(kycId);
            },
          },
        ],
      );
    }
  };

  const handleReject = (kycId: string) => {
    console.log('[KycAdmin] handleReject called with kycId:', kycId);

    // On web, use prompt; on mobile, use Dialog
    if (Platform.OS === 'web') {
      const win = typeof window !== 'undefined' ? window : null;
      const reason = win?.prompt?.('Introdu motivul pentru care respingi acest KYC. Mesajul va fi vizibil utilizatorului.') ?? null;
      if (reason && reason.trim()) {
        console.log('[KycAdmin] Reject confirmed (web), calling mutation with kycId:', kycId, 'reason:', reason.trim());
        rejectMutation.mutate({
          kycId: kycId,
          reason: reason.trim(),
        });
      } else if (reason !== null) {
        // User pressed OK but didn't enter a reason
        Alert.alert('Eroare', 'Trebuie sa introduci un motiv pentru respingere');
      } else {
        console.log('[KycAdmin] Reject cancelled (web)');
      }
    } else {
      setSelectedKycId(kycId);
      setRejectionReason('');
      setShowRejectDialog(true);
      console.log('[KycAdmin] Reject dialog should be visible now');
    }
  };

  const submitRejection = () => {
    console.log('[KycAdmin] submitRejection called, selectedKycId:', selectedKycId, 'reason:', rejectionReason);
    if (!rejectionReason.trim()) {
      Alert.alert('Eroare', 'Trebuie sa introduci un motiv pentru respingere');
      return;
    }

    if (!selectedKycId) {
      console.error('[KycAdmin] No selectedKycId for rejection');
      Alert.alert('Eroare', 'Nu s-a selectat un KYC pentru respingere');
      return;
    }

    console.log('[KycAdmin] Calling rejectMutation with:', { kycId: selectedKycId, reason: rejectionReason.trim() });
    rejectMutation.mutate({
      kycId: selectedKycId,
      reason: rejectionReason.trim(),
    });
  };

  const viewFile = async (fileId: string) => {
    try {
      const fileData = await kycApi.getFile(fileId);
      // Use dataUri if available, otherwise construct from base64
      const imageUri = fileData.dataUri || `data:${fileData.mimeType};base64,${fileData.fileContentBase64}`;
      setViewingFile(imageUri);
    } catch (error) {
      console.error('Error loading file:', error);
      Alert.alert('Eroare', 'Nu s-a putut incarca fisierul');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.brand.primary}
            colors={[colors.brand.primary]}
          />
        }>
        <View style={styles.content}>
          {/* Header Card */}
          <View style={styles.headerCard}>
            <Text style={styles.title}>
              Verificari KYC in Asteptare
            </Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {pendingKyc?.length || 0} cereri
              </Text>
            </View>
          </View>

          {/* Empty State */}
          {!pendingKyc || pendingKyc.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="check-circle" size={48} color={colors.success[500]} />
                </View>
                <Text style={styles.emptyTitle}>
                  Totul este in regula
                </Text>
                <Text style={styles.emptyText}>
                  Nu exista cereri KYC in asteptare
                </Text>
              </View>
            </View>
          ) : (
            (Array.isArray(pendingKyc) ? pendingKyc : []).map(kyc => (
              <TouchableOpacity
                key={kyc.kycId}
                style={styles.card}
                onPress={() => loadKycDetails(kyc.kycId)}
                activeOpacity={0.7}>
                <View style={styles.kycItem}>
                  <View style={styles.kycAvatarContainer}>
                    <View style={styles.kycAvatar}>
                      <Icon name="account" size={24} color={colors.brand.primary} />
                    </View>
                  </View>
                  <View style={styles.kycInfo}>
                    <Text style={styles.userName}>
                      {kyc.userName}
                    </Text>
                    <Text style={styles.userEmail}>
                      {kyc.userEmail}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Icon name="file-document" size={14} color={colors.light[50]} />
                        <Text style={styles.metaText}>
                          {kyc.fileCount} fisier(e)
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Icon name="clock" size={14} color={colors.light[50]} />
                        <Text style={styles.metaText}>
                          {new Date(kyc.createdAt).toLocaleDateString('ro-RO')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Icon name="chevron-right" size={24} color={colors.light[50]} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        onRequestClose={() => {
          setShowDetailsModal(false);
          setSelectedKyc(null);
        }}>
        <View style={styles.modalContainer}>
          <CustomHeader
            title="Detalii KYC"
            onBack={() => {
              setShowDetailsModal(false);
              setSelectedKyc(null);
            }}
            showLogo={false}
          />
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{paddingBottom: spacing.lg}}
            keyboardShouldPersistTaps="handled">
            {selectedKyc && (
              <>
                {/* User Info Card */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>
                    Informatii Utilizator
                  </Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>NUME</Text>
                    <Text style={styles.detailValue}>{selectedKyc.userName}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>EMAIL</Text>
                    <Text style={styles.detailValue}>{selectedKyc.userEmail}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>STATUS</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        selectedKyc.status === 'pending'
                          ? styles.statusPending
                          : styles.statusRejected,
                      ]}>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          selectedKyc.status === 'pending'
                            ? styles.statusPendingText
                            : styles.statusRejectedText,
                        ]}>
                        {selectedKyc.status === 'pending'
                          ? 'In asteptare'
                          : 'Respins'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>DATA CREARE</Text>
                    <Text style={styles.detailValueMuted}>
                      {new Date(selectedKyc.createdAt).toLocaleString('ro-RO')}
                    </Text>
                  </View>
                </View>

                {/* Files Card */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>
                    Fisiere incarcate
                  </Text>
                  {selectedKyc.files.map((file, index) => (
                    <View
                      key={file.fileId}
                      style={[
                        styles.fileItem,
                        index < selectedKyc.files.length - 1 && styles.fileItemBorder,
                      ]}>
                      <View style={styles.fileIconContainer}>
                        <Icon
                          name="file-image"
                          size={22}
                          color={colors.brand.primary}
                        />
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName}>{file.fileName}</Text>
                        <Text style={styles.fileType}>
                          {file.fileType}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => viewFile(file.fileId)}
                        style={styles.viewFileButton}
                        activeOpacity={0.7}>
                        <Icon name="eye" size={18} color={colors.brand.primary} />
                        <Text style={styles.viewFileText}>Vezi</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          {/* Action Buttons - fixed at bottom */}
          {selectedKyc && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                onPress={() => {
                  console.log('[KycAdmin] ===== APPROVE BUTTON PRESSED =====');
                  console.log('[KycAdmin] selectedKyc:', selectedKyc);
                  console.log('[KycAdmin] kycId:', selectedKyc?.kycId);
                  if (selectedKyc?.kycId) {
                    handleApprove(selectedKyc.kycId);
                  }
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending || !selectedKyc?.kycId}
                style={[
                  styles.actionButton,
                  styles.approveButton,
                  (approveMutation.isPending || rejectMutation.isPending) && styles.actionButtonDisabled,
                ]}
                activeOpacity={0.8}>
                {approveMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.light[100]} />
                ) : (
                  <>
                    <Icon name="check-circle" size={20} color={colors.light[100]} />
                    <Text style={styles.approveButtonText}>Aproba</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  console.log('[KycAdmin] ===== REJECT BUTTON PRESSED =====');
                  console.log('[KycAdmin] selectedKyc:', selectedKyc);
                  console.log('[KycAdmin] kycId:', selectedKyc?.kycId);
                  if (selectedKyc?.kycId) {
                    handleReject(selectedKyc.kycId);
                  }
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending || !selectedKyc?.kycId}
                style={[
                  styles.actionButton,
                  styles.rejectButton,
                  (approveMutation.isPending || rejectMutation.isPending) && styles.actionButtonDisabled,
                ]}
                activeOpacity={0.8}>
                {rejectMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.error[500]} />
                ) : (
                  <>
                    <Icon name="close-circle" size={20} color={colors.error[500]} />
                    <Text style={styles.rejectButtonText}>Respinge</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={!!viewingFile}
        animationType="fade"
        onRequestClose={() => setViewingFile(null)}>
        <View style={styles.imageModalContainer}>
          <CustomHeader
            title="Vizualizare Imagine"
            onBack={() => setViewingFile(null)}
            showLogo={false}
          />
          {viewingFile && (
            <Image
              source={{uri: viewingFile}}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Rejection Dialog - Only for mobile */}
      {Platform.OS !== 'web' && (
        <Portal>
          <Dialog
            visible={showRejectDialog}
            onDismiss={() => {
              setShowRejectDialog(false);
              setRejectionReason('');
            }}
            style={styles.dialog}>
            <Dialog.Title style={styles.dialogTitle}>Respinge KYC</Dialog.Title>
            <Dialog.Content>
              <RNText style={styles.dialogParagraph}>
                Introdu motivul pentru care respingi acest KYC. Mesajul va fi
                vizibil utilizatorului.
              </RNText>
              <RNTextInput
                style={styles.rejectionInput}
                placeholder="Motivul respingerii..."
                placeholderTextColor={colors.light[50]}
                value={rejectionReason}
                onChangeText={setRejectionReason}
                multiline
                numberOfLines={4}
              />
            </Dialog.Content>
            <Dialog.Actions style={styles.dialogActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                style={styles.dialogCancelButton}>
                <Text style={styles.dialogCancelText}>Anuleaza</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRejection}
                disabled={rejectMutation.isPending}
                style={styles.dialogRejectButton}>
                {rejectMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.error[500]} />
                ) : (
                  <Text style={styles.dialogRejectText}>Respinge</Text>
                )}
              </TouchableOpacity>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}
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
    padding: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark[800],
  },
  headerCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.h3,
    color: colors.light[100],
    flex: 1,
  },
  countBadge: {
    backgroundColor: colors.info[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
  },
  countBadgeText: {
    ...typography.labelSmall,
    color: colors.brand.primary,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.dark[700],
    borderWidth: 1,
    borderColor: colors.dark[400],
    padding: spacing.lg,
  },
  kycItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kycAvatarContainer: {
    marginRight: spacing.md,
  },
  kycAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.info[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycInfo: {
    flex: 1,
  },
  userName: {
    ...typography.labelLarge,
    color: colors.light[100],
    marginBottom: 2,
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.light[60],
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
    color: colors.light[50],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.light[100],
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.light[50],
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.dark[800],
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.light[100],
    marginBottom: spacing.md,
  },
  detailRow: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    ...typography.labelUppercase,
    color: colors.light[60],
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.light[100],
  },
  detailValueMuted: {
    ...typography.bodySmall,
    color: colors.light[50],
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.pill,
    alignSelf: 'flex-start',
  },
  statusPending: {
    backgroundColor: colors.warning[50],
  },
  statusRejected: {
    backgroundColor: colors.error[50],
  },
  statusBadgeText: {
    ...typography.labelSmall,
    fontWeight: '700',
  },
  statusPendingText: {
    color: colors.warning[500],
  },
  statusRejectedText: {
    color: colors.error[500],
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  fileItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[400],
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.info[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    ...typography.labelMedium,
    color: colors.light[100],
  },
  fileType: {
    ...typography.caption,
    color: colors.light[50],
    marginTop: 2,
    textTransform: 'capitalize',
  },
  viewFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.brand.primary,
  },
  viewFileText: {
    ...typography.labelSmall,
    color: colors.brand.primary,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.dark[700],
    borderTopWidth: 1,
    borderTopColor: colors.dark[400],
  },
  actionButton: {
    flex: 1,
    borderRadius: borderRadius.pill,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  approveButton: {
    backgroundColor: colors.success[500],
  },
  approveButtonText: {
    ...typography.labelLarge,
    color: colors.light[100],
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: colors.error[500],
    backgroundColor: colors.error[50],
  },
  rejectButtonText: {
    ...typography.labelLarge,
    color: colors.error[500],
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: colors.dark[900],
  },
  fullImage: {
    flex: 1,
    width: '100%',
  },
  dialog: {
    backgroundColor: colors.dark[700],
    borderRadius: borderRadius.xl,
  },
  dialogTitle: {
    color: colors.light[100],
    ...typography.h4,
  },
  dialogParagraph: {
    color: colors.light[60],
    ...typography.bodySmall,
  },
  dialogActions: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  dialogCancelButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.pill,
  },
  dialogCancelText: {
    ...typography.labelMedium,
    color: colors.light[60],
  },
  dialogRejectButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.error[50],
  },
  dialogRejectText: {
    ...typography.labelMedium,
    color: colors.error[500],
  },
  rejectionInput: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark[400],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: colors.dark[600],
    color: colors.light[100],
    ...typography.bodyMedium,
  },
});

export default KycAdminScreen;
