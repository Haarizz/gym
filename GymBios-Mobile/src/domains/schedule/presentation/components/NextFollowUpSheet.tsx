import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { addDays, format, startOfDay } from 'date-fns';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { DatePicker, Dropdown, TimePicker } from '@/shared/components';
import type { NextFollowUpRequest } from '../../infrastructure/ApiStaffScheduleRepository';

const TYPE_OPTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'SMS', value: 'sms' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Visit', value: 'visit' },
];

interface NextFollowUpSheetProps {
  visible: boolean;
  leadName: string;
  onSkip: () => void;
  onSubmit: (request: NextFollowUpRequest) => void;
  submitting?: boolean;
}

/**
 * Shown after completing a follow-up that didn't close the lead — books the next touchpoint.
 * Mount it only while needed so each opening starts from fresh defaults.
 */
export function NextFollowUpSheet({
  visible,
  leadName,
  onSkip,
  onSubmit,
  submitting = false,
}: NextFollowUpSheetProps) {
  const theme = useTheme();
  const [date, setDate] = useState<Date | null>(() => addDays(startOfDay(new Date()), 1));
  const [time, setTime] = useState('10:00');
  const [type, setType] = useState('call');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!date) return;
    onSubmit({
      dueDate: format(date, 'yyyy-MM-dd'),
      scheduledTime: time || undefined,
      type,
      subject: 'Follow-up',
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onSkip}>
      <Pressable style={styles.modalOverlay} onPress={onSkip}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: theme.background }]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Schedule Next Follow-up</Text>
            <TouchableOpacity onPress={onSkip}>
              <Feather name="x" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            <Text style={[styles.leadSubHeader, { color: theme.textSecondary }]}>
              When should you next contact{' '}
              <Text style={{ color: theme.text, fontWeight: '700' }}>{leadName}</Text>?
            </Text>

            <View style={styles.fields}>
              <DatePicker
                label="Date"
                value={date}
                onChange={setDate}
                minimumDate={startOfDay(new Date())}
                required
              />
              <TimePicker label="Time" value={time} onChange={setTime} />
              <Dropdown label="Type" value={type} options={TYPE_OPTIONS} onChange={setType} />

              <View>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput, { color: theme.text, borderColor: theme.border }]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                  placeholder="What to discuss next time..."
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.skipBtn, { borderColor: theme.border }]}
              onPress={onSkip}
              disabled={submitting}
            >
              <Text style={[styles.skipBtnText, { color: theme.textSecondary }]}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!date || submitting) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!date || submitting}
            >
              <Text style={styles.submitBtnText}>{submitting ? 'Scheduling...' : 'Schedule'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.four,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: Spacing.four,
  },
  leadSubHeader: {
    fontSize: 14,
    marginBottom: Spacing.three,
  },
  fields: {
    gap: Spacing.three,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.one,
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
  },
  multilineInput: {
    height: 80,
    paddingTop: Spacing.two,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  skipBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.teal,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
