import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { DatePicker } from '@/shared/components/DatePicker';
import type { FollowUp } from '../../domain/FollowUp';

import { toast } from '@/shared/components/Toasts/toastStore';

interface RescheduleFollowUpSheetProps {
  visible: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onSubmit: (dueDate: string) => void;
  submitting?: boolean;
}

export function RescheduleFollowUpSheet({
  visible,
  followUp,
  onClose,
  onSubmit,
  submitting = false,
}: RescheduleFollowUpSheetProps) {
  const theme = useTheme();
  const [dueDate, setDueDate] = useState<Date | null>(new Date());

  useEffect(() => {
    if (visible && followUp) {
      setDueDate(followUp.dueDate ? new Date(followUp.dueDate) : new Date());
    }
  }, [visible, followUp]);

  const handleSubmit = () => {
    if (!dueDate) {
      toast.error('New due date is required.', {
        title: 'Validation Error'
      });
      return;
    }
    // Format to ISO date string (YYYY-MM-DD)
    const formattedDate = dueDate.toISOString().split('T')[0];
    onSubmit(formattedDate);
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
              Reschedule Follow-up
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.leadSubHeader, { color: theme.textSecondary }]}>
              Rescheduling follow-up for{' '}
              <Text style={{ color: theme.text, fontWeight: '700' }}>
                {followUp.leadName}
              </Text>
            </Text>

            <DatePicker
              label="New Due Date"
              required
              minimumDate={new Date()}
              value={dueDate}
              onChange={val => setDueDate(val)}
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
              style={[styles.submitBtn, { backgroundColor: BrandColors.teal }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting ? 'Rescheduling...' : 'Confirm New Date'}
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
