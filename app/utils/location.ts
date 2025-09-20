// utils/location.ts
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const requestLocationPermission = async () => {
  let { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    alert('Permission to access location was denied');
    return false;
  }
  return true;
};

export const getLastKnownLocation = async () => {
  try {
    const loc = await AsyncStorage.getItem('lastKnownLocation');
    return loc ? JSON.parse(loc) : null;
  } catch (e) {
    console.error('Failed to fetch last location', e);
    return null;
  }
};

export const saveLastKnownLocation = async (loc: any) => {
  try {
    await AsyncStorage.setItem('lastKnownLocation', JSON.stringify(loc));
  } catch (e) {
    console.error('Failed to save location', e);
  }
};

export const getCurrentLocation = async () => {
  const granted = await requestLocationPermission();
  if (!granted) return null;

  try {
    const loc = await Location.getCurrentPositionAsync({});
    const locationData = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      ts: new Date().toISOString()
    };
    await saveLastKnownLocation(locationData);
    return locationData;
  } catch (e) {
    console.error('Location fetch error', e);
    return null;
  }
};