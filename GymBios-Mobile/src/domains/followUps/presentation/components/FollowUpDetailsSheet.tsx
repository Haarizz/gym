import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { Dropdown } from '@/shared/components/Dropdown';
import type { CommunicationRecord, FollowUp } from '../../domain/FollowUp';
import {
  useAddCommunicationRecord,
  useDeleteCommunicationRecord,
} from '../../hooks/useFollowUpMutations';
import { useFollowUp } from '../../hooks/useFollowUps';

import { toast } from '@/shared/components/Toasts/toastStore';

interface FollowUpDetailsSheetProps {
  visible: boolean;
  followUpId: number | null;
  onClose: () => void;
  onEdit?: (followUp: FollowUp) => void;
  onDelete?: (followUp: FollowUp) => void;
  onComplete?: (followUp: FollowUp) => void;
  onReschedule?: (followUp: FollowUp) => void;
  onCancel?: (followUp: FollowUp) => void;
}

const RECORD_TYPE_OPTIONS = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'SMS', value: 'sms' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Visit', value: 'visit' },
];

const OUTCOME_OPTIONS = [
  { label: 'Successful', value: 'successful' },
  { label: 'No Response', value: 'no-response' },
  { label: 'Callback Requested', value: 'callback-requested' },
  { label: 'Not Interested', value: 'not-interested' },
  { label: 'Converted', value: 'converted' },
  { label: 'Rescheduled', value: 'rescheduled' },
];

export function FollowUpDetailsSheet({
  visible,
  followUpId,
  onClose,
  onEdit,
  onDelete,
  onComplete,
  onReschedule,
  onCancel,
}: FollowUpDetailsSheetProps) {
  const theme = useTheme();

  // Detail query hook (uses cached list item as placeholder)
  const { data: followUp, isLoading } = useFollowUp(followUpId ?? 0);

  // Communication Record Mutations
  const addRecordMutation = useAddCommunicationRecord();
  const deleteRecordMutation = useDeleteCommunicationRecord();

  // Add Record Modal state
  const [addRecordVisible, setAddRecordVisible] = useState(false);
  const [recordType, setRecordType] = useState('call');
  const [recordOutcome, setRecordOutcome] = useState('successful');
  const [recordStaff, setRecordStaff] = useState('');
  const [recordDuration, setRecordDuration] = useState('15');
  const [recordNotes, setRecordNotes] = useState('');
  const [recordNextAction, setRecordNextAction] = useState('');

  if (!visible || !followUpId) return null;

  const handleCall = () => {
    if (!followUp?.leadPhone) {
      toast.info('No phone number available.', {
        title: 'No Phone'
      });
      return;
    }
    Linking.openURL(`tel:${followUp.leadPhone.replace(/\s+/g, '')}`);
  };

  const handleEmail = () => {
    if (!followUp?.leadEmail) {
      toast.info('No email address available.', {
        title: 'No Email'
      });
      return;
    }
    Linking.openURL(`mailto:${followUp.leadEmail}`);
  };

  const handleAddRecordSubmit = () => {
    if (!recordNotes.trim()) {
      toast.error('Notes are required for communication record.', {
        title: 'Validation Error'
      });
      return;
    }

    addRecordMutation.mutate(
      {
        id: followUpId,
        record: {
          type: recordType,
          date: new Date().toISOString(),
          staffMember: recordStaff.trim() || undefined,
          duration: recordDuration ? parseInt(recordDuration, 10) : undefined,
          outcome: recordOutcome,
          notes: recordNotes.trim(),
          nextAction: recordNextAction.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setAddRecordVisible(false);
          setRecordNotes('');
          setRecordNextAction('');
        },
        onError: err => {
          toast.error(err.message || 'Failed to add communication record.', {
            title: 'Error'
          });
        },
      },
    );
  };

  const handleDeleteRecord = (record: CommunicationRecord) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this communication record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteRecordMutation.mutate({
              followUpId,
              recordId: record.id,
            });
          },
        },
      ],
    );
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
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {followUp?.subject || 'Follow-up Details'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                {followUp?.leadName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          {isLoading && !followUp ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BrandColors.teal} />
            </View>
          ) : followUp ? (
            <ScrollView style={styles.modalBody}>
              {/* Member Contact Quick Actions */}
              <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Member Info</Text>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  Name: <Text style={{ color: theme.text, fontWeight: '600' }}>{followUp.leadName}</Text>
                </Text>

                {followUp.leadPhone ? (
                  <TouchableOpacity onPress={handleCall} style={styles.contactRow}>
                    <Feather name="phone" size={14} color={BrandColors.teal} />
                    <Text style={[styles.contactText, { color: BrandColors.teal }]}>
                      {followUp.leadPhone}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {followUp.leadEmail ? (
                  <TouchableOpacity onPress={handleEmail} style={styles.contactRow}>
                    <Feather name="mail" size={14} color={BrandColors.teal} />
                    <Text style={[styles.contactText, { color: BrandColors.teal }]}>
                      {followUp.leadEmail}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {followUp.membershipPlan ? (
                  <Text style={[styles.infoLabel, { color: theme.textSecondary, marginTop: 4 }]}>
                    Plan:{' '}
                    <Text style={{ color: theme.text, fontWeight: '600' }}>
                      {followUp.membershipPlan} ({followUp.membershipStatus || 'active'})
                    </Text>
                  </Text>
                ) : null}
              </View>

              {/* Status & Operational Specs */}
              <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Follow-up Details</Text>

                <View style={styles.detailGrid}>
                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Type</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {followUp.type.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Status</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {followUp.status.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Priority</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {followUp.priority.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.gridItem}>
                    <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Due Date</Text>
                    <Text style={[styles.gridValue, { color: theme.text }]}>
                      {new Date(followUp.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {followUp.assignedStaff ? (
                  <Text style={[styles.infoLabel, { color: theme.textSecondary, marginTop: Spacing.two }]}>
                    Assigned Staff:{' '}
                    <Text style={{ color: theme.text, fontWeight: '600' }}>
                      {followUp.assignedStaff}
                    </Text>
                  </Text>
                ) : null}

                {followUp.notes ? (
                  <View style={styles.notesContainer}>
                    <Text style={[styles.gridLabel, { color: theme.textSecondary }]}>Notes</Text>
                    <Text style={[styles.notesText, { color: theme.text }]}>{followUp.notes}</Text>
                  </View>
                ) : null}
              </View>

              {/* Communication History Section */}
              <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Communication History ({followUp.communicationHistory?.length ?? 0})
                  </Text>
                  <TouchableOpacity
                    style={[styles.addRecordBtn, { backgroundColor: BrandColors.teal }]}
                    onPress={() => setAddRecordVisible(true)}
                  >
                    <Feather name="plus" size={14} color="#ffffff" />
                    <Text style={styles.addRecordBtnText}>Log Record</Text>
                  </TouchableOpacity>
                </View>

                {(followUp.communicationHistory ?? []).length === 0 ? (
                  <Text style={[styles.emptyRecordsText, { color: theme.textSecondary }]}>
                    No communication records logged yet.
                  </Text>
                ) : (
                  (followUp.communicationHistory ?? []).map(record => (
                    <View
                      key={record.id}
                      style={[styles.recordCard, { borderColor: theme.border }]}
                    >
                      <View style={styles.recordHeader}>
                        <View style={styles.recordTypeTag}>
                          <Feather name="message-square" size={12} color={BrandColors.teal} />
                          <Text style={[styles.recordTypeText, { color: BrandColors.teal }]}>
                            {record.type} • {record.outcome}
                          </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteRecord(record)}>
                          <Feather name="trash-2" size={14} color="#dc2626" />
                        </TouchableOpacity>
                      </View>

                      <Text style={[styles.recordNotes, { color: theme.text }]}>
                        {record.notes}
                      </Text>

                      <Text style={[styles.recordMeta, { color: theme.textSecondary }]}>
                        {new Date(record.date).toLocaleString()}
                        {record.staffMember ? ` by ${record.staffMember}` : ''}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          ) : null}

          {/* Bottom Action Footer */}
          {followUp ? (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.actionIconBtn, { borderColor: theme.border }]}
                onPress={() => {
                  onClose();
                  onEdit?.(followUp);
                }}
              >
                <Feather name="edit-2" size={16} color={theme.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionIconBtn, { borderColor: theme.border }]}
                onPress={() => {
                  onClose();
                  onDelete?.(followUp);
                }}
              >
                <Feather name="trash-2" size={16} color="#dc2626" />
              </TouchableOpacity>

              {followUp.status === 'pending' || followUp.status === 'overdue' ? (
                <>
                  <TouchableOpacity
                    style={[styles.footerBtn, { backgroundColor: '#16a34a' }]}
                    onPress={() => {
                      onClose();
                      onComplete?.(followUp);
                    }}
                  >
                    <Text style={styles.footerBtnText}>Complete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.footerBtn, { backgroundColor: BrandColors.teal }]}
                    onPress={() => {
                      onClose();
                      onReschedule?.(followUp);
                    }}
                  >
                    <Text style={styles.footerBtnText}>Reschedule</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      </Pressable>

      {/* Log Communication Record Modal */}
      <Modal
        visible={addRecordVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddRecordVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setAddRecordVisible(false)}>
          <Pressable
            style={[styles.modalSheet, { backgroundColor: theme.background }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Log Communication Record
              </Text>
              <TouchableOpacity onPress={() => setAddRecordVisible(false)}>
                <Feather name="x" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Dropdown
                label="Communication Type"
                value={recordType}
                options={RECORD_TYPE_OPTIONS}
                onChange={setRecordType}
              />

              <Dropdown
                label="Outcome"
                value={recordOutcome}
                options={OUTCOME_OPTIONS}
                onChange={setRecordOutcome}
              />

              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
                Staff Member
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={recordStaff}
                onChangeText={setRecordStaff}
                placeholder="Staff name"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
                Duration (minutes)
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={recordDuration}
                onChangeText={setRecordDuration}
                keyboardType="numeric"
                placeholder="15"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
                Record Notes *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  { color: theme.text, borderColor: theme.border },
                ]}
                value={recordNotes}
                onChangeText={setRecordNotes}
                multiline
                numberOfLines={3}
                placeholder="Summary of communication..."
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
                Next Action (Optional)
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={recordNextAction}
                onChangeText={setRecordNextAction}
                placeholder="e.g. Schedule demo next week"
                placeholderTextColor={theme.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.actionIconBtn, { flex: 1, borderColor: theme.border }]}
                onPress={() => setAddRecordVisible(false)}
              >
                <Text style={{ color: theme.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.footerBtn, { flex: 2, backgroundColor: BrandColors.teal }]}
                onPress={handleAddRecordSubmit}
                disabled={addRecordMutation.isPending}
              >
                <Text style={styles.footerBtnText}>
                  {addRecordMutation.isPending ? 'Saving...' : 'Save Record'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  modalSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  loadingContainer: {
    padding: Spacing.four * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: Spacing.four,
  },
  sectionCard: {
    padding: Spacing.three,
    borderRadius: Radius.lg,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: Spacing.two,
  },
  infoLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 3,
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  gridItem: {
    width: '45%',
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  notesContainer: {
    marginTop: Spacing.two,
  },
  notesText: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  addRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Radius.md,
  },
  addRecordBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyRecordsText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: Spacing.one,
  },
  recordCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.two,
    marginTop: Spacing.two,
  },
  recordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recordTypeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordNotes: {
    fontSize: 13,
    marginVertical: 4,
  },
  recordMeta: {
    fontSize: 11,
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  actionIconBtn: {
    height: 48,
    width: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: Spacing.one,
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
});
