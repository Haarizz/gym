import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { Radius, Spacing } from '@/core/theme';
import type { RecentConversionItem } from '../../domain/StaffDashboardData';

interface StaffRecentConversionsCardProps {
  conversions: RecentConversionItem[];
}

export function StaffRecentConversionsCard({
  conversions,
}: StaffRecentConversionsCardProps) {
  if (!conversions || conversions.length === 0) return null;

  return (
    <LinearGradient
      colors={['#16A34A', '#15803D']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.header}>
        <Feather name="check-circle" size={18} color="#FFFFFF" />
        <Text style={styles.title}>Today's Wins! 🎉</Text>
      </View>

      <View style={styles.list}>
        {conversions.map((item, idx) => (
          <View key={item.id ?? idx} style={styles.item}>
            <View style={styles.itemDetails}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPlan}>{item.plan}</Text>
            </View>
            <Text style={styles.itemAmount}>{item.amount}</Text>
          </View>
        ))}
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
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.three,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  list: {
    gap: Spacing.two,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemPlan: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
