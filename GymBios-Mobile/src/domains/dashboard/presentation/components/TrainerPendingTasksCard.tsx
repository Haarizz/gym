import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
import type { TrainerPendingTask } from '../../domain/TrainerDashboardData';

interface TrainerPendingTasksCardProps {
  tasks: TrainerPendingTask[];
  onToggleTask?: (taskId: string | number) => void;
}

export function TrainerPendingTasksCard({
  tasks,
  onToggleTask,
}: TrainerPendingTasksCardProps) {
  if (!tasks || tasks.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Tasks</Text>
      <View style={styles.list}>
        {tasks.map((item) => (
          <Pressable
            key={item.id}
            style={styles.taskRow}
            onPress={() => onToggleTask?.(item.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!item.completed }}
            accessibilityLabel={item.task}
          >
            <View
              style={[
                styles.checkbox,
                item.completed && styles.checkboxCompleted,
              ]}
            >
              {item.completed && <Feather name="check" size={12} color="#FFFFFF" />}
            </View>
            <View style={styles.taskContent}>
              <Text
                style={[
                  styles.taskText,
                  item.urgent && styles.taskTextUrgent,
                  item.completed && styles.taskTextCompleted,
                ]}
              >
                {item.task}
              </Text>
              {item.urgent && !item.completed && (
                <Text style={styles.urgentBadge}>Urgent</Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEFCE8',
    borderWidth: 1,
    borderColor: '#FEF08A',
    borderRadius: Radius.md,
    padding: Spacing.four,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#713F12',
    marginBottom: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#CA8A04',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxCompleted: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  taskText: {
    fontSize: 13,
    color: '#854D0E',
    lineHeight: 18,
  },
  taskTextUrgent: {
    color: '#713F12',
    fontWeight: '600',
  },
  taskTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#A1A1AA',
  },
  urgentBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
});
