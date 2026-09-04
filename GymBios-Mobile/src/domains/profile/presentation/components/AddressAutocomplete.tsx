import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, TextInput } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import Constants from 'expo-constants';
import { Typography } from '@/shared/components';
import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { useDeviceLocation } from '../../hooks/useDeviceLocation';

const GOOGLE_PLACES_API_KEY = Constants.expoConfig?.extra?.googlePlacesApiKey || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  error?: string;
  label?: string;
}

export function AddressAutocomplete({ value, onChange, error, label = "Address" }: AddressAutocompleteProps) {
  const theme = useTheme();
  const { getCurrentLocation, isFetchingLocation, error: locationError } = useDeviceLocation();
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  // Sync internal state with external value if it changes externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const searchPlaces = async (text: string) => {
    setQuery(text);
    onChange(text); // Keep external state in sync with typing

    if (text.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    if (!GOOGLE_PLACES_API_KEY) {
      console.warn("Google Places API Key is missing.");
      return;
    }

    setIsSearching(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_PLACES_API_KEY}&language=en`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        setPredictions(data.predictions);
        setShowPredictions(true);
      } else {
        setPredictions([]);
      }
    } catch (e) {
      console.error(e);
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = async (placeId: string, description: string) => {
    setQuery(description);
    onChange(description);
    setShowPredictions(false);
    setPredictions([]);
    
    // Optionally fetch place details here if you need more than just the description string
    /*
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_PLACES_API_KEY}&fields=formatted_address`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.result?.formatted_address) {
        setQuery(data.result.formatted_address);
        onChange(data.result.formatted_address);
      }
    } catch (e) {
      console.error(e);
    }
    */
  };

  const handleUseCurrentLocation = async () => {
    const address = await getCurrentLocation();
    if (address) {
      setQuery(address);
      onChange(address);
      setShowPredictions(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography variant="bodySmallBold" style={styles.label}>
          {label}
        </Typography>
        <TouchableOpacity 
          style={styles.locationButton} 
          onPress={handleUseCurrentLocation}
          disabled={isFetchingLocation}
        >
          {isFetchingLocation ? (
            <ActivityIndicator size="small" color={BrandColors.teal} />
          ) : (
            <>
              <Feather name="navigation" size={14} color={BrandColors.teal} />
              <Typography variant="caption" style={{ color: BrandColors.teal, fontWeight: '600' }}>
                Use current location
              </Typography>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.inputContainer, error ? { borderColor: theme.error } : { borderColor: theme.border }, { backgroundColor: theme.backgroundElement }]}>
        <TextInput
          value={query}
          onChangeText={searchPlaces}
          placeholder="Search for your address"
          placeholderTextColor={theme.textSecondary}
          onFocus={() => {
            if (predictions.length > 0) setShowPredictions(true);
          }}
          onBlur={() => {
            // Small delay to allow touch event on prediction item to fire
            setTimeout(() => setShowPredictions(false), 200);
          }}
          style={[styles.input, { color: theme.text }]}
        />
        <View style={styles.searchIcon}>
          {isSearching ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            <Feather name="search" size={18} color={theme.textSecondary} />
          )}
        </View>
      </View>

      {showPredictions && predictions.length > 0 && (
        <View style={[styles.predictionsContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.predictionItem, { borderBottomColor: theme.border }]}
                onPress={() => handleSelectPlace(item.place_id, item.description)}
              >
                <Feather name="map-pin" size={14} color={theme.textSecondary} style={styles.predictionIcon} />
                <Typography variant="bodySmall" style={{ color: theme.text, flex: 1 }}>
                  {item.description}
                </Typography>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
      
      {(error || locationError) && (
        <Typography variant="caption" color="error" style={styles.errorText}>
          {error || locationError}
        </Typography>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    zIndex: 999, // To ensure autocomplete dropdown appears above other fields
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  label: {
    marginBottom: 0,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
    backgroundColor: BrandColors.screenBackgroundAlt,
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: Radius.md,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  searchIcon: {
    marginLeft: 8,
  },
  predictionsContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: Radius.md,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  predictionIcon: {
    marginRight: Spacing.two,
  },
  errorText: {
    marginTop: 4,
  },
});
