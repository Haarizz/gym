import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import type { StaffInfo } from '../../domain/StaffDashboardData';

interface StaffWelcomeCardProps {
  staffInfo: StaffInfo;
}

export function StaffWelcomeCard({ staffInfo }: StaffWelcomeCardProps) {
  const firstName = staffInfo.name.split(' ')[0] || staffInfo.name;

  return (
    <LinearGradient
      colors={[BrandColors.teal, BrandColors.tealDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.greeting}>Hello, {firstName}! 👋</Text>
      <Text style={styles.role}>{staffInfo.role}</Text>
      <View style={styles.branchRow}>
        <Text style={styles.branchLabel}>Branch:</Text>
        <Text style={styles.branchValue}>{staffInfo.branch}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  role: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  branchLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  branchValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
