import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getFirestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebaseConfig';

import { FirebaseService, Notification, CircleCategory } from '../auth/firebaseService';

const firestore = getFirestore();

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      console.log('Setting current user ID:', user.uid);
      setCurrentUserId(user.uid);
    } else {
      console.log('No authenticated user found');
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      console.log('No current user ID, skipping notification setup');
      return;
    }

    console.log('Setting up notifications listener for user:', currentUserId);
    
    // Real-time listener for notifications
    const notificationsRef = collection(db, 'users', currentUserId, 'notifications');
    const q = query(notificationsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`Received ${snapshot.docs.length} notifications`);
        const notifs: Notification[] = [];
        
        snapshot.forEach((doc) => {
          console.log('Processing notification:', doc.id, doc.data());
          notifs.push({
            id: doc.id,
            ...doc.data(),
          } as Notification);
        });

        // Sort by newest first
        notifs.sort(
          (a, b) =>
            (b.createdAt?.toMillis?.() || 0) -
            (a.createdAt?.toMillis?.() || 0)
        );

        setNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to notifications:', error);
        setLoading(false);
      }
    );

    return () => {
      console.log('Unsubscribing from notifications');
      unsubscribe();
    };
  }, [currentUserId]);

  const onRefresh = async () => {
    setRefreshing(true);
    console.log('Refreshing notifications');
    // The onSnapshot listener will automatically update
    setTimeout(() => setRefreshing(false), 1000);
  };

// NotificationsScreen.tsx

// In NotificationsScreen.tsx, update handleAcceptInvitation

async function handleAcceptInvitation(notification: Notification) {
  if (!currentUserId) {
    console.error('No current user ID');
    return;
  }

  try {
    console.log('[ACCEPT] Accepting invitation from:', notification.fromUserName);
    console.log('[ACCEPT] Notification details:', {
      fromUserId: notification.fromUserId,
      fromUserName: notification.fromUserName,
      circleMemberId: notification.circleMemberId,
    });
    
    // Step 1: Update notification status to 'accepted'
    const notifRef = doc(
      db,
      'users',
      currentUserId,
      'notifications',
      notification.id
    );
    await updateDoc(notifRef, {
      status: 'accepted',
    });
    console.log('[ACCEPT] Updated notification status to accepted');

    // Step 2: Update the circle member in the inviter's circle to 'accepted'
    if (notification.circleMemberId) {
      const inviterCircleMemberRef = doc(
        db,
        'users',
        notification.fromUserId,
        'circles',
        notification.circleMemberId
      );
      await updateDoc(inviterCircleMemberRef, {
        status: 'accepted',
      });
      console.log('[ACCEPT] Updated circle member status to accepted in inviter\'s circle');
    } else {
      console.log('[ACCEPT] No circleMemberId found in notification');
    }

    // Step 3: Create mutual connection
    await FirebaseService.createMutualConnection(
      notification.fromUserId,
      notification.fromUserName,
      notification.fromUserPhone,
      currentUserId,
      notification.category,
      notification.fromUserProfilePicture
    );
    console.log('[ACCEPT] Mutual connection created');

    Alert.alert(
      'Invitation Accepted',
      `You've accepted ${notification.fromUserName}'s invitation. You are now in each other's circle.`
    );
  } catch (error) {
    console.error('[ACCEPT ERROR] Error accepting invitation:', error);
    Alert.alert('Error', 'Failed to accept invitation');
  }
}

  async function handleRejectInvitation(notification: Notification) {
    if (!currentUserId) {
      console.error('No current user ID');
      return;
    }

    try {
      console.log('Rejecting invitation from:', notification.fromUserName);
      
      // Update notification status to 'rejected'
      const notifRef = doc(
        db,
        'users',
        currentUserId,
        'notifications',
        notification.id
      );
      await updateDoc(notifRef, {
        status: 'rejected',
      });
      console.log('Updated notification status to rejected');

      // Update the circle member in the inviter's circle to 'rejected'
      if (notification.circleMemberId) {
        const inviterCircleMemberRef = doc(
          db,
          'users',
          notification.fromUserId,
          'circles',
          notification.circleMemberId
        );
        await updateDoc(inviterCircleMemberRef, {
          status: 'rejected',
        });
        console.log('Updated circle member status to rejected');
      }

      Alert.alert('Invitation Rejected', 'You rejected the invitation');
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      Alert.alert('Error', 'Failed to reject invitation');
    }
  }

  async function handleDeleteNotification(notificationId: string) {
    if (!currentUserId) {
      console.error('No current user ID');
      return;
    }

    try {
      console.log('Deleting notification:', notificationId);
      const notifRef = doc(
        db,
        'users',
        currentUserId,
        'notifications',
        notificationId
      );
      await deleteDoc(notifRef);
      console.log('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      Alert.alert('Error', 'Failed to delete notification');
    }
  }

  function getPendingNotifications() {
    return notifications.filter((n) => n.status === 'pending');
  }

  function getResolvedNotifications() {
    return notifications.filter((n) => n.status !== 'pending');
  }

  function getTimeAgo(timestamp: any): string {
    if (!timestamp) return 'just now';

    const createdTime = timestamp.toMillis?.() || timestamp;
    const now = Date.now();
    const diff = now - createdTime;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  function getCategoryColor(
    category: CircleCategory
  ): { bg: string; text: string } {
    const colors: Record<CircleCategory, { bg: string; text: string }> = {
      Sibling: { bg: '#FEE2E2', text: '#991B1B' },
      Friends: { bg: '#DBEAFE', text: '#1E40AF' },
      Family: { bg: '#FCE7F3', text: '#831843' },
      Emergency: { bg: '#FECACA', text: '#7C2D12' },
      Other: { bg: '#E5E7EB', text: '#374151' },
    };
    return colors[category];
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  const pendingNotifs = getPendingNotifications();
  const resolvedNotifs = getResolvedNotifications();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>
          {pendingNotifs.length} pending
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
          />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              You don't have any circle invitations yet
            </Text>
          </View>
        ) : (
          <>
            {/* Pending Invitations */}
            {pendingNotifs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Invitations</Text>
                <View style={styles.notificationsList}>
                  {pendingNotifs.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      onAccept={() => handleAcceptInvitation(notification)}
                      onReject={() => handleRejectInvitation(notification)}
                      onDelete={() => handleDeleteNotification(notification.id)}
                      timeAgo={getTimeAgo(notification.createdAt)}
                      categoryColor={getCategoryColor(notification.category)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Resolved Notifications */}
            {resolvedNotifs.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Earlier</Text>
                <View style={styles.notificationsList}>
                  {resolvedNotifs.map((notification) => (
                    <View
                      key={notification.id}
                      style={[
                        styles.notificationCard,
                        styles.resolvedCard,
                      ]}
                    >
                      <View style={styles.notificationContent}>
                        <View style={styles.notificationHeader}>
                          {notification.fromUserProfilePicture ? (
                            <Image
                              source={{
                                uri: notification.fromUserProfilePicture,
                              }}
                              style={styles.userAvatar}
                            />
                          ) : (
                            <View style={styles.userAvatarPlaceholder}>
                              <Text style={styles.avatarText}>
                                {notification.fromUserName
                                  .charAt(0)
                                  .toUpperCase()}
                              </Text>
                            </View>
                          )}

                          <View style={styles.notificationInfo}>
                            <Text style={styles.senderName}>
                              {notification.fromUserName}
                            </Text>
                            <Text style={styles.notificationTime}>
                              {getTimeAgo(notification.createdAt)}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  notification.status === 'accepted'
                                    ? '#ECFDF5'
                                    : '#FEE2E2',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                {
                                  color:
                                    notification.status === 'accepted'
                                      ? '#059669'
                                      : '#991B1B',
                                },
                              ]}
                            >
                              {notification.status === 'accepted'
                                ? '✓'
                                : '✕'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.categoryBadgeContainer}>
                          <View
                            style={[
                              styles.categoryBadge,
                              {
                                backgroundColor: getCategoryColor(
                                  notification.category
                                ).bg,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.categoryBadgeText,
                                {
                                  color: getCategoryColor(
                                    notification.category
                                  ).text,
                                },
                              ]}
                            >
                              {notification.category}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteIconButton}
                        onPress={() =>
                          handleDeleteNotification(notification.id)
                        }
                      >
                        <Text style={styles.deleteIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Notification Card Component
function NotificationCard({
  notification,
  onAccept,
  onReject,
  onDelete,
  timeAgo,
  categoryColor,
}: {
  notification: Notification;
  onAccept: () => void;
  onReject: () => void;
  onDelete: () => void;
  timeAgo: string;
  categoryColor: { bg: string; text: string };
}) {
  return (
    <View style={styles.notificationCard}>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          {notification.fromUserProfilePicture ? (
            <Image
              source={{ uri: notification.fromUserProfilePicture }}
              style={styles.userAvatar}
            />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Text style={styles.avatarText}>
                {notification.fromUserName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.notificationInfo}>
            <Text style={styles.senderName}>{notification.fromUserName}</Text>
            <Text style={styles.notificationMessage}>
              {notification.message}
            </Text>
            <Text style={styles.notificationTime}>{timeAgo}</Text>
          </View>
        </View>

        <View style={styles.categoryBadgeContainer}>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: categoryColor.bg },
            ]}
          >
            <Text style={[styles.categoryBadgeText, { color: categoryColor.text }]}>
              {notification.category}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={onAccept}
        >
          <Text style={styles.actionButtonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={onReject}
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
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
    paddingVertical: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  notificationsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  resolvedCard: {
    backgroundColor: '#F9FAFB',
    opacity: 0.85,
  },
  notificationContent: {
    marginBottom: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
  },
  notificationInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryBadgeContainer: {
    marginTop: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rejectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  deleteIconButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-end',
  },
  deleteIcon: {
    fontSize: 18,
  },
});