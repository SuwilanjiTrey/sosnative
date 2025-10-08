import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TextInput, SafeAreaView } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

interface Member {
  id: string;
  name: string;
  phone: string;
}

const STORAGE_KEY = '@CIRCLE_MEMBERS_V2';

export default function MyCircleScreen() {
  const { circleId, circleName } = useLocalSearchParams<{ circleId: string; circleName: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => { loadMembers(); }, []);

  async function loadMembers() {
    const saved = await AsyncStorage.getItem(STORAGE_KEY + circleId);
    if (saved) setMembers(JSON.parse(saved));
  }

  async function saveMembers(newMembers: Member[]) {
    setMembers(newMembers);
    await AsyncStorage.setItem(STORAGE_KEY + circleId, JSON.stringify(newMembers));
  }

  function addMember() {
    if (!name.trim() || !phone.trim()) return;
    const newMember: Member = { id: Date.now().toString(), name, phone };
    const updated = [...members, newMember];
    saveMembers(updated);
    setName(''); setPhone(''); setShowModal(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Circle</Text>
        <MaterialIcons name="group" size={24} color="#333" />
      </View>

      <FlatList
        data={members}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No members yet. Add one to get started.</Text>}
        renderItem={({ item }) => (
          <View style={styles.memberCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person-circle" size={40} color="#666" style={{ marginRight: 10 }} />
              <View>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberPhone}>{item.phone}</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Ionicons name="call" size={22} color="#ff3b30" />
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Add Member</Text>
          <TextInput placeholder="Full name" value={name} onChangeText={setName} style={styles.input} />
          <TextInput placeholder="Phone number" value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" />
          <TouchableOpacity style={styles.saveBtn} onPress={addMember}>
            <Text style={styles.saveBtnText}>Add Member</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowModal(false)}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#000' },
  memberCard: {
    backgroundColor: '#f6f6f6',
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  memberName: { fontSize: 17, fontWeight: '600' },
  memberPhone: { color: '#666' },
  addButton: {
    position: 'absolute', bottom: 30, right: 25,
    backgroundColor: '#0066cc', width: 60, height: 60,
    borderRadius: 30, justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4
  },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 },
  modal: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f9f9f9' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: '#fff', borderColor: '#ccc', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  saveBtn: { backgroundColor: '#0066cc', padding: 15, borderRadius: 10 },
  saveBtnText: { color: '#fff', textAlign: 'center', fontWeight: 'bold' },
  cancelText: { textAlign: 'center', color: '#0066cc', marginTop: 10 }
});