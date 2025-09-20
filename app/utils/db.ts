// utils/db.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SOSPayload = {
  id: string;
  userId: string;
  createdAt: string;
  location: { lat: number; lng: number; accuracy?: number };
  status: 'queued' | 'sent';
  retryCount: number;
  lastAttemptAt?: string;
};

const QUEUE_KEY = 'pendingSOS';

export const getPendingSOS = async (): Promise<SOSPayload[]> => {
  try {
    const json = await AsyncStorage.getItem(QUEUE_KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.error('Failed to load queue', e);
    return [];
  }
};

export const addSOS = async (sos: SOSPayload) => {
  try {
    const queue = await getPendingSOS();
    queue.push(sos);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to add SOS to queue', e);
  }
};

export const removeSOS = async (id: string) => {
  try {
    const queue = await getPendingSOS();
    const newQueue = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
  } catch (e) {
    console.error('Failed to remove SOS from queue', e);
  }
};

export const updateSOS = async (id: string, updates: Partial<SOSPayload>) => {
  try {
    const queue = await getPendingSOS();
    const index = queue.findIndex(item => item.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (e) {
    console.error('Failed to update SOS in queue', e);
  }
};