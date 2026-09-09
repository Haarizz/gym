import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
import { GlassSurface } from '@/shared/components';
import type { AdminAlertItem } from '../../domain/AdminDashboardData';

interface AdminAlertsListProps {
  alerts: AdminAlertItem[];
}

export function AdminAlertsList({ alerts }: AdminAlertsListProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <View style={styles.container}>
      {alerts.map((alert, idx) => {
        const isUrgent = alert.urgent;
        return (
          <GlassSurface
            key={idx}
            tint={isUrgent ? '#DC2626' : '#D97706'}
            radius={Radius.md}
            style={styles.alertCard}
          >
            <Feather
              name="bell"
              size={16}
              color={isUrgent ? '#DC2626' : '#D97706'}
            />
            <Text
              style={[
                styles.alertText,
                isUrgent ? styles.alertTextUrgent : styles.alertTextNormal,
              ]}
            >
              {alert.text}
            </Text>
          </GlassSurface>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  alertText: {
    fontSize: 13,
    flex: 1,
  },
  alertTextUrgent: {
    color: '#991B1B',
    fontWeight: '600',
  },
  alertTextNormal: {
    color: '#854D0E',
  },
});
