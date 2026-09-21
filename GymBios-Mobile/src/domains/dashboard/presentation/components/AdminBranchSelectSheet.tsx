import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet/AppBottomSheet';
import { useBranchContext } from '@/shared/providers/BranchProvider';

interface AdminBranchSelectSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AdminBranchSelectSheet({ visible, onClose }: AdminBranchSelectSheetProps) {
  const { selectedBranchId, setSelectedBranchId, availableBranches } = useBranchContext();

  const select = (id: number | 'ALL') => {
    setSelectedBranchId(id);
    onClose();
  };

  return (
    <AppBottomSheet visible={visible} title="Select Branch" subtitle="Scope the dashboard to a branch" onClose={onClose}>
      <View style={styles.list}>
        <Pressable style={styles.row} onPress={() => select('ALL')} accessibilityRole="button">
          <Text style={styles.rowText}>All Branches</Text>
          {selectedBranchId === 'ALL' && <Feather name="check" size={18} color={BrandColors.teal} />}
        </Pressable>
        {availableBranches.map((branch) => (
          <Pressable key={branch.id} style={styles.row} onPress={() => select(branch.id)} accessibilityRole="button">
            <Text style={styles.rowText}>{branch.branch_name}</Text>
            {selectedBranchId === branch.id && <Feather name="check" size={18} color={BrandColors.teal} />}
          </Pressable>
        ))}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    borderRadius: Radius.sm,
  },
  rowText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1E293B',
  },
});
