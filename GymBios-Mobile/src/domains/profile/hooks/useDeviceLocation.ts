import { useState } from 'react';
import * as Location from 'expo-location';

interface UseDeviceLocationResult {
  getCurrentLocation: () => Promise<string | null>;
  isFetchingLocation: boolean;
  error: string | null;
}

export function useDeviceLocation(): UseDeviceLocationResult {
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = async (): Promise<string | null> => {
    setIsFetchingLocation(true);
    setError(null);

    try {
      // 1. Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission was denied.');
        return null;
      }

      // 2. Get coordinates
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 3. Reverse geocode
      const [geocodedAddress] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (geocodedAddress) {
        // Construct a formatted address from the geocode result
        const parts = [
          geocodedAddress.streetNumber,
          geocodedAddress.street,
          geocodedAddress.city || geocodedAddress.subregion,
          geocodedAddress.region,
          geocodedAddress.postalCode,
          geocodedAddress.country,
        ].filter(Boolean);
        
        return parts.join(', ');
      }

      setError('Could not resolve address from coordinates.');
      return null;
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching location.');
      return null;
    } finally {
      setIsFetchingLocation(false);
    }
  };

  return { getCurrentLocation, isFetchingLocation, error };
}
