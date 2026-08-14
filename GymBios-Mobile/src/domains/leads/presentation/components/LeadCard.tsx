import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { Lead, LeadPriority } from '../../domain/Lead';
import { LeadActionButtons } from './LeadActionButtons';

interface LeadCardProps {
  lead: Lead;
  isSelected?: boolean;
  onToggleSelect?: (id: number) => void;
  onCall?: (lead: Lead) => void;
  onEmail?: (lead: Lead) => void;
  onMessage?: (lead: Lead) => void;
  onView?: (lead: Lead) => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onPressCard?: (lead: Lead) => void;
}

export function LeadCard({
  lead,
  isSelected = false,
  onToggleSelect,
  onCall,
  onEmail,
  onMessage,
  onView,
  onEdit,
  onDelete,
  onPressCard,
}: LeadCardProps) {
  const theme = useTheme();

  const initials = useMemo(() => {
    const first = (lead.firstName || '').trim()[0] || '';
    const last = (lead.lastName || '').trim()[0] || '';
    return `${first}${last}`.toUpperCase() || 'L';
  }, [lead.firstName, lead.lastName]);

  const fullName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unnamed Lead';

  const formattedFollowUp = useMemo(() => {
    if (!lead.nextFollowUp) return 'Not scheduled';
    try {
      const date = new Date(lead.nextFollowUp);
      if (isNaN(date.getTime())) return 'Not scheduled';
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Not scheduled';
    }
  }, [lead.nextFollowUp]);

  const priorityStyle = getPriorityBadgeStyle(lead.priority);
  const score = lead.leadScore ?? 50;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: isSelected ? BrandColors.teal : theme.border,
        },
        isSelected && styles.selectedCard,
        pressed && styles.pressed,
      ]}
      onPress={() => (onPressCard ? onPressCard(lead) : onView ? onView(lead) : undefined)}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {onToggleSelect && (
            <Pressable
              style={styles.checkboxTouch}
              onPress={() => onToggleSelect(lead.id)}
              hitSlop={6}
              accessibilityLabel="Select lead"
            >
              <Feather
                name={isSelected ? 'check-square' : 'square'}
                size={20}
                color={isSelected ? BrandColors.teal : theme.textSecondary}
              />
            </Pressable>
          )}

          <View style={[styles.avatar, { backgroundColor: theme.muted }]}>
            <Text style={[styles.avatarText, { color: theme.textSecondary }]}>
              {initials}
            </Text>
          </View>

          <View style={styles.nameContainer}>
            <Text style={[styles.leadName, { color: theme.text }]} numberOfLines={1}>
              {fullName}
            </Text>
            {!!lead.source && (
              <Text style={[styles.sourceText, { color: theme.textSecondary }]}>
                {formatSource(lead.source)}
              </Text>
            )}
          </View>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, getStatusBadgeStyle(lead.status)]}>
          <Text style={[styles.statusBadgeText, getStatusBadgeTextStyle(lead.status)]}>
            {lead.status || 'new'}
          </Text>
        </View>
      </View>

      {/* Contact Info */}
      <View style={styles.contactContainer}>
        {!!lead.email && (
          <View style={styles.contactRow}>
            <Feather name="mail" size={14} color={theme.textSecondary} />
            <Text style={[styles.contactText, { color: theme.textSecondary }]} numberOfLines={1}>
              {lead.email}
            </Text>
          </View>
        )}
        {!!lead.phone && (
          <View style={styles.contactRow}>
            <Feather name="phone" size={14} color={theme.textSecondary} />
            <Text style={[styles.contactText, { color: theme.textSecondary }]} numberOfLines={1}>
              {lead.phone}
            </Text>
          </View>
        )}
      </View>

      {/* Priority and Score Badges */}
      <View style={styles.badgeRow}>
        {!!lead.priority && (
          <View style={[styles.priorityBadge, priorityStyle.bg]}>
            <Text style={[styles.priorityBadgeText, priorityStyle.text]}>
              {lead.priority} priority
            </Text>
          </View>
        )}

        <View style={[styles.scoreContainer, { backgroundColor: theme.muted }]}>
          <Text style={[styles.scoreText, { color: theme.textSecondary }]}>
            score {score}
          </Text>
          <View style={[styles.scoreTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.scoreBar,
                { width: `${Math.min(100, Math.max(0, score))}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Footer Info: Assigned & Next Follow-Up */}
      <View style={styles.footerRow}>
        <View style={styles.footerCol}>
          <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>Assigned</Text>
          <Text style={[styles.footerValue, { color: theme.text }]} numberOfLines={1}>
            {lead.assignedStaff || 'Unassigned'}
          </Text>
        </View>

        <View style={[styles.footerCol, styles.footerColRight]}>
          <Text style={[styles.footerLabel, { color: theme.textSecondary }]}>
            Next Follow-up
          </Text>
          <Text style={[styles.footerValue, { color: theme.text }]} numberOfLines={1}>
            {formattedFollowUp}
          </Text>
        </View>
      </View>

      {/* Card Action Buttons */}
      <View style={styles.actionContainer}>
        <LeadActionButtons
          lead={lead}
          onCall={onCall}
          onEmail={onEmail}
          onMessage={onMessage}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </View>
    </Pressable>
  );
}

function formatSource(source: string): string {
  return source.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getPriorityBadgeStyle(priority?: LeadPriority | string) {
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
  card: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginBottom: Spacing.md,
    borderWidth: 1,
  },
  selectedCard: {
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.95,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.two,
  },
  checkboxTouch: {
    paddingRight: Spacing.one,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nameContainer: {
    flex: 1,
  },
  leadName: {
    fontSize: 15,
    fontWeight: '700',
  },
  sourceText: {
    fontSize: 12,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  contactContainer: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
    paddingLeft: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  contactText: {
    fontSize: 13,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  priorityBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full,
    gap: Spacing.two,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '600',
  },
  scoreTrack: {
    width: 36,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    backgroundColor: BrandColors.teal,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.two,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  footerCol: {
    flex: 1,
  },
  footerColRight: {
    alignItems: 'flex-end',
  },
  footerLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionContainer: {
    borderTopWidth: 0,
    paddingTop: Spacing.one,
  },
});
