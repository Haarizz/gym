import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';

interface StaffQuickActionsProps {
  onAddLead?: () => void;
  onCheckIn?: () => void;
}

export function StaffQuickActions({ onAddLead, onCheckIn }: StaffQuickActionsProps) {
  const router = useRouter();

  const handleAddLead = () => {
    if (onAddLead) {
      onAddLead();
    } else {
      router.push('/(staff)/leads/add' as any);
    }
  };

  const handleCheckIn = () => {
    if (onCheckIn) {
      onCheckIn();
    } else {
      router.push('/(staff)/check-in' as any);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.actionWrapper}
        onPress={handleAddLead}
        accessibilityRole="button"
        accessibilityLabel="Add New Lead"
      >
        <LinearGradient
          colors={[BrandColors.memberGold, BrandColors.trainerAmber]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.actionButton}
        >
          <Feather name="user-plus" size={22} color="#FFFFFF" style={styles.icon} />
          <Text style={styles.actionText}>Add New Lead</Text>
        </LinearGradient>
      </Pressable>

      <Pressable
        style={styles.actionWrapper}
        onPress={handleCheckIn}
        accessibilityRole="button"
        accessibilityLabel="Member Check-in"
      >
        <LinearGradient
          colors={[BrandColors.teal, BrandColors.tealDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.actionButton}
        >
          <Feather name="check-circle" size={22} color="#FFFFFF" style={styles.icon} />
          <Text style={styles.actionText}>Member Check-in</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionWrapper: {
    flex: 1,
  },
  actionButton: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: {
    marginBottom: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
