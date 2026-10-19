import { Alert } from 'react-native';
import i18n from '@/core/i18n/i18n';

interface DeleteMemberDialogOptions {
  memberName: string;
  onConfirm: () => void;
}

export function showDeleteMemberDialog({
  memberName,
  onConfirm,
}: DeleteMemberDialogOptions) {
  Alert.alert(
    i18n.t('members.dialogs.deleteTitle'),
    i18n.t('members.dialogs.deleteConfirm', { name: memberName }),
    [
      { text: i18n.t('members.dialogs.cancel'), style: 'cancel' },
      {
        text: i18n.t('members.dialogs.delete'),
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
  );
}