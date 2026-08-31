import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { format, parse } from 'date-fns';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Button, Input, Typography, DatePicker } from '@/shared/components';
import { Dropdown } from '@/shared/components/Dropdown/Dropdown';
import { TimePicker } from '@/shared/components/TimePicker/TimePicker';
import { useStaffClassesTrainers } from '../hooks/useStaffClasses';
import type { MobileStaffSessionRequestDTO } from '../../domain/StaffClassTypes';

interface StaffClassFormProps {
  initialValues?: Partial<MobileStaffSessionRequestDTO>;
  onSubmit: (values: MobileStaffSessionRequestDTO) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function StaffClassForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
}: StaffClassFormProps) {
  const theme = useTheme();
  
  const [name, setName] = useState(initialValues?.name ?? '');
  const [type, setType] = useState(initialValues?.type ?? '');
  const [trainerId, setTrainerId] = useState(initialValues?.trainerId?.toString() ?? '');
  const [date, setDate] = useState<Date | undefined>(
    initialValues?.date ? new Date(initialValues.date) : new Date()
  );
  
  const formatTime = (hhmmss: string) => {
    try {
      const d = parse(hhmmss, 'HH:mm:ss', new Date());
      return format(d, 'HH:mm');
    } catch {
      return hhmmss;
    }
  };
  
  const [startTime, setStartTime] = useState(initialValues?.startTime ? formatTime(initialValues.startTime) : '');
  const [endTime, setEndTime] = useState(initialValues?.endTime ? formatTime(initialValues.endTime) : '');
  
  const [location, setLocation] = useState(initialValues?.location ?? '');
  const [capacity, setCapacity] = useState(initialValues?.capacity?.toString() ?? '20');
  const [price, setPrice] = useState(initialValues?.price?.toString() ?? '0');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: trainers, isLoading: isTrainersLoading } = useStaffClassesTrainers();

  const handleCreate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Required';
    if (!type) newErrors.type = 'Required';
    if (!trainerId) newErrors.trainerId = 'Required';
    if (!date) newErrors.date = 'Required';
    if (!startTime) newErrors.startTime = 'Required';
    if (!endTime) newErrors.endTime = 'Required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Check if start time is before end time
    if (startTime && endTime) {
      const startParsed = parse(startTime, 'HH:mm', new Date());
      const endParsed = parse(endTime, 'HH:mm', new Date());
      if (startParsed >= endParsed) {
        setErrors({ endTime: 'Must be after start time' });
        return;
      }
    }

    setErrors({});

    onSubmit({
      name: name.trim(),
      type,
      trainerId: parseInt(trainerId, 10),
      date: format(date as Date, 'yyyy-MM-dd'),
      startTime: `${startTime}:00`,
      endTime: `${endTime}:00`,
      location: location.trim(),
      capacity: parseInt(capacity, 10) || 1,
      price: parseFloat(price) || 0,
    });
  };

  const classTypeOptions = [
    { label: 'Group Class', value: 'group_class' },
    { label: 'Private Session', value: 'private_session' },
    { label: 'Workshop', value: 'workshop' },
    { label: 'PT', value: 'pt' },
    { label: 'Yoga', value: 'yoga' },
    { label: 'Cardio', value: 'cardio' },
  ];

  const trainerOptions = (trainers ?? []).map(t => ({
    label: t.name,
    value: t.id,
  }));

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Typography variant="caption" style={styles.sectionLabel}>
          CLASS DETAILS
        </Typography>
        <View style={styles.card}>
          <Input
            label="Class Name"
            placeholder="e.g., Morning Yoga Flow"
            value={name}
            onChangeText={(text) => { setName(text); setErrors(prev => ({ ...prev, name: '' })); }}
            error={errors.name}
            containerStyle={styles.field}
          />

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Dropdown
                label="Class Type"
                placeholder="Select type"
                value={type}
                onChange={(val) => { setType(val); setErrors(prev => ({ ...prev, type: '' })); }}
                options={classTypeOptions}
                error={errors.type}
              />
            </View>
            <View style={styles.flex1}>
              <Dropdown
                label="Trainer"
                placeholder={isTrainersLoading ? "Loading..." : "Select trainer"}
                value={trainerId}
                onChange={(val) => { setTrainerId(val); setErrors(prev => ({ ...prev, trainerId: '' })); }}
                options={trainerOptions}
                error={errors.trainerId}
                disabled={isTrainersLoading}
              />
            </View>
          </View>
        </View>

        <Typography variant="caption" style={styles.sectionLabel}>
          DATE & TIME
        </Typography>
        <View style={styles.card}>
          <DatePicker
            label="Date"
            value={date}
            onChange={(d) => { setDate(d); setErrors(prev => ({ ...prev, date: '' })); }}
            error={errors.date}
            style={styles.field}
          />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={(t) => { setStartTime(t); setErrors(prev => ({ ...prev, startTime: '' })); }}
                error={errors.startTime}
              />
            </View>
            <View style={styles.flex1}>
              <TimePicker
                label="End Time"
                value={endTime}
                onChange={(t) => { setEndTime(t); setErrors(prev => ({ ...prev, endTime: '' })); }}
                error={errors.endTime}
              />
            </View>
          </View>
        </View>

        <Typography variant="caption" style={styles.sectionLabel}>
          LOCATION & CAPACITY
        </Typography>
        <View style={styles.card}>
          <Input
            label="Location"
            placeholder="e.g., Studio A"
            value={location}
            onChangeText={setLocation}
            containerStyle={styles.field}
          />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Capacity"
                keyboardType="numeric"
                value={capacity}
                onChangeText={setCapacity}
              />
            </View>
            <View style={styles.flex1}>
              <Input
                label="Price"
                keyboardType="numeric"
                leftIcon={<Typography variant="bodyMedium" style={{ color: theme.textSecondary }}>₹</Typography>}
                value={price}
                onChangeText={setPrice}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <Button
          variant="outline"
          style={styles.btnCancel}
          onPress={onCancel}
          disabled={isSubmitting}
          title="Cancel"
        />
        <Button
          style={styles.btnCreate}
          onPress={handleCreate}
          loading={isSubmitting}
          title={initialValues ? 'Save Changes' : 'Create Class'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF2F1', // From HTML visual reference (--bg)
  },
  scrollContent: {
    padding: Spacing.four,
    paddingBottom: Spacing.six + 80,
  },
  sectionLabel: {
    fontWeight: '700',
    color: '#1A6F61', // Teal-700
    letterSpacing: 0.4,
    marginBottom: Spacing.two,
    marginTop: Spacing.four,
    marginLeft: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#E2E8E6',
    shadowColor: '#0F2521',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  field: {
    marginBottom: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex1: {
    flex: 1,
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EEF2F1',
    padding: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.three,
  },
  btnCancel: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8E6',
  },
  btnCreate: {
    flex: 1,
    backgroundColor: '#1F8A76',
  },
});
