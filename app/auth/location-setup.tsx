// app/auth/location-setup.tsx
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  StyleSheet, 
  Image, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { auth, db } from '../../firebaseConfig';
import { doc, updateDoc, getDoc, setDoc, collection, getDocs, addDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

// Predefined locations for Zambia
const PREDEFINED_LOCATIONS = [
  { city: 'Lusaka', towns: ['Chilenje', 'Kabulonga', 'Roma', 'Woodlands', 'Chelston', 'Garden', 'Meanwood', 'Olympia', 'PHI', 'Town Centre'] },
  { city: 'Kitwe', towns: ['Chimwemwe', 'Parklands', 'Riverside', 'Buchi', 'Ndeke', 'Kamitondo', 'Town Centre'] },
  { city: 'Ndola', towns: ['Kansenshi', 'Northrise', 'Masala', 'Pamodzi', 'Twapia', 'Town Centre'] },
  { city: 'Kabwe', towns: ['Makululu', 'Bwacha', 'Railway', 'Highridge', 'Town Centre'] },
  { city: 'Livingstone', towns: ['Dambwa', 'Linda', 'Maramba', 'Town Centre'] },
  { city: 'Chipata', towns: ['Kapata', 'Kasenengwa', 'Town Centre'] },
  { city: 'Solwezi', towns: ['Kyawama', 'Mutanda', 'Town Centre'] },
  { city: 'Kasama', towns: ['Twalumba', 'Town Centre'] },
  { city: 'Mongu', towns: ['Lealui', 'Town Centre'] },
  { city: 'Chingola', towns: ['Kasompe', 'Nchanga', 'Town Centre'] },
];

export default function LocationSetupScreen() {
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [customTown, setCustomTown] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showTownDropdown, setShowTownDropdown] = useState(false);
  const [showAddCityModal, setShowAddCityModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState(PREDEFINED_LOCATIONS);
  const router = useRouter();

  useEffect(() => {
    loadCustomLocations();
  }, []);

  const loadCustomLocations = async () => {
    try {
      // Load any custom locations added by users from Firestore
      const locationsSnapshot = await getDocs(collection(db, 'customLocations'));
      const customLocs: any[] = [];
      
      locationsSnapshot.forEach((doc) => {
        customLocs.push(doc.data());
      });

      if (customLocs.length > 0) {
        // Merge custom locations with predefined ones
        const mergedLocations = [...PREDEFINED_LOCATIONS];
        
        customLocs.forEach(customLoc => {
          const existingCity = mergedLocations.find(loc => loc.city === customLoc.city);
          if (existingCity) {
            // Add custom towns to existing city
            customLoc.towns.forEach((town: string) => {
              if (!existingCity.towns.includes(town)) {
                existingCity.towns.push(town);
              }
            });
          } else {
            // Add new city
            mergedLocations.push(customLoc);
          }
        });

        setLocations(mergedLocations);
      }
    } catch (error) {
      console.error('Error loading custom locations:', error);
    }
  };

  const handleAddCustomCity = async () => {
    if (!customCity.trim()) {
      Alert.alert('Error', 'Please enter a city name');
      return;
    }

    try {
      const newLocation = {
        city: customCity.trim(),
        towns: customTown.trim() ? [customTown.trim(), 'Town Centre'] : ['Town Centre'],
        addedBy: auth.currentUser?.uid,
        createdAt: new Date()
      };

      // Save to Firestore
      await addDoc(collection(db, 'customLocations'), newLocation);

      // Update local state
      setLocations([...locations, newLocation]);
      setSelectedCity(customCity.trim());
      setSelectedTown(customTown.trim() || 'Town Centre');
      
      setShowAddCityModal(false);
      setCustomCity('');
      setCustomTown('');
      
      Alert.alert('Success', 'Location added successfully!');
    } catch (error) {
      console.error('Error adding custom location:', error);
      Alert.alert('Error', 'Failed to add location');
    }
  };

  const handleSaveLocation = async () => {
    if (!selectedCity) {
      Alert.alert('Missing Information', 'Please select your city');
      return;
    }

    if (!selectedTown) {
      Alert.alert('Missing Information', 'Please select your town/area');
      return;
    }

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      // Update user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        currentCity: selectedCity,
        currentTown: selectedTown,
        locationSetupCompleted: true,
        updatedAt: new Date(),
      });

      // Navigate to dashboard
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      console.error('Location setup error:', error);
      Alert.alert('Error', 'Failed to save location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Location Setup?',
      'Setting your location helps emergency responders find you faster. Are you sure you want to skip?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)/dashboard')
        }
      ]
    );
  };

  const getAvailableTowns = () => {
    const cityData = locations.find(loc => loc.city === selectedCity);
    return cityData?.towns || [];
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="location" size={60} color="#d32f2f" />
          <Text style={styles.title}>Set Your Location</Text>
          <Text style={styles.subtitle}>
            Help emergency responders find you faster
          </Text>
        </View>

        {/* City Selection */}
<View style={[styles.inputContainer, { zIndex: 2 }]}>
  <Text style={styles.label}>City *</Text>
  <TouchableOpacity
    style={styles.dropdownButton}
    onPress={() => {
      setShowCityDropdown(!showCityDropdown);
      setShowTownDropdown(false); // Close town dropdown when opening city
    }}
    disabled={loading}
  >
    <Text style={selectedCity ? styles.selectedText : styles.placeholderText}>
      {selectedCity || 'Select your city'}
    </Text>
    <Ionicons 
      name={showCityDropdown ? 'chevron-up' : 'chevron-down'} 
      size={24} 
      color="#666" 
    />
  </TouchableOpacity>

  {showCityDropdown && (
    <View style={styles.dropdown}>
      <ScrollView 
        style={styles.dropdownScroll} 
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {locations.map((location, index) => (
          <TouchableOpacity
            key={index}
            style={styles.dropdownItem}
            onPress={() => {
              setSelectedCity(location.city);
              setSelectedTown('');
              setShowCityDropdown(false);
            }}
          >
            <Text style={styles.dropdownItemText}>{location.city}</Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={[styles.dropdownItem, styles.addNewItem]}
          onPress={() => {
            setShowCityDropdown(false);
            setShowAddCityModal(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color="#2196f3" />
          <Text style={styles.addNewText}>Add New City</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )}
</View>

        {/* Town Selection */}
{selectedCity && (
  <View style={[styles.inputContainer, { zIndex: 1 }]}>
    <Text style={styles.label}>Town / Area *</Text>
    <TouchableOpacity
      style={styles.dropdownButton}
      onPress={() => {
        setShowTownDropdown(!showTownDropdown);
        setShowCityDropdown(false); // Close city dropdown when opening town
      }}
      disabled={loading}
    >
      <Text style={selectedTown ? styles.selectedText : styles.placeholderText}>
        {selectedTown || 'Select your town/area'}
      </Text>
      <Ionicons 
        name={showTownDropdown ? 'chevron-up' : 'chevron-down'} 
        size={24} 
        color="#666" 
      />
    </TouchableOpacity>

    {showTownDropdown && (
      <View style={styles.dropdown}>
        <ScrollView 
          style={styles.dropdownScroll} 
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          {getAvailableTowns().map((town, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dropdownItem}
              onPress={() => {
                setSelectedTown(town);
                setShowTownDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>{town}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )}
  </View>
)}

        {/* Location Preview */}
        {selectedCity && selectedTown && (
          <View style={styles.previewContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.previewText}>
              {selectedTown}, {selectedCity}
            </Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleSaveLocation}
          disabled={loading || !selectedCity || !selectedTown}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue to Dashboard</Text>
          )}
        </TouchableOpacity>

        {/* Skip Button */}
        <TouchableOpacity 
          onPress={handleSkip} 
          style={styles.skipLink}
          disabled={loading}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Custom City Modal */}
      <Modal
        visible={showAddCityModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New City</Text>
            
            <TextInput
              placeholder="City name"
              value={customCity}
              onChangeText={setCustomCity}
              style={styles.modalInput}
            />
            
            <TextInput
              placeholder="Town/Area (optional)"
              value={customTown}
              onChangeText={setCustomTown}
              style={styles.modalInput}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddCityModal(false);
                  setCustomCity('');
                  setCustomTown('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalAddButton}
                onPress={handleAddCustomCity}
              >
                <Text style={styles.modalAddText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#fff',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  selectedText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdown: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
  addNewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f8f9fa',
  },
  addNewText: {
    fontSize: 16,
    color: '#2196f3',
    fontWeight: '600',
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  previewText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#d32f2f',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  skipText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalAddButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#d32f2f',
    alignItems: 'center',
  },
  modalAddText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});