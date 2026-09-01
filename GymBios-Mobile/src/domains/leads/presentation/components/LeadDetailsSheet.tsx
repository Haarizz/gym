import React, { useMemo, useState } from 'react';
import {
  Linking,
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
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/Dropdown';
import type { Lead, LeadInteractionType } from '../../domain/Lead';
import { useAddLeadInteraction } from '../../hooks/useLeadMutations';
import { useLead } from '../../hooks/useLeads';

import { toast } from '@/shared/components/Toasts/toastStore';

interface LeadDetailsSheetProps {
  visible: boolean;
  leadId: number | null;
  onClose: () => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
}

const INTERACTION_TYPES: Array<{ label: string; value: LeadInteractionType }> = [
  { label: 'Call', value: 'call' },
  { label: 'Email', value: 'email' },
  { label: 'Meeting', value: 'meeting' },
  { label: 'SMS', value: 'sms' },
  { label: 'Tour', value: 'tour' },
  { label: 'Note', value: 'note' },
];

export function LeadDetailsSheet({
  visible,
  leadId,
  onClose,
  onEdit,
  onDelete,
}: LeadDetailsSheetProps) {
  const theme = useTheme();

  // Fetch full lead details using existing TanStack Query hook
  const { data: leadData } = useLead(leadId ?? 0);
  const lead = leadData;

  const addInteractionMutation = useAddLeadInteraction();

  // Interaction Form State
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [interactionType, setInteractionType] = useState<LeadInteractionType>('call');
  const [interactionNotes, setInteractionNotes] = useState('');
  const [interactionOutcome, setInteractionOutcome] = useState('connected');
  const [staffMemberName, setStaffMemberName] = useState('');

  const initials = useMemo(() => {
    if (!lead) return 'L';
    const first = (lead.firstName || '').trim()[0] || '';
    const last = (lead.lastName || '').trim()[0] || '';
    return `${first}${last}`.toUpperCase() || 'L';
  }, [lead]);

  const fullName = lead ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : '';

  const handleCall = () => {
    if (!lead?.phone) {
      toast.info('No phone number available for this lead.', {
        title: 'No Phone'
      });
      return;
    }
    Linking.openURL(`tel:${lead.phone.replace(/\s+/g, '')}`).catch(() => {
      toast.error('Unable to open phone dialer.', {
        title: 'Error'
      });
    });
  };

  const handleEmail = () => {
    if (!lead?.email) {
      toast.info('No email address available for this lead.', {
        title: 'No Email'
      });
      return;
    }
    Linking.openURL(`mailto:${lead.email}`).catch(() => {
      toast.error('Unable to open mail client.', {
        title: 'Error'
      });
    });
  };

  const handleMessage = () => {
    if (!lead?.phone) {
      toast.info('No phone number available for this lead.', {
        title: 'No Phone'
      });
      return;
    }
    Linking.openURL(`sms:${lead.phone.replace(/\s+/g, '')}`).catch(() => {
      toast.error('Unable to open SMS messaging.', {
        title: 'Error'
      });
    });
  };

  const handleAddInteractionSubmit = () => {
    if (!leadId) return;
    if (!interactionNotes.trim()) {
      toast.error('Interaction notes are required.', {
        title: 'Validation Error'
      });
      return;
    }

    addInteractionMutation.mutate(
      {
        id: leadId,
        interaction: {
          type: interactionType,
          date: new Date().toISOString(),
          notes: interactionNotes.trim(),
          outcome: interactionOutcome as any,
          staffMember: staffMemberName.trim() || 'Staff',
        },
      },
      {
        onSuccess: () => {
          setShowAddInteraction(false);
          setInteractionNotes('');
          setStaffMemberName('');
        },
        onError: (err: any) => {
          toast.error(err.message || 'Failed to add interaction.', {
            title: 'Error'
          });
        },
      },
    );
  };

  if (!visible || !lead) return null;

  return (
    <AppBottomSheet
      visible={visible}
      title=""
      onClose={onClose}
    >
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Header Profile Section */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.muted }]}>
            <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
              {initials}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.leadName, { color: theme.text }]}>{fullName}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, getStatusBadgeStyle(lead.status)]}>
                <Text style={[styles.badgeText, getStatusBadgeTextStyle(lead.status)]}>
                  {lead.status || 'new'}
                </Text>
              </View>
              <View style={[styles.badge, getPriorityBadgeStyle(lead.priority).bg]}>
                <Text style={[styles.badgeText, getPriorityBadgeStyle(lead.priority).text]}>
                  {lead.priority} priority
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact Information Card */}
        <View style={[styles.cardSection, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Information</Text>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
              <Text style={[styles.fieldValue, { color: theme.text }]}>
                {lead.email || 'N/A'}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone</Text>
              <Text style={[styles.fieldValue, { color: theme.text }]}>
                {lead.phone || 'N/A'}
              </Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Preferred Contact
              </Text>
              <Text style={[styles.fieldValue, { color: theme.text }]}>
                {lead.preferredContactMethod || 'Email'}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Lead Score</Text>
              <View style={styles.scoreWrap}>
                <Text style={[styles.scoreNumber, { color: BrandColors.teal }]}>
                  {lead.leadScore ?? 50}
                </Text>
                <View style={[styles.scoreTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.scoreBar,
                      { width: `${Math.min(100, Math.max(0, lead.leadScore ?? 50))}%` },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Lead Details Card */}
        <View style={[styles.cardSection, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Lead Details</Text>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Source</Text>
              <Text style={[styles.fieldValue, { color: theme.text }]}>
                {lead.source ? formatSource(lead.source) : 'Website'}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Assigned Staff</Text>
              <Text style={[styles.fieldValue, { color: theme.text }]}>
                {lead.assignedStaff || 'Unassigned'}
              </Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                Membership Interest
              </Text>
              <Text style={[styles.fieldValue, { color: theme.text }]}>
                {lead.membershipInterest || 'Not specified'}
              </Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Budget</Text>
              <Text style={[styles.fieldValue, { color: theme.text }]}>
                {lead.budget ? `$${lead.budget}` : 'Not specified'}
              </Text>
            </View>
          </View>

          {!!lead.tags && lead.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Tags</Text>
              <View style={styles.tagsRow}>
                {lead.tags.map(tag => (
                  <View key={tag} style={[styles.tagPill, { backgroundColor: theme.muted }]}>
                    <Text style={[styles.tagText, { color: theme.text }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!!lead.notes && (
            <View style={styles.notesSection}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Notes</Text>
              <Text style={[styles.notesBody, { color: theme.text, backgroundColor: theme.muted }]}>
                {lead.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Action Buttons */}
        <View style={[styles.cardSection, { backgroundColor: theme.backgroundElement }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionGridBtn} onPress={handleCall}>
              <Feather name="phone" size={16} color={BrandColors.teal} />
              <Text style={[styles.actionGridText, { color: theme.text }]}>Call Lead</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionGridBtn} onPress={handleEmail}>
              <Feather name="mail" size={16} color={BrandColors.teal} />
              <Text style={[styles.actionGridText, { color: theme.text }]}>Send Email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionGridBtn} onPress={handleMessage}>
              <Feather name="message-square" size={16} color={BrandColors.teal} />
              <Text style={[styles.actionGridText, { color: theme.text }]}>Message</Text>
            </TouchableOpacity>

            {onEdit && (
              <TouchableOpacity
                style={styles.actionGridBtn}
                onPress={() => {
                  onClose();
                  onEdit(lead);
                }}
              >
                <Feather name="edit-2" size={16} color={BrandColors.teal} />
                <Text style={[styles.actionGridText, { color: theme.text }]}>Edit Lead</Text>
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                style={[styles.actionGridBtn, styles.deleteActionGridBtn]}
                onPress={() => {
                  onClose();
                  onDelete(lead);
                }}
              >
                <Feather name="trash-2" size={16} color="#f87171" />
                <Text style={styles.deleteActionGridText}>Delete Lead</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Interaction History */}
        <View style={[styles.cardSection, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Interaction History</Text>
            <TouchableOpacity
              style={styles.addInteractionBtn}
              onPress={() => setShowAddInteraction(!showAddInteraction)}
            >
              <Feather
                name={showAddInteraction ? 'minus' : 'plus'}
                size={16}
                color={BrandColors.teal}
              />
              <Text style={styles.addInteractionText}>
                {showAddInteraction ? 'Cancel' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          {showAddInteraction && (
            <View style={[styles.addFormContainer, { borderColor: theme.border }]}>
              <Dropdown
                label="Type"
                value={interactionType}
                options={INTERACTION_TYPES}
                onChange={val => setInteractionType(val as LeadInteractionType)}
              />

              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
                Staff Member
              </Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={staffMemberName}
                onChangeText={setStaffMemberName}
                placeholder="Staff name"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: Spacing.two }]}>
                Notes *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  { color: theme.text, borderColor: theme.border },
                ]}
                value={interactionNotes}
                onChangeText={setInteractionNotes}
                multiline
                numberOfLines={3}
                placeholder="Details of interaction..."
                placeholderTextColor={theme.textSecondary}
              />

              <View style={styles.formSubmitRow}>
                <Button
                  label="Save Interaction"
                  onPress={handleAddInteractionSubmit}
                  disabled={addInteractionMutation.isPending}
                />
              </View>
            </View>
          )}

          <View style={styles.historyList}>
            {lead.interactions && lead.interactions.length > 0 ? (
              lead.interactions.map(item => (
                <View key={item.id} style={[styles.historyItem, { borderColor: theme.border }]}>
                  <View style={styles.historyTopRow}>
                    <Text style={[styles.historyType, { color: theme.text }]}>
                      {item.type}
                    </Text>
                    <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                      {item.date ? new Date(item.date).toLocaleDateString() : ''}
                    </Text>
                  </View>
                  <Text style={[styles.historyNotes, { color: theme.textSecondary }]}>
                    {item.notes}
                  </Text>
                  <View style={styles.historyMetaRow}>
                    <Text style={[styles.historyStaff, { color: theme.textSecondary }]}>
                      By: {item.staffMember || 'Staff'}
                    </Text>
                    {!!item.outcome && (
                      <View style={[styles.outcomeBadge, { backgroundColor: theme.muted }]}>
                        <Text style={[styles.outcomeText, { color: BrandColors.teal }]}>
                          {item.outcome}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyHistoryText, { color: theme.textSecondary }]}>
                No interactions logged yet.
              </Text>
            )}
          </View>
        </View>

        <View style={{ height: Spacing.four }} />
      </ScrollView>
    </AppBottomSheet>
  );
}

function formatSource(source: string): string {
  return source.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getPriorityBadgeStyle(priority?: string) {
  const norm = (priority || '').toLowerCase();
  if (norm === 'high' || norm === 'urgent') {
    return {
      bg: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
      text: { color: '#f87171' },
    };
  }
  if (norm === 'medium') {
    return {
      bg: { backgroundColor: 'rgba(245, 158, 11, 0.15)' },
      text: { color: '#fbbf24' },
    };
  }
  return {
    bg: { backgroundColor: 'rgba(45, 212, 191, 0.15)' },
    text: { color: '#2dd4bf' },
  };
}

function getStatusBadgeStyle(status?: string) {
  const norm = (status || '').toLowerCase();
  switch (norm) {
    case 'new':
      return { backgroundColor: 'rgba(37, 99, 235, 0.2)' };
    case 'contacted':
      return { backgroundColor: 'rgba(234, 179, 8, 0.2)' };
    case 'follow-up':
    case 'follow_up':
      return { backgroundColor: 'rgba(249, 115, 22, 0.2)' };
    case 'converted':
      return { backgroundColor: 'rgba(34, 197, 94, 0.2)' };
    case 'lost':
      return { backgroundColor: 'rgba(239, 68, 68, 0.2)' };
    default:
      return { backgroundColor: 'rgba(148, 163, 184, 0.2)' };
  }
}

function getStatusBadgeTextStyle(status?: string) {
  const norm = (status || '').toLowerCase();
  switch (norm) {
    case 'new':
      return { color: '#60a5fa' };
    case 'contacted':
      return { color: '#facc15' };
    case 'follow-up':
    case 'follow_up':
      return { color: '#fb923c' };
    case 'converted':
      return { color: '#4ade80' };
    case 'lost':
      return { color: '#f87171' };
    default:
      return { color: '#cbd5e1' };
  }
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.two,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.four,
    gap: Spacing.three,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cardSection: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: Spacing.three,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  addInteractionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addInteractionText: {
    fontSize: 13,
    fontWeight: '600',
    color: BrandColors.teal,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: Spacing.three,
  },
  gridCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  scoreNumber: {
    fontSize: 13,
    fontWeight: '700',
  },
  scoreTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    backgroundColor: BrandColors.teal,
  },
  tagsSection: {
    marginTop: Spacing.one,
    marginBottom: Spacing.two,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    marginTop: 4,
  },
  tagPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  notesSection: {
    marginTop: Spacing.two,
  },
  notesBody: {
    fontSize: 13,
    padding: Spacing.two,
    borderRadius: Radius.md,
    marginTop: 4,
    lineHeight: 18,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  actionGridBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  actionGridText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteActionGridBtn: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteActionGridText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '600',
  },
  addFormContainer: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 13,
  },
  multilineInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  formSubmitRow: {
    marginTop: Spacing.three,
  },
  historyList: {
    gap: Spacing.two,
  },
  historyItem: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.two,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyType: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  historyDate: {
    fontSize: 11,
  },
  historyNotes: {
    fontSize: 12,
    marginBottom: 4,
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyStaff: {
    fontSize: 11,
  },
  outcomeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  outcomeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyHistoryText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: Spacing.two,
  },
});
