import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { Typography } from '@/shared/components/Typography';
import { Button } from '@/shared/components/Button';
import { useMembers } from '@/domains/members';
import { useReferralRules } from '../../hooks/useReferrals';
import { useCreateReferral, useUpdateReferral } from '../../hooks/useReferralActions';
import type { Referral } from '../../domain/Referral';
import type { NewReferralFormState } from '../hooks/useReferralForm';

interface ReferralFormModalProps {
  visible: boolean;
  onClose: () => void;
  editingReferral?: Referral | null;
  initialState?: NewReferralFormState;
  onSuccess?: () => void;
}

export function ReferralFormModal({
  visible,
  onClose,
  editingReferral,
  initialState,
  onSuccess,
}: ReferralFormModalProps) {
  const isEditing = Boolean(editingReferral);

  const { members, loading: isMembersLoading } = useMembers();
  const { data: rules } = useReferralRules();
  const createMutation = useCreateReferral();
  const updateMutation = useUpdateReferral();

  const [referrerMemberId, setReferrerMemberId] = useState(
    editingReferral?.referrerMemberId ?? initialState?.referrerMemberId ?? ''
  );
  const [referrerName, setReferrerName] = useState(
    editingReferral?.referrerName ?? initialState?.referrerName ?? ''
  );
  const [refereeName, setRefereeName] = useState(
    editingReferral?.refereeName ?? initialState?.refereeName ?? ''
  );
  const [refereeEmail, setRefereeEmail] = useState(
    editingReferral?.refereeEmail ?? initialState?.refereeEmail ?? ''
  );
  const [refereePhone, setRefereePhone] = useState(
    editingReferral?.refereePhone ?? initialState?.refereePhone ?? ''
  );
  const [date, setDate] = useState(
    editingReferral?.date ??
      editingReferral?.createdAt ??
      initialState?.date ??
      new Date().toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<string>(
    editingReferral?.status ?? initialState?.status ?? 'pending'
  );
  const [ruleId, setRuleId] = useState<string>(
    editingReferral?.ruleId ? String(editingReferral.ruleId) : initialState?.ruleId ?? 'auto'
  );
  const [notes, setNotes] = useState(
    editingReferral?.notes ?? initialState?.notes ?? ''
  );
  const [referralCode, setReferralCode] = useState(
    editingReferral?.referralCode ?? initialState?.referralCode ?? ''
  );

  const [showReferrerPicker, setShowReferrerPicker] = useState(false);
  const [showRefereePicker, setShowRefereePicker] = useState(false);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!referrerName.trim() || !refereeName.trim()) {
      Alert.alert('Required Fields', 'Please enter both Referrer Name and Referred Person Name.');
      return;
    }

    if (isEditing && editingReferral) {
      updateMutation.mutate(
        {
          id: Number(editingReferral.id),
          payload: {
            referrerMemberId: referrerMemberId || undefined,
            referrerName: referrerName.trim(),
            refereeName: refereeName.trim(),
            refereeEmail: refereeEmail.trim() || undefined,
            refereePhone: refereePhone.trim() || undefined,
            date,
            status,
            notes: notes.trim() || undefined,
          },
        },
        {
          onSuccess: () => {
            Alert.alert('Success', 'Referral updated successfully.');
            onClose();
            onSuccess?.();
          },
          onError: (err) => {
            Alert.alert('Error', err.message || 'Failed to update referral.');
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          referrerMemberId: referrerMemberId || undefined,
          referrerName: referrerName.trim(),
          refereeName: refereeName.trim(),
          refereeEmail: refereeEmail.trim() || undefined,
          refereePhone: refereePhone.trim() || undefined,
          date,
          status,
          notes: notes.trim() || undefined,
          ruleId: ruleId !== 'auto' ? Number(ruleId) : undefined,
          referralCode: referralCode.trim() || undefined,
        },
        {
          onSuccess: () => {
            Alert.alert('Success', 'Referral registered successfully.');
            onClose();
            onSuccess?.();
          },
          onError: (err) => {
            Alert.alert('Error', err.message || 'Failed to create referral.');
          },
        }
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Typography variant="title" style={styles.modalTitle}>
              {isEditing ? 'Edit Referral' : 'Add a Referral'}
            </Typography>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={BrandColors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            {/* Referrer Selector */}
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              Referrer Name (Existing Member) *
            </Typography>
            <Pressable
              style={styles.pickerTrigger}
              onPress={() => setShowReferrerPicker(!showReferrerPicker)}
            >
              <Typography variant="bodySmall" style={referrerName ? styles.pickerValue : styles.pickerPlaceholder}>
                {referrerName || 'Select a member...'}
              </Typography>
              <Feather name="chevron-down" size={18} color={BrandColors.textSecondary} />
            </Pressable>

            {showReferrerPicker && (
              <View style={styles.pickerList}>
                {isMembersLoading ? (
                  <ActivityIndicator size="small" color={BrandColors.teal} style={{ padding: 10 }} />
                ) : (
                  members.map((m) => (
                    <Pressable
                      key={m.id}
                      style={styles.pickerItem}
                      onPress={() => {
                        setReferrerName(m.name);
                        setReferrerMemberId(m.memberId || String(m.id));
                        setShowReferrerPicker(false);
                      }}
                    >
                      <Typography variant="bodySmall" style={styles.pickerItemText}>
                        {m.name} ({m.email || m.phone || m.memberId || m.id})
                      </Typography>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {/* Referred Person */}
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              Referred Person Name *
            </Typography>
            <Pressable
              style={styles.pickerTrigger}
              onPress={() => setShowRefereePicker(!showRefereePicker)}
            >
              <Typography variant="bodySmall" style={refereeName ? styles.pickerValue : styles.pickerPlaceholder}>
                {refereeName || 'Select member or type below...'}
              </Typography>
              <Feather name="chevron-down" size={18} color={BrandColors.textSecondary} />
            </Pressable>

            {showRefereePicker && (
              <View style={styles.pickerList}>
                {isMembersLoading ? (
                  <ActivityIndicator size="small" color={BrandColors.teal} style={{ padding: 10 }} />
                ) : (
                  members.map((m) => (
                    <Pressable
                      key={m.id}
                      style={styles.pickerItem}
                      onPress={() => {
                        setRefereeName(m.name);
                        setRefereeEmail(m.email || '');
                        setRefereePhone(m.phone || '');
                        setShowRefereePicker(false);
                      }}
                    >
                      <Typography variant="bodySmall" style={styles.pickerItemText}>
                        {m.name} ({m.email || m.phone || m.id})
                      </Typography>
                    </Pressable>
                  ))
                )}
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Or type referred person name"
              value={refereeName}
              onChangeText={setRefereeName}
            />

            {/* Email */}
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              Referred Person Email
            </Typography>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={refereeEmail}
              onChangeText={setRefereeEmail}
            />

            {/* Phone */}
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              Referred Person Phone
            </Typography>
            <TextInput
              style={styles.input}
              placeholder="+971 XX XXX XXXX"
              keyboardType="phone-pad"
              value={refereePhone}
              onChangeText={setRefereePhone}
            />

            {/* Date */}
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              Referral Date (YYYY-MM-DD)
            </Typography>
            <TextInput style={styles.input} value={date} onChangeText={setDate} />

            {/* Status */}
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              Status
            </Typography>
            <View style={styles.statusRow}>
              {['pending', 'successful', 'expired'].map((st) => (
                <Pressable
                  key={st}
                  style={[styles.statusTab, status === st && styles.statusTabActive]}
                  onPress={() => setStatus(st)}
                >
                  <Typography
                    variant="caption"
                    style={[styles.statusTabText, status === st && styles.statusTabTextActive]}
                  >
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </Typography>
                </Pressable>
              ))}
            </View>

            {/* Rule Selector */}
            {!isEditing && (
              <>
                <Typography variant="bodySmall" style={styles.fieldLabel}>
                  Reward Rule (Optional)
                </Typography>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rulesRow}>
                  <Pressable
                    style={[styles.ruleChip, ruleId === 'auto' && styles.ruleChipActive]}
                    onPress={() => setRuleId('auto')}
                  >
                    <Typography
                      variant="caption"
                      style={[styles.ruleChipText, ruleId === 'auto' && styles.ruleChipTextActive]}
                    >
                      Auto-assign
                    </Typography>
                  </Pressable>

                  {(rules ?? []).filter((r) => r.isActive).map((r) => (
                    <Pressable
                      key={r.id}
                      style={[styles.ruleChip, ruleId === String(r.id) && styles.ruleChipActive]}
                      onPress={() => setRuleId(String(r.id))}
                    >
                      <Typography
                        variant="caption"
                        style={[
                          styles.ruleChipText,
                          ruleId === String(r.id) && styles.ruleChipTextActive,
                        ]}
                      >
                        {r.name}
                      </Typography>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Referral Code */}
            {!isEditing && (
              <>
                <Typography variant="bodySmall" style={styles.fieldLabel}>
                  Referral Code (Optional)
                </Typography>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. JOHN-SPECIAL"
                  autoCapitalize="characters"
                  value={referralCode}
                  onChangeText={setReferralCode}
                />
              </>
            )}

            {/* Notes */}
            <Typography variant="bodySmall" style={styles.fieldLabel}>
              Notes
            </Typography>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Additional notes about this referral"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: Spacing.two }}
            />
            <Button
              title={isEditing ? 'Save Changes' : 'Save Referral'}
              onPress={handleSubmit}
              loading={isSubmitting}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
    paddingBottom: Spacing.four,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: BrandColors.teal,
  },
  formScroll: {
    paddingHorizontal: Spacing.four,
  },
  formContent: {
    paddingVertical: Spacing.three,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.textPrimary,
    marginTop: Spacing.two,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 14,
    color: BrandColors.textPrimary,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: Spacing.one,
  },
  pickerValue: {
    color: BrandColors.textPrimary,
    fontWeight: '500',
  },
  pickerPlaceholder: {
    color: BrandColors.textSecondary,
  },
  pickerList: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
    maxHeight: 160,
    marginBottom: Spacing.two,
  },
  pickerItem: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerItemText: {
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statusTab: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderRadius: Radius.md,
    backgroundColor: '#f1f5f9',
  },
  statusTabActive: {
    backgroundColor: BrandColors.teal,
  },
  statusTabText: {
    color: BrandColors.textSecondary,
    fontWeight: '600',
  },
  statusTabTextActive: {
    color: '#ffffff',
  },
  rulesRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginVertical: 4,
  },
  ruleChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.full,
    backgroundColor: '#f1f5f9',
    marginRight: Spacing.one,
  },
  ruleChipActive: {
    backgroundColor: BrandColors.teal,
  },
  ruleChipText: {
    fontSize: 12,
    color: BrandColors.textSecondary,
  },
  ruleChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
});
