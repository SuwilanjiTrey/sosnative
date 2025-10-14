import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

/**
 * SOSRecordsScreen.tsx
 * --------------------
 * React Native implementation showing all SOS records made by the user
 * 
 * Firebase Structure:
 * users/{userId}/
 *   records/{recordId}/
 *     - circle, title, timestamp, status, location, notifiedMembers, media, notes, etc.
 */

// Types
type Status = 'in_progress' | 'resolved' | 'safe';

type Member = {
  id: string;
  name: string;
  phone: string;
  relation?: string;
};

type MediaItem = {
  type: 'photo' | 'audio';
  uri: string;
  filename?: string;
};

type LocationObj = {
  label?: string;
  lat?: number;
  lng?: number;
};

type RecordItem = {
  id: string;
  userId: string;
  circle: string;
  title: string;
  timestamp: string;
  status: Status;
  location?: LocationObj;
  notifiedMembers?: Member[];
  media?: MediaItem[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  synced?: boolean;
};


// Firebase Service
class RecordsService {
  static async fetchUserRecords(userId: string): Promise<RecordItem[]> {
    try {
      const recordsRef = collection(db, 'users', userId, 'records');
      const q = query(recordsRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt,
      })) as RecordItem[];
    } catch (error) {
      console.error('Error fetching records:', error);
      throw error;
    }
  }

  static async updateRecordStatus(
    userId: string,
    recordId: string,
    status: Status
  ): Promise<void> {
    try {
      const recordRef = doc(db, 'users', userId, 'records', recordId);
      await updateDoc(recordRef, {
        status,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }
}

// Helper function to format date
function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

function formatTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getStatusColor(status: Status): string {
  switch (status) {
    case 'safe':
      return '#10B981';
    case 'resolved':
      return '#3B82F6';
    case 'in_progress':
      return '#F59E0B';
    default:
      return '#6B7280';
  }
}

function getStatusLabel(status: Status): string {
  switch (status) {
    case 'safe':
      return 'Safe';
    case 'resolved':
      return 'Resolved';
    case 'in_progress':
      return 'In Progress';
    default:
      return status;
  }
}

export default function SOSRecordsScreen() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RecordItem | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  const currentUserId = 'user_202302738'; // Replace with actual auth user ID

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    setLoading(true);
    try {
      const data = await RecordsService.fetchUserRecords(currentUserId);
      setRecords(data);
    } catch (error) {
      console.error('Failed to load records:', error);
      Alert.alert('Error', 'Failed to load your SOS records');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadRecords();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleMarkSafe(record: RecordItem) {
    Alert.alert(
      'Mark as Safe',
      'Confirm that you are safe and all is well?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, I\'m Safe',
          onPress: async () => {
            setUpdatingStatus(true);
            try {
              await RecordsService.updateRecordStatus(currentUserId, record.id, 'safe');
              const updated = { ...record, status: 'safe' as Status, updatedAt: new Date().toISOString() };
              setRecords(prev => prev.map(r => r.id === record.id ? updated : r));
              setSelectedRecord(updated);
              Alert.alert('Success', 'Status updated to Safe');
            } catch (error) {
              Alert.alert('Error', 'Failed to update status');
            } finally {
              setUpdatingStatus(false);
            }
          },
        },
      ]
    );
  }

  // Group records by month
  const groupedByMonth = records.reduce((acc, record) => {
    const date = new Date(record.timestamp);
    const monthYear = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(record);
    return acc;
  }, {} as Record<string, RecordItem[]>);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Records</Text>
          <Text style={styles.headerSubtitle}>{records.length} total alerts</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.filterButton}>
            <Text style={styles.filterIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#EF4444" />
            <Text style={styles.loadingText}>Loading records...</Text>
          </View>
        ) : records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🚨</Text>
            <Text style={styles.emptyTitle}>No SOS Records</Text>
            <Text style={styles.emptySubtitle}>
              Your emergency alerts will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.recordsContainer}>
            {Object.entries(groupedByMonth).map(([monthYear, monthRecords]) => (
              <View key={monthYear} style={styles.monthSection}>
                <Text style={styles.monthHeader}>{monthYear}</Text>
                
                {monthRecords.map(record => (
                  <TouchableOpacity
                    key={record.id}
                    style={styles.recordCard}
                    onPress={() => setSelectedRecord(record)}
                  >
                    {/* Status Indicator */}
                    <View
                      style={[
                        styles.statusIndicator,
                        { backgroundColor: getStatusColor(record.status) },
                      ]}
                    />

                    <View style={styles.recordContent}>
                      {/* Top Row */}
                      <View style={styles.recordTop}>
                        <View style={styles.recordInfo}>
                          <Text style={styles.recordTitle}>{record.title}</Text>
                          <View style={styles.recordMeta}>
                            <Text style={styles.recordCircle}>{record.circle}</Text>
                            <Text style={styles.recordDot}>•</Text>
                            <Text style={styles.recordTime}>{formatTime(record.timestamp)}</Text>
                          </View>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: `${getStatusColor(record.status)}15` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: getStatusColor(record.status) },
                            ]}
                          >
                            {getStatusLabel(record.status)}
                          </Text>
                        </View>
                      </View>

                      {/* Location */}
                      {record.location?.label && (
                        <View style={styles.locationRow}>
                          <Text style={styles.locationIcon}>📍</Text>
                          <Text style={styles.locationText} numberOfLines={1}>
                            {record.location.label}
                          </Text>
                        </View>
                      )}

                      {/* Notified Members */}
                      {record.notifiedMembers && record.notifiedMembers.length > 0 && (
                        <View style={styles.membersRow}>
                          <Text style={styles.membersLabel}>Notified:</Text>
                          <View style={styles.membersList}>
                            {record.notifiedMembers.slice(0, 3).map((member, idx) => (
                              <View key={member.id} style={styles.memberChip}>
                                <Text style={styles.memberName}>{member.name}</Text>
                              </View>
                            ))}
                            {record.notifiedMembers.length > 3 && (
                              <Text style={styles.membersCount}>
                                +{record.notifiedMembers.length - 3} more
                              </Text>
                            )}
                          </View>
                        </View>
                      )}

                      {/* Date */}
                      <Text style={styles.recordDate}>{formatDate(record.timestamp)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <Modal
          visible={!!selectedRecord}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSelectedRecord(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>{selectedRecord.title}</Text>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      { backgroundColor: `${getStatusColor(selectedRecord.status)}15` },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getStatusColor(selectedRecord.status) },
                      ]}
                    />
                    <Text
                      style={[
                        styles.modalStatusText,
                        { color: getStatusColor(selectedRecord.status) },
                      ]}
                    >
                      {getStatusLabel(selectedRecord.status)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedRecord(null)}
                  style={styles.modalCloseButton}
                >
                  <Text style={styles.modalCloseIcon}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Time & Circle */}
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Circle</Text>
                    <Text style={styles.detailValue}>{selectedRecord.circle}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Time</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedRecord.timestamp)} at {formatTime(selectedRecord.timestamp)}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                {selectedRecord.location?.label && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Location</Text>
                    <View style={styles.locationCard}>
                      <Text style={styles.locationCardIcon}>📍</Text>
                      <Text style={styles.locationCardText}>
                        {selectedRecord.location.label}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Notified Members */}
                {selectedRecord.notifiedMembers && selectedRecord.notifiedMembers.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      Notified Members ({selectedRecord.notifiedMembers.length})
                    </Text>
                    {selectedRecord.notifiedMembers.map(member => (
                      <View key={member.id} style={styles.memberCard}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {member.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberCardName}>{member.name}</Text>
                          <Text style={styles.memberCardPhone}>{member.phone}</Text>
                        </View>
                        {member.relation && (
                          <View style={styles.relationBadge}>
                            <Text style={styles.relationText}>{member.relation}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Notes */}
                {selectedRecord.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Additional Notes</Text>
                    <View style={styles.notesCard}>
                      <Text style={styles.notesText}>{selectedRecord.notes}</Text>
                    </View>
                  </View>
                )}

                {/* Media */}
                {selectedRecord.media && selectedRecord.media.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>
                      Media ({selectedRecord.media.length})
                    </Text>
                    <View style={styles.mediaGrid}>
                      {selectedRecord.media.map((item, idx) => (
                        <View key={idx} style={styles.mediaItem}>
                          {item.type === 'photo' ? (
                            <Image source={{ uri: item.uri }} style={styles.mediaImage} />
                          ) : (
                            <View style={styles.audioPlaceholder}>
                              <Text style={styles.audioIcon}>🎵</Text>
                              <Text style={styles.audioLabel}>Audio</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Modal Footer */}
              <View style={styles.modalFooter}>
                {selectedRecord.status !== 'safe' ? (
                  <TouchableOpacity
                    style={[styles.safeButton, updatingStatus && styles.safeButtonDisabled]}
                    onPress={() => handleMarkSafe(selectedRecord)}
                    disabled={updatingStatus}
                  >
                    <Text style={styles.safeButtonIcon}>✓</Text>
                    <Text style={styles.safeButtonText}>
                      {updatingStatus ? 'Updating...' : 'Mark Yourself as Safe'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.safeIndicator}>
                    <Text style={styles.safeIndicatorIcon}>✓</Text>
                    <Text style={styles.safeIndicatorText}>Marked as Safe</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    padding: 8,
  },
  filterIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  recordsContainer: {
    gap: 20,
  },
  monthSection: {
    gap: 12,
  },
  monthHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: 'row',
  },
  statusIndicator: {
    width: 4,
  },
  recordContent: {
    flex: 1,
    padding: 14,
  },
  recordTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  recordInfo: {
    flex: 1,
    marginRight: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  recordMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recordCircle: {
    fontSize: 13,
    color: '#6B7280',
  },
  recordDot: {
    fontSize: 10,
    color: '#D1D5DB',
  },
  recordTime: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  locationIcon: {
    fontSize: 14,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  membersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  membersLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  membersList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  memberChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  memberName: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  membersCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  recordDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTitleContainer: {
    flex: 1,
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modalStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalCloseIcon: {
    fontSize: 24,
    color: '#6B7280',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationCardIcon: {
    fontSize: 18,
  },
  locationCardText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  memberInfo: {
    flex: 1,
  },
  memberCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  memberCardPhone: {
    fontSize: 13,
    color: '#6B7280',
  },
  relationBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  relationText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '500',
  },
  notesCard: {
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  notesText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  mediaItem: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  audioPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  audioIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  audioLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  safeButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  safeButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  safeButtonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  safeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  safeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#D1FAE5',
    borderRadius: 10,
  },
  safeIndicatorIcon: {
    fontSize: 18,
    color: '#059669',
  },
  safeIndicatorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
});