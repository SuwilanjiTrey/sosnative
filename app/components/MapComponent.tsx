// components/MapComponent.tsx
import { Platform } from 'react-native';
import WebMapPlaceholder from './WebMapPlaceholder';

// Only import react-native-maps on native platforms
let MapViewComponent: any = null;
let MarkerComponent: any = null;

if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapViewComponent = maps.default;
    MarkerComponent = maps.Marker;
  } catch (error) {
    console.warn('react-native-maps not available');
  }
}

export function MapView({ children, ...props }: any) {
  if (Platform.OS === 'web' || !MapViewComponent) {
    return null; // Return null on web
  }
  return <MapViewComponent {...props}>{children}</MapViewComponent>;
}

export function Marker({ ...props }: any) {
  if (Platform.OS === 'web' || !MarkerComponent) {
    return null; // Return null on web
  }
  return <MarkerComponent {...props} />;
}

export { WebMapPlaceholder };