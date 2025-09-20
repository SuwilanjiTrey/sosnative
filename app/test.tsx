// app/test.tsx
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, Image, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { StyledText } from '../components/StyledText';

export default function TestPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Auth State
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');

  // Profile State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');
  const [profilePicture, setProfilePicture] = useState('');

  // Circle State
  const [circleName, setCircleName] = useState('Family');
  const [circles, setCircles] = useState<any[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState('');

  // Member State
  const [memberName, setMemberName] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberRelation, setMemberRelation] = useState('Brother');
  const [members, setMembers] = useState<any[]>([]);

  // SOS State
  const [sosRecords, setSosRecords] = useState<any[]>([]);

  // Settings State
  const [settings, setSettings] = useState({
    location: true,
    camera: false,
    audio: false,
    photo: false
  });

  // Initialize
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        loadUserData(user.uid);
        loadCircles(user.uid);
        loadSOSRecords(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load User Data
  const loadUserData = async (uid: string) => {
    const userDoc = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(userDoc, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setFirstName(data.firstName || '');
        setLastName(data.lastName || '');
        setGender(data.gender || 'Male');
        setProfilePicture(data.profilePicture || '');
        setSettings(data.settings || settings);
      }
    });
    return unsubscribe;
  };

  // Load Circles
  const loadCircles = async (uid: string) => {
    const q = query(collection(db, 'circles'), where('ownerId', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const circleList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCircles(circleList);
      if (circleList.length > 0 && !selectedCircleId) {
        setSelectedCircleId(circleList[0].id);
        loadMembers(circleList[0].id);
      }
    });
    return unsubscribe;
  };

  // Load Members
  const loadMembers = async (circleId: string) => {
    const circleDoc = doc(db, 'circles', circleId);
    const unsubscribe = onSnapshot(circleDoc, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setMembers(data.members || []);
      }
    });
    return unsubscribe;
  };

  // Load SOS Records
  const loadSOSRecords = async (uid: string) => {
    const q = query(collection(db, 'sosRecords'), where('userId', '==', uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSosRecords(records);
    });
    return unsubscribe;
  };

  // Create Account
  const handleCreateAccount = async () => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document
      await addDoc(collection(db, 'users'), {
        uid: user.uid,
        email: user.email,
        firstName: '',
        lastName: '',
        gender: 'Male',
        profilePicture: '',
        settings: {
          location: true,
          camera: false,
          audio: false,
          photo: false
        },
        createdAt: new Date()
      });
      
      Alert.alert('Success', 'Account created!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Login
  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      Alert.alert('Success', 'Logged in!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    await signOut(auth);
    Alert.alert('Logged Out', 'You have been logged out');
  };

  // Update Profile
  const handleUpdateProfile = async () => {
    if (!user) return;
    
    try {
      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, {
        firstName,
        lastName,
        gender,
        profilePicture
      });
      Alert.alert('Success', 'Profile updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Create Circle
  const handleCreateCircle = async () => {
    if (!user) return;
    
    try {
      const docRef = await addDoc(collection(db, 'circles'), {
        ownerId: user.uid,
        name: circleName,
        members: [],
        createdAt: new Date()
      });
      
      Alert.alert('Success', 'Circle created!');
      setCircleName('Family');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Add Member
  const handleAddMember = async () => {
    if (!selectedCircleId || !memberName || !memberPhone) return;
    
    try {
      const circleDoc = doc(db, 'circles', selectedCircleId);
      const circleSnap = await circleDoc.get();
      const currentMembers = circleSnap.data()?.members || [];
      
      const newMember = {
        id: Date.now().toString(),
        name: memberName,
        phone: memberPhone,
        relation: memberRelation,
        addedAt: new Date()
      };
      
      await updateDoc(circleDoc, {
        members: [...currentMembers, newMember]
      });
      
      Alert.alert('Success', 'Member added!');
      setMemberName('');
      setMemberPhone('');
      setMemberRelation('Brother');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedCircleId) return;
    
    try {
      const circleDoc = doc(db, 'circles', selectedCircleId);
      const circleSnap = await circleDoc.get();
      const currentMembers = circleSnap.data()?.members || [];
      
      const updatedMembers = currentMembers.filter((m: any) => m.id !== memberId);
      await updateDoc(circleDoc, { members: updatedMembers });
      
      Alert.alert('Success', 'Member removed!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Create SOS Record (Test)
  const handleCreateSOS = async () => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'sosRecords'), {
        userId: user.uid,
        title: 'Test SOS',
        message: 'This is a test SOS record',
        location: {
          lat: -15.416667,
          lng: 28.283333,
          accuracy: 50
        },
        status: 'sent',
        createdAt: new Date(),
        resolved: false
      });
      
      Alert.alert('Success', 'Test SOS created!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Update Settings
  const handleToggleSetting = async (key: string) => {
    if (!user) return;
    
    const newSettings = { ...settings, [key]: !settings[key as keyof typeof settings] };
    setSettings(newSettings);
    
    try {
      const userDoc = doc(db, 'users', user.uid);
      await updateDoc(userDoc, { settings: newSettings });
      Alert.alert('Success', 'Settings updated!');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // Delete Account
  const handleDeleteAccount = async () => {
    if (!user) return;
    
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete user document
              const userDoc = doc(db, 'users', user.uid);
              await deleteDoc(userDoc);
              
              // Delete user's circles
              const circlesQuery = query(collection(db, 'circles'), where('ownerId', '==', user.uid));
              const circlesSnapshot = await circlesQuery.get();
              for (const doc of circlesSnapshot.docs) {
                await deleteDoc(doc.ref);
              }
              
              // Delete user's SOS records
              const sosQuery = query(collection(db, 'sosRecords'), where('userId', '==', user.uid));
              const sosSnapshot = await sosQuery.get();
              for (const doc of sosSnapshot.docs) {
                await deleteDoc(doc.ref);
              }
              
              // Delete auth account
              await user.delete();
              Alert.alert('Success', 'Account deleted!');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          }
        }
      ]
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <StyledText type="title" style={{ marginBottom: 20 }}>Test Page - Login/Create Account</StyledText>
        
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleCreateAccount}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Create Account</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StyledText type="title" style={{ marginBottom: 20 }}>SafeCircle Test Page</StyledText>
      <Text style={styles.subtitle}>User: {user.email}</Text>
      
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        
        <TextInput
          placeholder="First Name"
          value={firstName}
          onChangeText={setFirstName}
          style={styles.input}
        />
        
        <TextInput
          placeholder="Last Name"
          value={lastName}
          onChangeText={setLastName}
          style={styles.input}
        />
        
        <View style={styles.row}>
          <Text style={styles.label}>Gender:</Text>
          <TouchableOpacity
            style={styles.genderButton}
            onPress={() => setGender('Male')}
          >
            <Text style={gender === 'Male' ? styles.selectedGender : styles.genderText}>Male</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.genderButton}
            onPress={() => setGender('Female')}
          >
            <Text style={gender === 'Female' ? styles.selectedGender : styles.genderText}>Female</Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          placeholder="Base64 Profile Picture (optional)"
          value={profilePicture}
          onChangeText={setProfilePicture}
          style={styles.input}
          multiline
          numberOfLines={3}
        />
        
        {profilePicture ? (
          <Image
            source={{ uri: profilePicture }}
            style={styles.profileImage}
          />
        ) : null}
        
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleUpdateProfile}
        >
          <Text style={styles.buttonText}>Update Profile</Text>
        </TouchableOpacity>
      </View>
      
      {/* Circles Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Circles</Text>
        
        <TextInput
          placeholder="Circle Name"
          value={circleName}
          onChangeText={setCircleName}
          style={styles.input}
        />
        
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleCreateCircle}
        >
          <Text style={styles.buttonText}>Create Circle</Text>
        </TouchableOpacity>
        
        <FlatList
          horizontal
          data={circles}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.circleButton,
                selectedCircleId === item.id && styles.selectedCircle
              ]}
              onPress={() => {
                setSelectedCircleId(item.id);
                loadMembers(item.id);
              }}
            >
              <Text style={styles.circleButtonText}>{item.name}</Text>
              <Text style={styles.circleMemberCount}>{item.members?.length || 0} members</Text>
            </TouchableOpacity>
          )}
          style={styles.circleList}
        />
      </View>
      
      {/* Members Section */}
      {selectedCircleId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members ({members.length})</Text>
          
          <TextInput
            placeholder="Member Name"
            value={memberName}
            onChangeText={setMemberName}
            style={styles.input}
          />
          
          <TextInput
            placeholder="Member Phone (+260...)"
            value={memberPhone}
            onChangeText={setMemberPhone}
            style={styles.input}
          />
          
          <View style={styles.row}>
            <Text style={styles.label}>Relation:</Text>
            <TouchableOpacity
              style={styles.relationButton}
              onPress={() => setMemberRelation('Brother')}
            >
              <Text style={memberRelation === 'Brother' ? styles.selectedRelation : styles.relationText}>Brother</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.relationButton}
              onPress={() => setMemberRelation('Sister')}
            >
              <Text style={memberRelation === 'Sister' ? styles.selectedRelation : styles.relationText}>Sister</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.relationButton}
              onPress={() => setMemberRelation('Friend')}
            >
              <Text style={memberRelation === 'Friend' ? styles.selectedRelation : styles.relationText}>Friend</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleAddMember}
          >
            <Text style={styles.buttonText}>Add Member</Text>
          </TouchableOpacity>
          
          <FlatList
            data={members}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.memberCard}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberPhone}>{item.phone}</Text>
                  <Text style={styles.memberRelation}>{item.relation}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveMember(item.id)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}
      
      {/* SOS Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SOS Records ({sosRecords.length})</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleCreateSOS}
        >
          <Text style={styles.buttonText}>Create Test SOS</Text>
        </TouchableOpacity>
        
        <FlatList
          data={sosRecords}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <Text style={styles.recordTitle}>{item.title}</Text>
              <Text style={styles.recordDate}>
                {new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}
              </Text>
              {item.location && (
                <Text style={styles.recordLocation}>
                  📍 {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
                </Text>
              )}
            </View>
          )}
        />
      </View>
      
      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        {Object.entries(settings).map(([key, value]) => (
          <View key={key} style={styles.settingRow}>
            <Text style={styles.settingLabel}>
              {key.charAt(0).toUpperCase() + key.slice(1)}: {value ? 'Enabled' : 'Disabled'}
            </Text>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                value ? styles.toggleOn : styles.toggleOff
              ]}
              onPress={() => handleToggleSetting(key)}
            >
              <Text style={styles.toggleText}>{value ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      
      {/* Actions */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.buttonText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  subtitle: {
    color: '#666',
    marginBottom: 20,
    fontSize: 16,
  },
  section: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    flexWrap: 'wrap',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
    color: '#333',
  },
  genderButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  genderText: {
    fontSize: 14,
    color: '#666',
  },
  selectedGender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d32f2f',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginVertical: 10,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 5,
  },
  primaryButton: {
    backgroundColor: '#d32f2f',
  },
  secondaryButton: {
    backgroundColor: '#2196f3',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  circleList: {
    marginVertical: 15,
  },
  circleButton: {
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 120,
  },
  selectedCircle: {
    backgroundColor: '#bbdefb',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  circleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  circleMemberCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  relationButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  relationText: {
    fontSize: 14,
    color: '#666',
  },
  selectedRelation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d32f2f',
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  memberPhone: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 2,
  },
  memberRelation: {
    color: '#666',
    fontSize: 12,
  },
  removeButton: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '600',
  },
  recordCard: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  recordDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  recordLocation: {
    fontSize: 14,
    color: '#d32f2f',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  toggleButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: '#d32f2f',
  },
  toggleOff: {
    backgroundColor: '#ccc',
  },
  toggleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    marginTop: 'auto',
    paddingTop: 20,
  },
});