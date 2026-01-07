// app/responder/dashboard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { StyledText } from '../../components/StyledText';





interface SOS {
  id: string;
  madeBy: string;
  location: {
    latitude: number;
    longitude: number;
  };
  information: string;
  contact: string;
  status: 'active' | 'responding' | 'resolved';
  createdAt: Date;
}

export default function ResponderDashboard() {
  const [sosList, setSosList] = useState<SOS[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responderData, setResponderData] = useState<any>(null);
  const router = useRouter();
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) {
      console.log("No current user");
      setError("No authenticated user found");
      setLoading(false);
      return;
    }

    console.log("Current user UID:", currentUser.uid);

    // First, verify this user is actually a responder
    const verifyResponder = async () => {
      try {
        const responderDoc = await getDoc(doc(db, "Responders", currentUser.uid));
        if (responderDoc.exists()) {
          console.log("Responder data:", responderDoc.data());
          setResponderData(responderDoc.data());
          
          // Now fetch SOS data
          fetchSOSData();
        } else {
          console.log("User is not a responder");
          setError("This account is not registered as a responder");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error verifying responder:", err);
        setError("Failed to verify responder account");
        setLoading(false);
      }
    };

    verifyResponder();
  }, [currentUser]);


  const fetchSOSData = () => {
    if (!currentUser) return;

    console.log("Fetching SOS data for responder:", currentUser.uid);

    // Subscribe to SOS updates
    const unsubscribe = onSnapshot(
      query(collection(db, "Responders", currentUser.uid, "SOS")),
      (snapshot) => {
        console.log("SOS snapshot received, size:", snapshot.size);
        const sosData: SOS[] = [];
        snapshot.forEach((doc) => {
          console.log("SOS document:", doc.id, doc.data());
          sosData.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
          } as SOS);
        });
        setSosList(sosData);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error("Error fetching SOS data:", error);
        setError("Failed to fetch emergency alerts: " + error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  };

  const handleRespondToSOS = async (sosId: string) => {
    try {
      // Update SOS status to responding
      await updateDoc(doc(db, "Responders", currentUser!.uid, "SOS", sosId), {
        status: 'responding'
      });
      
      // Navigate to map view
      router.push(`/responder/map/${sosId}`);
    } catch (error) {
      console.error("Error updating SOS status:", error);
      Alert.alert("Error", "Failed to update SOS status. Please try again.");
    }
  };

  const renderSOSItem = ({ item }: { item: SOS }) => (
    <View style={styles.sosItem}>
      <View style={styles.sosHeader}>
        <StyledText type="subtitle" style={styles.sosTitle}>
          Emergency Alert
        </StyledText>
        <View style={[styles.statusBadge, { 
          backgroundColor: item.status === 'active' ? '#ff5252' : 
                          item.status === 'responding' ? '#ff9800' : '#4caf50' 
        }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <Text style={styles.sosInfo}>Contact: {item.contact}</Text>
      <Text style={styles.sosInfo}>
        Information: {item.information || 'No additional information provided'}
      </Text>
      <Text style={styles.sosInfo}>
        Time: {item.createdAt.toLocaleString()}
      </Text>
      
      {item.status === 'active' && (
        <TouchableOpacity 
          style={styles.respondButton}
          onPress={() => handleRespondToSOS(item.id)}
        >
          <Text style={styles.respondButtonText}>Respond to Emergency</Text>
        </TouchableOpacity>
      )}
      
      {item.status === 'responding' && (
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => router.push(`/responder/map/${item.id}`)}
        >
          <Text style={styles.viewButtonText}>View on Map</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Debug information
  if (process.env.NODE_ENV === 'development') {
    console.log("Dashboard state:", { loading, error, sosListLength: sosList.length, responderData });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <StyledText type="title">Responder Dashboard</StyledText>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => {
            auth.signOut();
            router.replace('/auth/login');
          }}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      
      {responderData && (
        <View style={styles.responderInfo}>
          <Text style={styles.responderName}>{responderData.institutionName}</Text>
          <Text style={styles.responderBranch}>{responderData.branch}</Text>
        </View>
      )}
        



      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading emergency alerts...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              setError(null);
              fetchSOSData();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : sosList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text>No active emergencies at the moment.</Text>
        </View>
      ) : (
        <FlatList
          data={sosList}
          renderItem={renderSOSItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  logoutButton: {
    padding: 8,
    backgroundColor: '#d32f2f',
    borderRadius: 6,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  responderInfo: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  responderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
  },
  responderBranch: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#2196f3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContainer: {
    padding: 16,
  },
  sosItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sosTitle: {
    color: '#d32f2f',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sosInfo: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
  },
  respondButton: {
    backgroundColor: '#d32f2f',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  respondButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  viewButton: {
    backgroundColor: '#2196f3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});