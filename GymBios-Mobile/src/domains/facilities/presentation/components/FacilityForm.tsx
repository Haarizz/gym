import { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing, Radius, BottomTabInset } from '@/core/theme';
import type { Facility, FacilityRequest } from '../../domain/Facility';

interface FacilityFormProps {
  initialData?: Facility;
  onSubmit: (data: FacilityRequest) => void;
  isSubmitting?: boolean;
}

const RATE_TYPES = ['Per Hour', 'Per Half Day', 'Per Full Day', 'Per Month'];

export function FacilityForm({ initialData, onSubmit, isSubmitting }: FacilityFormProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [iconName, setIconName] = useState(initialData?.iconName || 'box');
  const [occupancyLimit, setOccupancyLimit] = useState(
    initialData?.occupancyLimit ? String(initialData.occupancyLimit) : ''
  );
  const [isActive, setIsActive] = useState(initialData?.status !== 'Inactive');
  
  const [rates, setRates] = useState<Record<string, string>>(() => {
    const initRates: Record<string, string> = {};
    if (initialData?.rates) {
      Object.entries(initialData.rates).forEach(([k, v]) => {
        initRates[k] = String(v);
      });
    }
    return initRates;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleToggleRate = (type: string) => {
    setRates(prev => {
      const next = { ...prev };
      if (next[type] !== undefined) {
        delete next[type];
      } else {
        next[type] = ''; // activate it with empty string
      }
      return next;
    });
  };

  const handleRateChange = (type: string, val: string) => {
    setRates(prev => ({ ...prev, [type]: val }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (occupancyLimit && isNaN(Number(occupancyLimit))) {
      newErrors.occupancyLimit = 'Must be a number';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const parsedRates: Record<string, number> = {};
    Object.entries(rates).forEach(([k, v]) => {
      if (v.trim() !== '' && !isNaN(Number(v))) {
        parsedRates[k] = Number(v);
      }
    });

    onSubmit({
      name,
      description,
      iconName,
      occupancyLimit: occupancyLimit ? Number(occupancyLimit) : undefined,
      status: isActive ? 'Active' : 'Inactive',
      rates: Object.keys(parsedRates).length > 0 ? parsedRates : undefined,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Input
        label="Facility Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Yoga Studio"
        error={errors.name}
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Brief description of the facility"
        multiline
        style={styles.textArea}
      />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Input
            label="Occupancy Limit"
            value={occupancyLimit}
            onChangeText={setOccupancyLimit}
            placeholder="e.g. 20"
            keyboardType="numeric"
            error={errors.occupancyLimit}
          />
        </View>
        <View style={styles.flex1}>
          <Input
            label="Icon Name (Feather)"
            value={iconName}
            onChangeText={setIconName}
            placeholder="e.g. box, map-pin"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Typography variant="bodySmallBold" style={styles.label}>
          Status
        </Typography>
        <View style={styles.switchRow}>
          <Typography variant="body" color={isActive ? 'text' : 'textSecondary'}>
            {isActive ? 'Active' : 'Inactive'}
          </Typography>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: '#d1d5db', true: '#34d399' }}
            thumbColor={isActive ? '#10b981' : '#f3f4f6'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Typography variant="bodySmallBold" style={styles.label}>
          Pricing Configuration
        </Typography>
        {RATE_TYPES.map(type => {
          const isEnabled = rates[type] !== undefined;
          return (
            <View key={type} style={styles.rateCard}>
              <TouchableOpacity style={styles.rateHeader} onPress={() => handleToggleRate(type)}>
                <Feather 
                  name={isEnabled ? "check-square" : "square"} 
                  size={20} 
                  color={isEnabled ? BrandColors.teal : BrandColors.textSecondary} 
                />
                <Typography variant="body">{type}</Typography>
              </TouchableOpacity>
              
              {isEnabled && (
                <View style={styles.rateInputContainer}>
                  <Input
                    placeholder="Rate (e.g. 50)"
                    value={rates[type]}
                    onChangeText={(val) => handleRateChange(type, val)}
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>

      <Button
        label={initialData ? "Save Changes" : "Create Facility"}
        onPress={handleSubmit}
        loading={isSubmitting}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  textArea: {
    height: 80,
    paddingTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex1: {
    flex: 1,
  },
  section: {
    gap: Spacing.two,
  },
  label: {
    marginBottom: Spacing.one,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rateCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: Spacing.two,
  },
  rateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  rateInputContainer: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  submitBtn: {
    marginTop: Spacing.two,
  },
});
