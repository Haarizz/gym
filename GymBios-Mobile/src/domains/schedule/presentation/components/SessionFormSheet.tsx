import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

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

export function SessionFormSheet({ visible, mode, initialData, onClose }: SessionFormSheetProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState('CLASS');
  const [date, setDate] = useState<Date | null>(new Date());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [price, setPrice] = useState('');

  const classTypes = useMemo(() => [
    { label: t('schedule.sessionForm.types.groupClass'), value: 'CLASS' },
    { label: t('schedule.sessionForm.types.pt'), value: 'PT' },
    { label: t('schedule.sessionForm.types.facility'), value: 'FACILITY' },
  ], [t]);

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
      alert(t('schedule.sessionForm.validationRequired'));
      return;
    }

    const payload: MobileSessionRequestDTO = {
      name,
      type,
      date: format(date, 'yyyy-MM-dd'),
      start_time: startTime,
      end_time: endTime,
      duration_minutes: 60,
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
          alert(t('schedule.sessionForm.createFailed', { message: err.message }));
        }
      });
    } else if (mode === 'edit' && initialData?.id) {
      updateMutation.mutate({ id: initialData.id, request: payload }, {
        onSuccess: () => {
          onClose();
        },
        onError: (err) => {
          alert(t('schedule.sessionForm.updateFailed', { message: err.message }));
        }
      });
    }
  };

  return (
    <AppBottomSheet
      visible={visible}
      title={mode === 'edit' ? t('schedule.sessionForm.rescheduleTitle') : t('schedule.sessionForm.addNewTitle')}
      subtitle={mode === 'edit' ? t('schedule.sessionForm.rescheduleSubtitle') : t('schedule.sessionForm.addNewSubtitle')}
      onClose={onClose}
    >
      <View style={styles.formContainer}>
        <Input
          label={t('schedule.sessionForm.className')}
          placeholder={t('schedule.sessionForm.classNamePlaceholder')}
          value={name}
          onChangeText={setName}
        />
        
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Dropdown
              label={t('schedule.sessionForm.classType')}
              value={type}
              options={classTypes}
              onChange={setType}
              required
            />
          </View>
          <View style={styles.halfWidth}>
            <DatePicker
              label={t('schedule.sessionForm.date')}
              value={date || undefined}
              onChange={setDate}
              required
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <TimePicker
              label={t('schedule.sessionForm.startTime')}
              value={startTime}
              onChange={setStartTime}
              required
            />
          </View>
          <View style={styles.halfWidth}>
            <TimePicker
              label={t('schedule.sessionForm.endTime')}
              value={endTime}
              onChange={setEndTime}
              required
            />
          </View>
        </View>

        <Input
          label={t('schedule.sessionForm.location')}
          placeholder={t('schedule.sessionForm.locationPlaceholder')}
          value={location}
          onChangeText={setLocation}
        />

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Input
              label={t('schedule.sessionForm.capacity')}
              placeholder="20"
              keyboardType="number-pad"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>
          <View style={styles.halfWidth}>
            <Input
              label={t('schedule.sessionForm.price')}
              placeholder="0"
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title={t('schedule.sessionForm.cancel')}
            variant="outline"
            onPress={onClose}
            style={styles.actionButton}
            disabled={isSubmitting}
          />
          <Button
            title={mode === 'edit' ? t('schedule.sessionForm.saveChanges') : t('schedule.sessionForm.createClass')}
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
