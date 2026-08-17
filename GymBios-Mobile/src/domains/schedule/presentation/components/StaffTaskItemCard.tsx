import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { ScheduleTask } from '../../domain/StaffScheduleData';

interface StaffTaskItemCardProps {
  task: ScheduleTask;
  onToggleComplete?: (taskId: string | number) => void;
}

export function StaffTaskItemCard({ task, onToggleComplete }: StaffTaskItemCardProps) {
  const isHigh = task.priority === 'high';

  const getTypeBadgeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'follow-up':
        return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'meeting':
        return { bg: '#F3E8FF', text: '#7E22CE' };
      case 'tour':
        return { bg: '#DCFCE7', text: '#15803D' };
      default:
        return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  const badgeStyle = getTypeBadgeStyle(task.type);

  const handleCall = () => {
    if (task.phone) {
      Linking.openURL(`tel:${task.phone.replace(/[^\d+]/g, '')}`).catch(() => {});
    }
  };

  return (
    <View
      style={[
        styles.container,
        isHigh ? styles.containerHigh : styles.containerNormal,
        task.completed && styles.containerCompleted,
      ]}
    >
      <View style={styles.contentRow}>
        {/* Time Badge */}
        <View
          style={[
            styles.timeBadge,
            isHigh ? styles.timeBadgeHigh : styles.timeBadgeNormal,
            task.completed && styles.timeBadgeCompleted,
          ]}
        >
          <Text style={styles.timeText}>{task.time}</Text>
        </View>

        {/* Task Details */}
        <View style={styles.details}>
          <View style={styles.tagsRow}>
            <View style={[styles.typeBadge, { backgroundColor: badgeStyle.bg }]}>
              <Text style={[styles.typeText, { color: badgeStyle.text }]}>
                {task.type.toUpperCase()}
              </Text>
            </View>

            {isHigh && (
              <View style={styles.urgentBadge}>
                <Text style={styles.urgentText}>URGENT</Text>
              </View>
            )}

            {task.completed && (
              <View style={styles.completedBadge}>
                <Text style={styles.completedText}>DONE</Text>
              </View>
            )}
          </View>

          <Text
            style={[styles.name, task.completed && styles.textStrikethrough]}
            numberOfLines={1}
          >
            {task.name}
          </Text>
          <Text style={styles.actionText}>{task.action}</Text>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            {task.type.toLowerCase() === 'follow-up' && (
              <Pressable
                style={styles.callButton}
                onPress={handleCall}
                accessibilityRole="button"
                accessibilityLabel={`Call ${task.name}`}
              >
                <Feather name="phone" size={12} color="#FFFFFF" />
                <Text style={styles.callButtonText}>Call Now</Text>
              </Pressable>
            )}

            <Pressable
              style={[
                styles.doneButton,
                task.completed && styles.doneButtonActive,
              ]}
              onPress={() => onToggleComplete?.(task.id)}
              accessibilityRole="button"
              accessibilityLabel={task.completed ? 'Mark incomplete' : 'Mark done'}
            >
              <Text
                style={[
                  styles.doneButtonText,
                  task.completed && styles.doneButtonTextActive,
                ]}
              >
                {task.completed ? 'Completed ✓' : 'Mark Done'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.three,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  containerHigh: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  containerNormal: {
    borderColor: '#E2E8F0',
  },
  containerCompleted: {
    opacity: 0.7,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  contentRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 74,
    alignSelf: 'flex-start',
  },
  timeBadgeHigh: {
    backgroundColor: '#EF4444',
  },
  timeBadgeNormal: {
    backgroundColor: BrandColors.teal,
  },
  timeBadgeCompleted: {
    backgroundColor: '#94A3B8',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  details: {
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  completedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  textStrikethrough: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  actionText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: BrandColors.teal,
    paddingVertical: 7,
    borderRadius: Radius.sm,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  doneButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 7,
    borderRadius: Radius.sm,
  },
  doneButtonActive: {
    backgroundColor: '#DCFCE7',
  },
  doneButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  doneButtonTextActive: {
    color: '#15803D',
  },
});
