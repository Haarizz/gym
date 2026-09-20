import { useState } from 'react';
import * as Location from 'expo-location';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface UseNearbyDistanceResult {
  coords: Coordinates | null;
  locationLabel: string | null;
  isLocating: boolean;
  permissionDenied: boolean;
  requestLocation: () => Promise<Coordinates | null>;
}

export function useNearbyDistance(): UseNearbyDistanceResult {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const requestLocation = async (): Promise<Coordinates | null> => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return null;
      }

      setPermissionDenied(false);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCoords = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoords(nextCoords);

      try {
        const [place] = await Location.reverseGeocodeAsync(nextCoords);
        if (place) {
          const label = [place.city || place.subregion, place.region].filter(Boolean).join(', ');
          setLocationLabel(label || null);
        }
      } catch {
        // Distance sort/filtering only needs the coordinates — a failed reverse
        // geocode just means the button keeps showing "Use My Location" instead
        // of a resolved place name.
      }

      return nextCoords;
    } catch {
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  return { coords, locationLabel, isLocating, permissionDenied, requestLocation };
}
