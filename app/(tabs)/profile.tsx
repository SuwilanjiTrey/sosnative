import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useProfile } from '../contexts/ProfileContext';
import { db } from '../../firebaseConfig'
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useAuth } from '../../hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { profilePicture } = useProfile();


  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/auth/login');
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

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
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const getImageSource = () => {
    if (userData?.profilePictureBase64) {
      return { uri: userData.profilePictureBase64 };
    }
    return { uri: user?.photoURL || 'https://i.pravatar.cc/150?img=10' };
  };

  const menuItems = [
    { id: 1, title: 'Settings', icon: 'settings-outline', route: '../components/settings' },
    { id: 2, title: 'Notifications', icon: 'notifications-outline', route: '../components/notification' },
    { id: 3, title: 'Privacy and Policy', icon: 'document-text-outline', route: '../components/privacy' },
    { id: 4, title: 'My Record', icon: 'videocam-outline', route: '../components/sosrecords' },
    { id: 5, title: 'Invite', icon: 'star-outline', route: '../components/invite' },
    
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.profileImageContainer}>
          <Image 
            source={getImageSource()}
            style={styles.profileImage}
          />
        </View>
        
        <View style={styles.profileInfo}>
          <Text style={styles.userName}> {userData?.name || user?.displayName || 'User'} </Text>
          <Text style={styles.joinDate}>Joined on 2023</Text>
          <View style={styles.accountBadge}>
            <Ionicons name="shield-checkmark" size={16} color="#007AFF" />
            <Text style={styles.accountType}>
              
            {userData?.isPremium ? 'Premium user' : 'Basic Plan'}
              
              </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => router.push('../components/change-picture')}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name={item.icon as any} size={24} color="#333" />
              <Text style={styles.menuItemText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Subscription Card */}
      <View style={styles.subscriptionContainer}>
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionContent}>
            <Text style={styles.subscriptionTitle}>
              Become a member for extra security
            </Text>
            <Text style={styles.subscriptionSubtitle}>
              Monthly subscription for K50
            </Text>
            <TouchableOpacity 
              style={styles.subscribeButton}
              onPress={() => router.push('../components/premium')}
            >
              <Text style={styles.subscribeButtonText}>Subscribe</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.subscriptionImage}>
            <Ionicons name="shield-checkmark" size={60} color="#FFB800" />
          </View>
          
        </View>
        <View style={styles.logoutButton}>
        <TouchableOpacity 
              style={styles.subscribeButton}
              onPress={ () => handleSignOut()}
            >
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    backgroundColor: '#fff',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileImageContainer: {
    marginRight: 15,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f0f0',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  accountType: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#d32f2f',
    fontWeight: '600',
    fontSize: 16,
  },
  subscriptionContainer: {
    padding: 20,
    paddingTop: 30,
  },
  subscriptionCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionContent: {
    flex: 1,
    paddingRight: 10,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subscriptionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  subscribeButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subscribeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  subscriptionImage: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
});