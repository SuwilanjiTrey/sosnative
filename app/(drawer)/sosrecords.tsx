// app/(drawer)/sosrecords.tsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSOS } from '../../hooks/useSOS';
import { StyledText } from '../../components/StyledText';

export default function SOSRecordsScreen() {
  const { records, loading } = useSOS();

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.recordCard}>
      <Text style={styles.recordTitle}>Record {item.id.slice(0, 4)}</Text>
      <Text style={styles.recordDate}>
        {new Date(item.createdAt).toLocaleDateString('en-ZM', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })}
      </Text>
    </TouchableOpacity>
  );

  if (loading) return <Text style={{ padding: 20 }}>Loading...</Text>;

  return (
    <View style={styles.container}>
      <StyledText type="title" style={{ marginBottom: 20 }}>My Records</StyledText>
      <FlatList
        data={records}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 40 }}>No SOS records yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  recordCard: {
    padding: 20,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
  },
  recordTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  recordDate: {
    color: '#666',
    fontSize: 14,
  },
});