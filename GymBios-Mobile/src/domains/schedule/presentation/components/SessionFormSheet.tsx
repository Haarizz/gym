import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { format, parse } from 'date-fns';

import { AppBottomSheet, Input, Button, Dropdown, DatePicker, TimePicker } from '@/shared/components';
import { Spacing } from '@/core/theme';
import type { TrainerSessionItem, MobileSessionRequestDTO } from '../../domain/TrainerScheduleData';
import { useCreateTrainerSession, useUpdateTrainerSession } from '../../hooks/useTrainerSchedule';

export interface SessionFormSheetProps {
  visible: boolean;
  mode: 'create' | 'edit';
  initialData?: TrainerSessionItem | null;
  onClose: () => void;
}

const CLASS_TYPES = [
  { label: 'Group Class', value: 'CLASS' },
  { label: 'Personal Training', value: 'PT' },
  { label: 'Facility Booking', value: 'FACILITY' },
];

export function SessionFormSheet({ visible, mode, initialData, onClose }: SessionFormSheetProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('CLASS');
  const [date, setDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');

  const createMutation = useCreateTrainerSession();
  const updateMutation = useUpdateTrainerSession();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (visible) {
      if (mode === 'edit' && initialData) {
        setName(initialData.name || '');
        setType(initialData.type || 'CLASS');
        setDate(initialData.date ? new Date(initialData.date) : new Date());
        setStartTime(initialData.rawStartTime ? initialData.rawStartTime.substring(0, 5) : '');
        setEndTime(initialData.rawEndTime ? initialData.rawEndTime.substring(0, 5) : '');
        setLocation(initialData.location || '');
        setCapacity(initialData.capacity ? String(initialData.capacity) : '');
        setPrice(initialData.price ? String(initialData.price) : '');
      } else {
        setName('');
        setType('CLASS');
        setDate(new Date());
        setStartTime('');
        setEndTime('');
        setLocation('');
        setCapacity('');
        setPrice('');
      }
    }
  }, [visible, mode, initialData]);

  const handleSubmit = () => {
    if (!name || !date || !startTime || !endTime) {
      // Basic presentation validation
      alert('Please fill out all required fields');
      return;
    }

    const payload: MobileSessionRequestDTO = {
      name,
      type,
      date: format(date, 'yyyy-MM-dd'),
      start_time: startTime,
      end_time: endTime,
      duration_minutes: 60, // Simplify for demo, ideally calculated from start/end
      location,
      capacity: parseInt(capacity, 10) || 0,
      price: parseFloat(price) || 0,
    };

    if (mode === 'create') {
      createMutation.mutate(payload, {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          alert(`Failed to create session: ${err.message}`);
        }
      });
    } else if (mode === 'edit' && initialData?.id) {
      updateMutation.mutate({ id: initialData.id, request: payload }, {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          alert(`Failed to update session: ${err.message}`);
        }
      });
    }
  };

  return (
    <AppBottomSheet
      visible={visible}
      title={mode === 'edit' ? 'Reschedule Class' : 'Add New Class'}
      subtitle={mode === 'edit' ? 'Update the class schedule details' : 'Create a new training class or session'}
      onClose={onClose}
    >
      <View style={styles.formContainer}>
        <Input
          label="Class Name"
          placeholder="e.g., Morning Yoga Flow"
          value={name}
          onChangeText={setName}
        />
        
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Dropdown
              label="Class Type"
              value={type}
              options={CLASS_TYPES}
              onChange={setType}
              required
            />
          </View>
          <View style={styles.halfWidth}>
            <DatePicker
              label="Date"
              value={date || undefined}
              onChange={setDate}
              required
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <TimePicker
              label="Start Time"
              value={startTime}
              onChange={setStartTime}
              required
            />
          </View>
          <View style={styles.halfWidth}>
            <TimePicker
              label="End Time"
              value={endTime}
              onChange={setEndTime}
              required
            />
          </View>
        </View>

        <Input
          label="Location"
          placeholder="e.g., Studio A"
          value={location}
          onChangeText={setLocation}
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Input
              label="Capacity"
              placeholder="20"
              keyboardType="number-pad"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>
          <View style={styles.halfWidth}>
            <Input
              label="Price"
              placeholder="0"
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            style={styles.actionButton}
            disabled={isSubmitting}
          />
          <Button
            title={mode === 'edit' ? 'Save Changes' : 'Create Class'}
            onPress={handleSubmit}
            loading={isSubmitting}
            style={styles.actionButton}
          />
        </View>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    gap: Spacing.four,
    paddingBottom: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  halfWidth: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  actionButton: {
    flex: 1,
  }
});
