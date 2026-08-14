import React, { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { FollowUp } from '../../domain/FollowUp';

interface FollowUpCardProps {
  followUp: FollowUp;
  onView?: (followUp: FollowUp) => void;
  onEdit?: (followUp: FollowUp) => void;
  onDelete?: (followUp: FollowUp) => void;
  onComplete?: (followUp: FollowUp) => void;
  onReschedule?: (followUp: FollowUp) => void;
  onCancel?: (followUp: FollowUp) => void;
  onCall?: (followUp: FollowUp) => void;
  onEmail?: (followUp: FollowUp) => void;
}

export function FollowUpCard({
  followUp,
  onView,
  onEdit,
  onDelete,
  onComplete,
  onReschedule,
  onCancel,
  onCall,
  onEmail,
}: FollowUpCardProps) {
  const theme = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setMenuOpen(prev => !prev);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'call':
        return 'phone';
      case 'email':
        return 'mail';
      case 'sms':
        return 'message-square';
      case 'whatsapp':
        return 'message-circle';
      case 'in-app':
      case 'in_app':
        return 'at-sign';
      case 'meeting':
        return 'users';
      case 'visit':
        return 'map-pin';
      default:
        return 'message-square';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending':
        return { bg: '#dbeafe', text: '#1e40af', label: 'Pending' };
      case 'completed':
        return { bg: '#dcfce7', text: '#15803d', label: 'Completed' };
      case 'overdue':
        return { bg: '#fee2e2', text: '#b91c1c', label: 'Overdue' };
      case 'cancelled':
        return { bg: '#f3f4f6', text: '#4b5563', label: 'Cancelled' };
      case 'rescheduled':
        return { bg: '#fef3c7', text: '#b45309', label: 'Rescheduled' };
      default:
        return { bg: '#f3f4f6', text: '#4b5563', label: status };
    }
  };

  const getPriorityBadgeStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return { bg: '#fee2e2', text: '#b91c1c', label: 'High' };
      case 'medium':
        return { bg: '#fef3c7', text: '#b45309', label: 'Medium' };
      case 'low':
        return { bg: '#dcfce7', text: '#15803d', label: 'Low' };
      default:
        return { bg: '#f3f4f6', text: '#4b5563', label: priority };
    }
  };

  const formatDueDate = (dateStr?: string) => {
    if (!dateStr) return 'No due date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const statusBadge = getStatusBadgeStyle(followUp.status);
  const priorityBadge = getPriorityBadgeStyle(followUp.priority);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Top Header: Lead Name & Badges */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onView?.(followUp)}
        style={styles.cardHeader}
      >
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.typeIconContainer,
              { backgroundColor: BrandColors.teal + '15' },
            ]}
          >
            <Feather
              name={getTypeIcon(followUp.type) as any}
              size={18}
              color={BrandColors.teal}
            />
          </View>
          <View style={styles.nameContainer}>
            <Text style={[styles.leadName, { color: theme.text }]} numberOfLines={1}>
              {followUp.leadName}
            </Text>
            <Text style={[styles.subject, { color: theme.textSecondary }]} numberOfLines={1}>
              {followUp.subject}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={toggleMenu}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.moreBtn}
        >
          <Feather name="more-vertical" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Badges Row & Metadata */}
      <View style={styles.metaRow}>
        <View style={styles.badgeGroup}>
          <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
            <Text style={[styles.badgeText, { color: statusBadge.text }]}>
              {statusBadge.label}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: priorityBadge.bg }]}>
            <Text style={[styles.badgeText, { color: priorityBadge.text }]}>
              {priorityBadge.label} Priority
            </Text>
          </View>
        </View>

        <View style={styles.dueDateRow}>
          <Feather name="calendar" size={14} color={theme.textSecondary} />
          <Text style={[styles.dueDateText, { color: theme.textSecondary }]}>
            {formatDueDate(followUp.dueDate)}
            {followUp.scheduledTime ? ` at ${followUp.scheduledTime}` : ''}
          </Text>
        </View>
      </View>

      {/* Staff & Notes Preview */}
      {followUp.assignedStaff ? (
        <View style={styles.infoRow}>
          <Feather name="user" size={14} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.textSecondary }]} numberOfLines={1}>
            Assigned to: <Text style={{ color: theme.text, fontWeight: '600' }}>{followUp.assignedStaff}</Text>
          </Text>
        </View>
      ) : null}

      {/* Action Bar */}
      <View style={[styles.actionBar, { borderTopColor: theme.border }]}>
        <View style={styles.contactActions}>
          {followUp.leadPhone ? (
            <TouchableOpacity
              onPress={() => onCall?.(followUp)}
              style={[styles.actionChip, { backgroundColor: theme.background }]}
            >
              <Feather name="phone" size={14} color={BrandColors.teal} />
              <Text style={[styles.actionChipText, { color: BrandColors.teal }]}>
                Call
              </Text>
            </TouchableOpacity>
          ) : null}

          {followUp.leadEmail ? (
            <TouchableOpacity
              onPress={() => onEmail?.(followUp)}
              style={[styles.actionChip, { backgroundColor: theme.background }]}
            >
              <Feather name="mail" size={14} color={BrandColors.teal} />
              <Text style={[styles.actionChipText, { color: BrandColors.teal }]}>
                Email
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.primaryActions}>
          {followUp.status === 'pending' || followUp.status === 'overdue' ? (
            <>
              <TouchableOpacity
                onPress={() => onComplete?.(followUp)}
                style={[styles.primaryBtn, { backgroundColor: '#16a34a' }]}
              >
                <Feather name="check" size={14} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Complete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onReschedule?.(followUp)}
                style={[styles.primaryBtn, { backgroundColor: BrandColors.teal }]}
              >
                <Feather name="clock" size={14} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Reschedule</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => onView?.(followUp)}
              style={[styles.primaryBtn, { backgroundColor: BrandColors.teal }]}
            >
              <Feather name="eye" size={14} color="#ffffff" />
              <Text style={styles.primaryBtnText}>Details</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quick Action Popover Dropdown */}
      {menuOpen ? (
        <View
          style={[
            styles.menuDropdown,
            { backgroundColor: theme.background, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              onView?.(followUp);
            }}
          >
            <Feather name="eye" size={16} color={theme.text} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              onEdit?.(followUp);
            }}
          >
            <Feather name="edit-2" size={16} color={theme.text} />
            <Text style={[styles.menuItemText, { color: theme.text }]}>Edit</Text>
          </TouchableOpacity>

          {followUp.status !== 'cancelled' ? (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onCancel?.(followUp);
              }}
            >
              <Feather name="x-circle" size={16} color="#d97706" />
              <Text style={[styles.menuItemText, { color: '#d97706' }]}>Cancel Follow-up</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              onDelete?.(followUp);
            }}
          >
            <Feather name="trash-2" size={16} color="#dc2626" />
            <Text style={[styles.menuItemText, { color: '#dc2626' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    position: 'relative',
  },
  cardHeader: {
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
  typeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '700',
  },
  subject: {
    fontSize: 13,
    marginTop: 2,
  },
  moreBtn: {
    padding: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.two,
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.full ?? 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.two,
  },
  infoText: {
    fontSize: 12,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    marginTop: Spacing.one,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  primaryBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  menuDropdown: {
    position: 'absolute',
    top: 45,
    right: 15,
    borderRadius: Radius.md,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 100,
    paddingVertical: Spacing.one,
    minWidth: 150,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
