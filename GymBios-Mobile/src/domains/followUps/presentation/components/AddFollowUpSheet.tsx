import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
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
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { useStaff } from '@/domains/hr/presentation/hooks/useStaff';
import { useLeads } from '@/domains/leads/hooks/useLeads';
import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import type { FollowUp } from '../../domain/FollowUp';
import type { FollowUpRequest } from '../../domain/FollowUpRequest';

interface AddFollowUpSheetProps {
  visible: boolean;
  editingFollowUp?: FollowUp | null;
  onClose: () => void;
  onSubmit: (request: FollowUpRequest) => void;
  submitting?: boolean;
}

const TYPE_OPTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'In-App', value: 'in-app' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Visit', value: 'visit' },
];

const PRIORITY_OPTIONS = [
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export function AddFollowUpSheet({
  visible,
  editingFollowUp,
  onClose,
  onSubmit,
  submitting = false,
}: AddFollowUpSheetProps) {
  const theme = useTheme();

  // Load leads and staff
  const { data: leadsData } = useLeads({ size: 100 });
  const { staff } = useStaff();

  const leadOptions = useMemo(() => {
    const leads = leadsData?.leads ?? [];
    return leads.map(l => ({
      label: `${l.firstName} ${l.lastName}`.trim() + (l.phone ? ` (${l.phone})` : ''),
      value: String(l.id),
    }));
  }, [leadsData]);

  const staffOptions = useMemo(() => {
    const list = (staff || []).map(s => ({
      label: s.name ? `${s.name}${s.role ? ` (${s.role})` : ''}` : s.email,
      value: s.name || s.email,
    }));
    return [{ label: 'Unassigned', value: '' }, ...list];
  }, [staff]);

  // Form states
  const [leadId, setLeadId] = useState('');
  const [type, setType] = useState('call');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [scheduledTime, setScheduledTime] = useState('');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('15');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editingFollowUp) {
      setLeadId(String(editingFollowUp.leadId));
      setType(editingFollowUp.type === 'in_app' ? 'in-app' : editingFollowUp.type);
      setSubject(editingFollowUp.subject || '');
      setPriority(editingFollowUp.priority || 'medium');
      setDueDate(editingFollowUp.dueDate ? new Date(editingFollowUp.dueDate) : new Date());
      setScheduledTime(editingFollowUp.scheduledTime || '');
      setAssignedStaff(editingFollowUp.assignedStaff || '');
      setEstimatedDuration(
        editingFollowUp.estimatedDuration ? String(editingFollowUp.estimatedDuration) : '15',
      );
      setNotes(editingFollowUp.notes || '');
    } else {
      setLeadId('');
      setType('call');
      setSubject('');
      setPriority('medium');
      setDueDate(new Date());
      setScheduledTime('');
      setAssignedStaff('');
      setEstimatedDuration('15');
      setNotes('');
    }
  }, [editingFollowUp, visible]);

  const handleSubmit = () => {
    if (!leadId) {
      Alert.alert('Validation Error', 'Please select a member or lead.');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Validation Error', 'Follow-up subject is required.');
      return;
    }
    if (!dueDate) {
      Alert.alert('Validation Error', 'Due date is required.');
      return;
    }

    const payload: FollowUpRequest = {
      leadId: Number(leadId),
      type,
      subject: subject.trim(),
      priority,
      dueDate: dueDate.toISOString(),
      scheduledTime: scheduledTime.trim() || undefined,
      assignedStaff: assignedStaff || undefined,
      estimatedDuration: estimatedDuration ? parseInt(estimatedDuration, 10) : 15,
      notes: notes.trim() || undefined,
    };

    onSubmit(payload);
  };

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
              {editingFollowUp ? 'Edit Follow-up' : 'Add Follow-up'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Dropdown
              label="Member / Lead"
              required
              placeholder="Select lead..."
              value={leadId}
              options={leadOptions}
              onChange={setLeadId}
            />

            <Dropdown
              label="Follow-up Type"
              value={type}
              options={TYPE_OPTIONS}
              onChange={setType}
            />

            <Text style={[styles.fieldLabel, { color: theme.text }]}>Subject *</Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Enter follow-up subject"
              placeholderTextColor={theme.textSecondary}
            />

            <Dropdown
              label="Priority"
              value={priority}
              options={PRIORITY_OPTIONS}
              onChange={setPriority}
            />

            <DatePicker
              label="Due Date"
              required
              value={dueDate}
              onChange={val => setDueDate(val)}
            />

            <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
              Scheduled Time
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={scheduledTime}
              onChangeText={setScheduledTime}
              placeholder="e.g. 10:00 AM"
              placeholderTextColor={theme.textSecondary}
            />

            <Dropdown
              label="Assigned Staff"
              placeholder="Select staff member..."
              value={assignedStaff}
              options={staffOptions}
              onChange={setAssignedStaff}
            />

            <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
              Estimated Duration (mins)
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={estimatedDuration}
              onChangeText={setEstimatedDuration}
              keyboardType="numeric"
              placeholder="15"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
              Notes
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
              placeholder="Enter any additional notes..."
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
              style={[styles.submitBtn, { backgroundColor: BrandColors.teal }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>
                {submitting
                  ? 'Saving...'
                  : editingFollowUp
                  ? 'Save Changes'
                  : 'Create Follow-up'}
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
    maxHeight: '90%',
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.one,
    marginTop: Spacing.two,
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    marginBottom: Spacing.two,
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
