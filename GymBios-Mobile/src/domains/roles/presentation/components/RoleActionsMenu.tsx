import { Pressable, StyleSheet } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Typography } from '@/shared/components/Typography';
import { BrandColors, Spacing, Radius } from '@/core/theme';
import type { Role } from '../../domain/Role';

interface RoleActionsMenuProps {
  role: Role | null;
  visible: boolean;
  onClose: () => void;
  onEdit: (role: Role) => void;
  onDuplicate: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function RoleActionsMenu({
  role,
  visible,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: RoleActionsMenuProps) {
  if (!role) return null;

  return (
    <AppBottomSheet
      visible={visible}
      title={role.roleName}
      subtitle={role.isSystem ? 'System Role' : 'Custom Role'}
      onClose={onClose}
    >
      <Pressable 
        style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
        onPress={() => { onClose(); onEdit(role); }}
      >
        <Feather name="edit-2" size={18} color={BrandColors.textPrimary} />
        <Typography variant="body" style={styles.actionText}>Edit</Typography>
      </Pressable>

      <Pressable 
        style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
        onPress={() => { onClose(); onDuplicate(role); }}
      >
        <Feather name="copy" size={18} color={BrandColors.textPrimary} />
        <Typography variant="body" style={styles.actionText}>Duplicate</Typography>
      </Pressable>

      {!role.isSystem && (
        <Pressable 
          style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
          onPress={() => { onClose(); onDelete(role); }}
        >
          <Feather name="trash-2" size={18} color="#d4183d" />
          <Typography variant="body" style={[styles.actionText, { color: '#d4183d' }]}>Delete</Typography>
        </Pressable>
      )}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
    borderRadius: Radius.md,
  },
  actionBtnPressed: {
    backgroundColor: '#F1F3F6',
  },
  actionText: {
    fontWeight: '500',
  },
});
