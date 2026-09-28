import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { BrandColors, Glass, Radius, Spacing } from '@/core/theme';

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

  // Explicit 2×2 rows with flex: 1 cells: percentage widths plus a fixed gap overflow and
  // wrap into a lopsided column on narrow screens or with a large system font scale.
  const rows = [
    [
      { label: 'Create Offer', onPress: handleCreateOffer },
      { label: 'Add Staff', onPress: handleAddStaff },
    ],
    [
      { label: 'View Reports', onPress: handleViewReports },
      { label: 'Manage Branch', onPress: handleManageBranch },
    ],
  ];

  return (
    <LinearGradient
      colors={[BrandColors.teal, BrandColors.tealDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Text style={styles.title}>Quick Actions</Text>
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
              >
                <Text
                  style={styles.buttonText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
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
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    paddingHorizontal: Spacing.two,
    backgroundColor: Glass.fill,
    borderWidth: 1,
    borderColor: Glass.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
