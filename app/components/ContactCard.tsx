// components/ContactCard.tsx
import { View, Text, TouchableOpacity } from 'react-native';

export default function ContactCard({ contact, onRemove }: { contact: any; onRemove: () => void }) {
  return (
    <View style={{ padding: 15, marginVertical: 5, backgroundColor: '#f8f8f8', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
      <View>
        <Text style={{ fontWeight: 'bold' }}>{contact.name}</Text>
        {contact.email && <Text>{contact.email}</Text>}
        {contact.phone && <Text>{contact.phone}</Text>}
      </View>
      <TouchableOpacity onPress={onRemove}>
        <Text style={{ color: 'red' }}>❌</Text>
      </TouchableOpacity>
    </View>
  );
}