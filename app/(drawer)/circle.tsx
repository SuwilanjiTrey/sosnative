// app/(drawer)/circle.tsx
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useCircle } from '../../hooks/useCircle';
import { StyledText } from '../../components/StyledText';


export default function CircleScreen() {
  const { contacts, loading } = useCircle();

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.contactCard}>
      <Text style={styles.contactName}>{item.name}</Text>
      <Text style={styles.contactPhone}>{item.phone}</Text>
      <Text style={styles.contactRelation}>{item.relation || 'Member'}</Text>
    </View> 
  );

  if (loading) return <Text>Loading...</Text>;

  return (
    <View style={styles.container}>
      <StyledText type="title" style={{ marginBottom: 20 }}>My Circle</StyledText>
      <Text style={styles.subtitle}>Select your circle to manage it.</Text>

      <FlatList
        data={contacts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40 }}>No members added yet.</Text>
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    marginBottom: 20,
  },
  subtitle: {
    color: '#666',
    marginBottom: 20,
    fontSize: 14,
  },
  loadingText: {
    padding: 20,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
  },
  flatListContent: {
    paddingBottom: 80,
  },
  contactCard: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contactPhone: {
    color: '#d32f2f',
    fontSize: 14,
  },
  contactRelation: {
    color: '#666',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    backgroundColor: '#d32f2f',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 28,
  },

});