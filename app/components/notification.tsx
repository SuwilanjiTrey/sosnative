// app/components/notification.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../../firebaseConfig';
import { CircleCategory, FirebaseService } from '../auth/firebaseService';

type Notification = {
  id: string;
  type: 'circle_invitation' | 'sos_alert';
  fromUserId: string;
  fromUserName: string;
  fromUserPhone: string;
  fromUserProfilePicture?: string;
  category?: CircleCategory;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: any;
  message: string;
  circleMemberId?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  information?: string;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

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
    
    const notificationsRef = collection(db, 'users', currentUserId, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

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
    setTimeout(() => setRefreshing(false), 1000);
  };

  async function handleAcceptInvitation(notification: Notification) {
    if (!currentUserId) {
      console.error('No current user ID');
      return;
    }

    try {
      console.log('[ACCEPT] Accepting invitation from:', notification.fromUserName);
      
      const notifRef = doc(db, 'users', currentUserId, 'notifications', notification.id);
      await updateDoc(notifRef, {
        status: 'accepted',
      });
      console.log('[ACCEPT] Updated notification status to accepted');

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
      }

      await FirebaseService.createMutualConnection(
        notification.fromUserId,
        notification.fromUserName,
        notification.fromUserPhone,
        currentUserId,
        notification.category!,
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
      
      const notifRef = doc(db, 'users', currentUserId, 'notifications', notification.id);
      await updateDoc(notifRef, {
        status: 'rejected',
      });
      console.log('Updated notification status to rejected');

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

  async function handleAcknowledgeSOS(notificationId: string) {
    if (!currentUserId) return;

    try {
      const notifRef = doc(db, 'users', currentUserId, 'notifications', notificationId);
      await updateDoc(notifRef, {
        status: 'accepted',
      });
      Alert.alert('Acknowledged', 'You have acknowledged this emergency alert');
    } catch (error) {
      console.error('Error acknowledging SOS:', error);
      Alert.alert('Error', 'Failed to acknowledge alert');
    }
  }

  function handleViewLocation(location: { latitude: number; longitude: number }, notification: Notification) {
    console.log('=== handleViewLocation FULL DEBUG ===');
    console.log('1. Function called with location:', JSON.stringify(location));
    console.log('2. Notification:', JSON.stringify({
      id: notification.id,
      fromUserId: notification.fromUserId,
      fromUserName: notification.fromUserName
    }));
    console.log('3. Router available:', !!router);
    console.log('4. Router type:', typeof router);
    
    if (!location || !location.latitude || !location.longitude) {
      console.error('[ERROR] Invalid location data:', location);
      Alert.alert('Error', 'Invalid location data');
      return;
    }
    
    try {
      const params = {
        focusUserId: notification.fromUserId,
        focusUserName: notification.fromUserName,
        focusLat: location.latitude.toString(),
        focusLng: location.longitude.toString(),
        isEmergency: 'true'
      };
      
      console.log('5. Navigation params prepared:', params);
      console.log('6. Attempting navigation...');
      
      // Try direct push
      router.push({
        pathname: '/components/live-location',
        params
      });
      
      console.log('7. Navigation command executed successfully');
    } catch (error) {
      console.error('[NAVIGATION ERROR]:', error);
      console.error('[ERROR STACK]:', error instanceof Error ? error.stack : 'No stack');
      Alert.alert('Navigation Error', 'Failed to open location view: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  function handleCallPerson(phoneNumber: string) {
    const url = `tel:${phoneNumber.replace(/\s+/g, '')}`;
    Linking.openURL(url).catch((err) => {
      console.error('Error making call:', err);
      Alert.alert('Error', 'Failed to make call');
    });
  }

  async function handleDeleteNotification(notificationId: string) {
    if (!currentUserId) {
      console.error('No current user ID');
      return;
    }

    try {
      console.log('Deleting notification:', notificationId);
      const notifRef = doc(db, 'users', currentUserId, 'notifications', notificationId);
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

  function getCategoryColor(category: CircleCategory): { bg: string; text: string } {
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
  const sosAlerts = pendingNotifs.filter(n => n.type === 'sos_alert');
  const circleInvitations = pendingNotifs.filter(n => n.type === 'circle_invitation');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <Text style={styles.headerSubtitle}>
          {pendingNotifs.length} pending
          {sosAlerts.length > 0 && ` • ${sosAlerts.length} emergency`}
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
            <Ionicons name="notifications-off-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>
              You don't have any notifications yet
            </Text>
          </View>
        ) : (
          <>
            {/* SOS Alerts - Priority Section */}
            {sosAlerts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.emergencySectionHeader}>
                  <Ionicons name="warning" size={20} color="#dc2626" />
                  <Text style={styles.emergencySectionTitle}>Emergency Alerts</Text>
                </View>
                <View style={styles.notificationsList}>
               
                
                {sosAlerts.map((notification) => {
                  console.log('Rendering SOS card for:', notification.id, 'Has location:', !!notification.location);
                  return (
                    <SOSAlertCard
                      key={notification.id}
                      notification={notification}
                      hasLocation={!!notification.location}
                      onAcknowledge={() => {
                        console.log('[ACKNOWLEDGE] Button pressed for:', notification.id);
                        handleAcknowledgeSOS(notification.id);
                      }}
                      onViewLocation={() => {
                        console.log('[VIEW LOCATION] Button pressed for:', notification.id);
                        console.log('[VIEW LOCATION] Location data:', notification.location);
                        console.log('[VIEW LOCATION] Full notification:', JSON.stringify(notification, null, 2));
                        
                        if (notification.location) {
                          handleViewLocation(notification.location, notification);
                        } else {
                          Alert.alert('No Location', 'Location data is not available for this alert');
                        }
                      }}
                      onCall={() => {
                        console.log('[CALL] Button pressed for:', notification.id);
                        handleCallPerson(notification.fromUserPhone);
                      }}
                      timeAgo={getTimeAgo(notification.createdAt)}
                    />
                  );
                })}
                </View>
              </View>
            )}

            {/* Circle Invitations */}
            {circleInvitations.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Circle Invitations</Text>
                <View style={styles.notificationsList}>
                  {circleInvitations.map((notification) => (
                    <CircleInvitationCard
                      key={notification.id}
                      notification={notification}
                      onAccept={() => handleAcceptInvitation(notification)}
                      onReject={() => handleRejectInvitation(notification)}
                      timeAgo={getTimeAgo(notification.createdAt)}
                      categoryColor={getCategoryColor(notification.category!)}
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
                    <ResolvedNotificationCard
                      key={notification.id}
                      notification={notification}
                      onDelete={() => handleDeleteNotification(notification.id)}
                      timeAgo={getTimeAgo(notification.createdAt)}
                      categoryColor={notification.category ? getCategoryColor(notification.category) : undefined}
                    />
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

// SOS Alert Card Component
function SOSAlertCard({
  notification,
  onAcknowledge,
  onViewLocation,
  onCall,
  timeAgo,
  hasLocation,
}: {
  notification: Notification;
  onAcknowledge: () => void;
  onViewLocation: () => void;
  onCall: () => void;
  timeAgo: string;
  hasLocation?: boolean;
}) {
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, []);

  const backgroundColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#fee2e2', '#fecaca'],
  });

  // ADD THIS DEBUG LOG
  console.log('[SOSAlertCard] Rendering card with hasLocation:', hasLocation, 'notification.location:', notification.location);


  return (
    <Animated.View style={[styles.sosCard, { backgroundColor }]}>
      <View style={styles.sosHeader}>
        <View style={styles.sosIconContainer}>
          <Ionicons name="warning" size={28} color="#fff" />
        </View>
        <View style={styles.sosInfo}>
          <Text style={styles.sosTitle}>EMERGENCY ALERT</Text>
          <Text style={styles.sosName}>{notification.fromUserName}</Text>
          <Text style={styles.sosTime}>{timeAgo}</Text>
        </View>
      </View>

      <View style={styles.sosContent}>
        <Text style={styles.sosMessage}>{notification.message}</Text>
        {notification.information && (
          <Text style={styles.sosAdditionalInfo}>"{notification.information}"</Text>
        )}
        
        {notification.location && (
          <View style={styles.locationBadge}>
            <Ionicons name="location" size={16} color="#dc2626" />
            <Text style={styles.locationText}>Location shared</Text>
          </View>
        )}
      </View>

      <View style={styles.sosActions}>
        <TouchableOpacity
          style={[
            styles.sosActionButton, 
            styles.viewLocationButton,
            !hasLocation && styles.sosActionButtonDisabled // ADD THIS
          ]}
          onPress={() => {
            console.log('[BUTTON PRESS] View Location touched');
            console.log('[BUTTON PRESS] hasLocation:', hasLocation);
            console.log('[BUTTON PRESS] notification.location:', notification.location);
            
            if (hasLocation && onViewLocation) {
              console.log('[BUTTON PRESS] Calling onViewLocation');
              onViewLocation();
            } else {
              console.log('[BUTTON PRESS] onViewLocation not called - hasLocation:', hasLocation);
              Alert.alert('No Location', 'Location is not available');
            }
          }}
          disabled={!hasLocation}
          activeOpacity={0.7}
        >
          <Ionicons name="map" size={18} color="#fff" />
          <Text style={styles.sosActionButtonText}>
            {hasLocation ? 'View Location' : 'No Location'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.sosActionButton, styles.callButton]}
          onPress={() => {
            console.log('[BUTTON PRESS] Call touched');
            onCall();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={styles.sosActionButtonText}>Call</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.acknowledgeButton}
        onPress={() => {
          console.log('[BUTTON PRESS] Acknowledge touched');
          onAcknowledge();
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Circle Invitation Card Component
function CircleInvitationCard({
  notification,
  onAccept,
  onReject,
  timeAgo,
  categoryColor,
}: {
  notification: Notification;
  onAccept: () => void;
  onReject: () => void;
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
            <Text style={styles.notificationMessage}>{notification.message}</Text>
            <Text style={styles.notificationTime}>{timeAgo}</Text>
          </View>
        </View>

        <View style={styles.categoryBadgeContainer}>
          <View
            style={[styles.categoryBadge, { backgroundColor: categoryColor.bg }]}
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

// Resolved Notification Card Component
function ResolvedNotificationCard({
  notification,
  onDelete,
  timeAgo,
  categoryColor,
}: {
  notification: Notification;
  onDelete: () => void;
  timeAgo: string;
  categoryColor?: { bg: string; text: string };
}) {
  const isSOS = notification.type === 'sos_alert';

  return (
    <View style={[styles.notificationCard, styles.resolvedCard]}>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          {isSOS ? (
            <View style={styles.sosResolvedIcon}>
              <Ionicons name="warning" size={24} color="#dc2626" />
            </View>
          ) : notification.fromUserProfilePicture ? (
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
              {isSOS ? 'Emergency Alert' : notification.message}
            </Text>
            <Text style={styles.notificationTime}>{timeAgo}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  notification.status === 'accepted' ? '#ECFDF5' : '#FEE2E2',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    notification.status === 'accepted' ? '#059669' : '#991B1B',
                },
              ]}
            >
              {notification.status === 'accepted' ? '✓' : '✕'}
            </Text>
          </View>
        </View>

        {categoryColor && (
          <View style={styles.categoryBadgeContainer}>
            <View
              style={[styles.categoryBadge, { backgroundColor: categoryColor.bg }]}
            >
              <Text
                style={[styles.categoryBadgeText, { color: categoryColor.text }]}
              >
                {notification.category}
              </Text>
            </View>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.deleteIconButton} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
      </TouchableOpacity>
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 16,
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
  emergencySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    gap: 8,
  },
  emergencySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  notificationsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  // SOS Alert Styles
  sosCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sosIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sosInfo: {
    flex: 1,
  },
  sosTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7f1d1d',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  sosName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  sosTime: {
    fontSize: 12,
    color: '#991b1b',
  },
  sosContent: {
    marginBottom: 12,
  },
  sosMessage: {
    fontSize: 14,
    color: '#7f1d1d',
    marginBottom: 8,
    fontWeight: '500',
  },
  sosAdditionalInfo: {
    fontSize: 13,
    color: '#991b1b',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  sosActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  sosActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
    minHeight: 44, // Ensure minimum touch target size
  },
  viewLocationButton: {
    backgroundColor: '#dc2626',
    opacity: 1, // Ensure it's not transparent
  },
  callButton: {
    backgroundColor: '#16a34a',
  },
  sosActionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  acknowledgeButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  acknowledgeButtonText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '600',
  },
  // Regular Notification Styles
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
  sosResolvedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fee2e2',
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
  sosActionButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
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
});