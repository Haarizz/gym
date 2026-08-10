import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

import { Spacing, BottomTabInset } from '@/core/theme';
import { Input } from '@/shared/components/Input';
import { Dropdown } from '@/shared/components/Dropdown';
import { DatePicker } from '@/shared/components/DatePicker';
import { Button } from '@/shared/components/Button';

import type { CreateTrainingStreamRequest } from '../../application/TrainingStreamRepository';
import { useStaff } from '@/domains/hr/presentation/hooks/useStaff';

interface TrainingStreamFormProps {
  initialValues?: Partial<CreateTrainingStreamRequest>;
  onSubmit: (values: CreateTrainingStreamRequest) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
  isUpload?: boolean;
}

export function TrainingStreamForm({
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = 'Save',
  isUpload = false,
}: TrainingStreamFormProps) {
  const { staff } = useStaff();

  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [category, setCategory] = useState(initialValues?.category || '');
  const [difficulty, setDifficulty] = useState(initialValues?.difficulty || '');
  const [instructorId, setInstructorId] = useState<number | undefined>(initialValues?.instructorId);
  const [maxParticipants, setMaxParticipants] = useState(initialValues?.maxParticipants?.toString() || '');
  const [duration, setDuration] = useState(initialValues?.duration?.toString() || '');
  
  // Date time
  const initialDate = initialValues?.scheduledTime ? new Date(initialValues.scheduledTime) : undefined;
  const [scheduledTime, setScheduledTime] = useState<Date | undefined>(initialDate);

  // Upload specific
  const [streamUrl, setStreamUrl] = useState(initialValues?.streamUrl || '');

  const instructorOptions = staff.map((s) => ({
    label: s.name,
    value: s.id.toString(),
  }));

  const categoryOptions = [
    { label: 'Yoga', value: 'Yoga' },
    { label: 'HIIT', value: 'HIIT' },
    { label: 'Strength', value: 'Strength' },
    { label: 'Cardio', value: 'Cardio' },
    { label: 'Pilates', value: 'Pilates' },
    { label: 'Other', value: 'Other' },
  ];

  const difficultyOptions = [
    { label: 'Beginner', value: 'Beginner' },
    { label: 'Intermediate', value: 'Intermediate' },
    { label: 'Advanced', value: 'Advanced' },
    { label: 'All Levels', value: 'All Levels' },
  ];

  const handleSubmit = () => {
    onSubmit({
      title,
      description,
      category,
      difficulty,
      instructorId,
      maxParticipants: maxParticipants ? parseInt(maxParticipants, 10) : undefined,
      duration: duration ? parseInt(duration, 10) : undefined,
      scheduledTime: scheduledTime?.toISOString(),
      streamUrl: streamUrl || undefined,
      streamType: isUpload ? 'VOD' : 'LIVE',
      status: isUpload ? 'COMPLETED' : 'SCHEDULED',
    });
  };

  const isFormValid = title && category && instructorId;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Input
        label="Title *"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Morning HIIT"
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Describe the stream..."
        multiline
        style={styles.multilineInput}
      />

      <Dropdown
        label="Instructor"
        value={instructorId?.toString()}
        onChange={(val) => setInstructorId(Number(val))}
        options={instructorOptions}
        placeholder="Select instructor"
        required
      />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Dropdown
            label="Category"
            value={category}
            onChange={setCategory}
            options={categoryOptions}
            required
          />
        </View>
        <View style={styles.flex1}>
          <Dropdown
            label="Difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={difficultyOptions}
          />
        </View>
      </View>

      {!isUpload && (
        <DatePicker
          label="Scheduled Time"
          value={scheduledTime || null}
          onChange={(date) => setScheduledTime(date || undefined)}
          mode="date"
          required
        />
      )}

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Input
            label="Duration (min)"
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            placeholder="e.g. 45"
          />
        </View>
        <View style={styles.flex1}>
          <Input
            label="Max Participants"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="number-pad"
            placeholder="e.g. 100"
          />
        </View>
      </View>

      {isUpload && (
        <Input
          label="Recording URL *"
          value={streamUrl}
          onChangeText={setStreamUrl}
          placeholder="https://..."
        />
      )}

      <Button
        label={submitLabel}
        onPress={handleSubmit}
        loading={loading}
        disabled={!isFormValid}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  flex1: {
    flex: 1,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: Spacing.four,
  },
});
