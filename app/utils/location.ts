// app/utils/location.ts
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

export const getCurrentLocation = async (): Promise<LocationCoords | null> => {
  try {
    console.log('Starting location fetch...', 'Platform:', Platform.OS);
    
    // For web, use browser's native geolocation API
    if (Platform.OS === 'web') {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          console.error('Geolocation not supported by browser');
          reject(new Error('Geolocation not supported'));
          return;
        }

        console.log('Using browser geolocation API...');
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Browser location success:', {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            });
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          },
          (error) => {
            console.error('Browser geolocation error:', error);
            
            // Try fallback to IP-based geolocation
            console.log('Trying IP-based geolocation fallback...');
            fetch('https://ipapi.co/json/')
              .then(response => response.json())
              .then(data => {
                if (data.latitude && data.longitude) {
                  console.log('IP geolocation success:', {
                    lat: data.latitude,
                    lng: data.longitude,
                    city: data.city
                  });
                  resolve({
                    lat: data.latitude,
                    lng: data.longitude,
                    accuracy: 5000, // IP-based is less accurate
                  });
                } else {
                  reject(new Error('IP geolocation failed'));
                }
              })
              .catch(ipError => {
                console.error('IP geolocation error:', ipError);
                reject(error);
              });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        );
      });
    }
    
    // For mobile (iOS/Android), use expo-location
    console.log('Using expo-location for mobile...');
    const { status } = await Location.requestForegroundPermissionsAsync();
    console.log('Location permission status:', status);
    
    if (status !== 'granted') {
      console.error('Location permission denied');
      return null;
    }

    console.log('Fetching current position...');
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      maximumAge: 10000,
      timeout: 15000,
    });

    console.log('Location fetched successfully:', {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy
    });

    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy || undefined,
    };
  } catch (error) {
    console.error('Location fetch error:', error);
    
    // Try fallback method with last known location (mobile only)
    if (Platform.OS !== 'web') {
      try {
        console.log('Trying fallback: last known location...');
        const lastKnown = await Location.getLastKnownPositionAsync({
          maxAge: 300000,
        });
        
        if (lastKnown) {
          console.log('Using last known location:', {
            lat: lastKnown.coords.latitude,
            lng: lastKnown.coords.longitude,
          });
          
          return {
            lat: lastKnown.coords.latitude,
            lng: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy || undefined,
          };
        }
      } catch (fallbackError) {
        console.error('Fallback location error:', fallbackError);
      }
    }
    
    return null;
  }
};

// Alternative function that returns a promise with better error handling
export const getLocationWithRetry = async (retries = 3): Promise<LocationCoords | null> => {
  for (let i = 0; i < retries; i++) {
    console.log(`Location attempt ${i + 1} of ${retries}`);
    const location = await getCurrentLocation();
    
    if (location) {
      return location;
    }
    
    // Wait 2 seconds before retry
    if (i < retries - 1) {
      console.log('Waiting 2 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.error('All location attempts failed');
  return null;
};

// Function to watch location changes
export const watchLocation = (
  onLocationChange: (location: LocationCoords) => void,
  onError?: (error: Error) => void
) => {
  let subscription: Location.LocationSubscription | null = null;
  let watchId: number | null = null;

  const startWatching = async () => {
    try {
      // For web, use browser's watchPosition
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          throw new Error('Geolocation not supported');
        }

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            onLocationChange({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy || undefined,
            });
          },
          (error) => {
            console.error('Watch location error:', error);
            if (onError) {
              onError(error as any);
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        );
        return;
      }

      // For mobile
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        throw new Error('Location permission not granted');
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 50,
        },
        (location) => {
          onLocationChange({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
          });
        }
      );
    } catch (error) {
      console.error('Error watching location:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  };

  startWatching();

  // Return cleanup function
  return () => {
    if (subscription) {
      subscription.remove();
    }
    if (watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId);
    }
  };
};

// Check if location services are enabled
export const isLocationEnabled = async (): Promise<boolean> => {
  try {
    if (Platform.OS === 'web') {
      return !!navigator.geolocation;
    }
    
    const enabled = await Location.hasServicesEnabledAsync();
    console.log('Location services enabled:', enabled);
    return enabled;
  } catch (error) {
    console.error('Error checking location services:', error);
    return false;
  }
};