import { Alert } from 'react-native';

interface DeleteMemberDialogOptions {
  memberName: string;
  onConfirm: () => void;
}

export function showDeleteMemberDialog({
  memberName,
  onConfirm,
}: DeleteMemberDialogOptions) {
  Alert.alert(
    'Delete Member',
    `Are you sure you want to delete ${memberName}? This action cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
  );
}