import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
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
          <View
            key={idx}
            style={[
              styles.alertCard,
              isUrgent ? styles.alertCardUrgent : styles.alertCardNormal,
            ]}
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
          </View>
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
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.two,
  },
  alertCardUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  alertCardNormal: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FEF08A',
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
