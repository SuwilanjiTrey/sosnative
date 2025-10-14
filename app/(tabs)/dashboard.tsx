// app/(tabs)/dashboard.tsx
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import SOSButton from '../components/SOSButton';
import { useAuth } from '../../hooks/useAuth';
import { StyledText } from '../../components/StyledText';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type CircleCategory = 'Sibling' | 'Friends' | 'Family' | 'Emergency' | 'Other';

type CircleData = {
  id: string;
  category: CircleCategory;
  memberCount: number;
  avatars: string[];
  initials: string[];
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [circles, setCircles] = useState<CircleData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    const fetchCircles = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const circlesRef = collection(db, 'users', user.uid, 'circles');
        const snapshot = await getDocs(circlesRef);
        
        // Group circles by category
        const groupedByCategory: Record<CircleCategory, any[]> = {
          Sibling: [],
          Friends: [],
          Family: [],
          Emergency: [],
          Other: [],
        };

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const category: CircleCategory = data.category || 'Other';
          groupedByCategory[category].push({
            ...data,
            id: doc.id,
          });
        });

        // Transform grouped data into circle cards
        const circleCards: CircleData[] = Object.entries(groupedByCategory)
          .filter(([_, members]) => members.length > 0)
          .map(([category, members]) => {
            const firstThree = members.slice(0, 3);
            return {
              id: category,
              category: category as CircleCategory,
              memberCount: members.length,
              avatars: firstThree
                .map(member => member.profilePictureBase64),
              initials: firstThree
                .map(member => member.name.charAt(0).toUpperCase()),
            };
          });

        setCircles(circleCards);
      } catch (error) {
        console.error('Error fetching circles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCircles();
  }, [user]);

  const getImageSource = () => {
    if (userData?.profilePictureBase64) {
      return { uri: userData.profilePictureBase64 };
    }
    return { uri: user?.photoURL || 'https://i.pravatar.cc/150?img=10' };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d32f2f" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={getImageSource()}
            style={styles.avatar}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {userData?.name || user?.displayName || 'User'}
            </Text>
            <View style={styles.premiumBadgeSmall}>
              <Ionicons name="shield-checkmark" size={14} color="#4caf50" />
              <Text style={styles.premiumTextSmall}>
                
                {userData?.isPremium ? 'Premium user' : 'Basic Plan'}
                
                </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.locationContainer}
        onPress={() => router.push('../components/live-location')}
        activeOpacity={0.7}
      >
        <View style={styles.locationIconContainer}>
          <Ionicons name="navigate" size={20} color="#2196f3" />
        </View>
        <View style={styles.locationTextContainer}>
          <Text style={styles.locationText}>Libala Stage 3, Lusaka</Text>
          <Text style={styles.locationSubtext}>Tap to view live location</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Emergency Circle Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Emergency Circle</Text>
            <TouchableOpacity
              onPress={() => router.push('./circle')}
              activeOpacity={0.7}
            >
              <Text style={styles.manageText}>Manage</Text>
            </TouchableOpacity>
          </View>
          
          {circles.length === 0 ? (
            <View style={styles.emptyCirclesContainer}>
              <Text style={styles.emptyCirclesText}>No emergency circles yet. Add members to get started!</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
            >
              {circles.map(circle => (
                <CircleCardComponent key={circle.id} circle={circle} />
              ))}
              
              <TouchableOpacity 
                style={styles.addCircleButton}
                onPress={() => router.push('./circle')}
              >
                <View style={styles.addCircleIcon}>
                  <Ionicons name="add" size={24} color="#d32f2f" />
                </View>
                <Text style={styles.addCircleCount}>+Add</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* SOS Button */}
        <View style={styles.sosContainer}>
          <SOSButton onSOSTriggered={() => {}} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userDetails: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 18,
    color: '#333',
    fontWeight: '700',
    marginBottom: 4,
  },
  premiumBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  premiumTextSmall: {
    color: '#4caf50',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationButton: {
    padding: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  locationSubtext: {
    fontSize: 13,
    color: '#666',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  manageText: {
    color: '#2196f3',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCirclesContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  emptyCirclesText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  circlesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  circleCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    minHeight: 140,
  },
  circleName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  circleMembers: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
  },
  circleAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
  },
  addCircleButton: {
    width: 80,
    backgroundColor: '#fff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  addCircleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addCircleCount: {
    fontSize: 14,
    color: '#d32f2f',
    fontWeight: '600',
  },
  sosContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
});

// Circle Card Component
function CircleCardComponent({ circle }: { circle: CircleData }) {
  return (
    <View style={circleCardStyles.card}>
      <Text style={circleCardStyles.title}>{circle.category}</Text>
      <Text style={circleCardStyles.memberCount}>{circle.memberCount} Members</Text>
      <View style={circleCardStyles.avatarsContainer}>
        {circle.avatars.map((avatar, index) => (
          <View key={index} style={[circleCardStyles.avatar, { marginLeft: index > 0 ? -10 : 0 }]}>
            {avatar ? (
              <Image
                source={{ uri: avatar }}
                style={circleCardStyles.avatarImage}
              />
            ) : (
              <View style={circleCardStyles.initialsContainer}>
                <Text style={circleCardStyles.initialText}>{circle.initials[index]}</Text>
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const circleCardStyles = StyleSheet.create({
  card: {
    width: 160,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    justifyContent: 'space-between',
    minHeight: 160,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  initialsContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});