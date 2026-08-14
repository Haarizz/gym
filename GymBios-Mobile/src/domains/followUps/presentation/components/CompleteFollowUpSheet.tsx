import React, { useEffect, useState } from 'react';
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

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { Dropdown } from '@/shared/components/Dropdown';
import type { FollowUp } from '../../domain/FollowUp';

interface CompleteFollowUpSheetProps {
  visible: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onSubmit: (outcome: string, notes: string) => void;
  submitting?: boolean;
}

const OUTCOME_OPTIONS = [
  { label: 'Successful', value: 'successful' },
  { label: 'No Response', value: 'no-response' },
  { label: 'Callback Requested', value: 'callback-requested' },
  { label: 'Not Interested', value: 'not-interested' },
  { label: 'Converted', value: 'converted' },
  { label: 'Rescheduled', value: 'rescheduled' },
];

export function CompleteFollowUpSheet({
  visible,
  followUp,
  onClose,
  onSubmit,
  submitting = false,
}: CompleteFollowUpSheetProps) {
  const theme = useTheme();
  const [outcome, setOutcome] = useState('successful');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setOutcome('successful');
      setNotes('');
    }
  }, [visible]);

  const handleSubmit = () => {
    onSubmit(outcome, notes.trim());
  };

  if (!followUp) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalSheet, { backgroundColor: theme.background }]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Complete Follow-up
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.leadSubHeader, { color: theme.textSecondary }]}>
              Completing follow-up for{' '}
              <Text style={{ color: theme.text, fontWeight: '700' }}>
                {followUp.leadName}
              </Text>
            </Text>

            <Dropdown
              label="Outcome"
              value={outcome}
              options={OUTCOME_OPTIONS}
              onChange={setOutcome}
            />

            <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
              Completion Notes
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.multilineInput,
                { color: theme.text, borderColor: theme.border },
              ]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Record any details about the outcome..."
              placeholderTextColor={theme.textSecondary}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: '#16a34a' }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Completing...' : 'Mark Completed'}
              </Text>
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
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});
