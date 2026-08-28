import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BrandColors, Radius, Spacing } from '@/core/theme';

interface AdminQuickActionsCardProps {
  onCreateOffer?: () => void;
  onAddStaff?: () => void;
  onViewReports?: () => void;
  onManageBranch?: () => void;
}

export function AdminQuickActionsCard({
  onCreateOffer,
  onAddStaff,
  onViewReports,
  onManageBranch,
}: AdminQuickActionsCardProps) {
  const router = useRouter();

  const handleCreateOffer = () => {
    if (onCreateOffer) onCreateOffer();
    else router.push('/(admin)/promotions' as any);
  };

  const handleAddStaff = () => {
    if (onAddStaff) onAddStaff();
    else router.push('/(admin)/staff' as any);
  };

  const handleViewReports = () => {
    if (onViewReports) onViewReports();
    else router.push('/(admin)/analytics' as any);
  };

  const handleManageBranch = () => {
    if (onManageBranch) onManageBranch();
    else router.push('/(admin)/facilities' as any);
  };

  return (
    <LinearGradient
      colors={[BrandColors.teal, BrandColors.tealDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.grid}>
        <Pressable
          style={styles.button}
          onPress={handleCreateOffer}
          accessibilityRole="button"
          accessibilityLabel="Create Offer"
        >
          <Text style={styles.buttonText}>Create Offer</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={handleAddStaff}
          accessibilityRole="button"
          accessibilityLabel="Add Staff"
        >
          <Text style={styles.buttonText}>Add Staff</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={handleViewReports}
          accessibilityRole="button"
          accessibilityLabel="View Reports"
        >
          <Text style={styles.buttonText}>View Reports</Text>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={handleManageBranch}
          accessibilityRole="button"
          accessibilityLabel="Manage Branch"
        >
          <Text style={styles.buttonText}>Manage Branch</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  button: {
    width: '48.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
