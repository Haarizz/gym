import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import type { Member } from '../../../domain/Member';
import type { FreezeRequest } from '../../../application/freeze/MemberFreezeRepository';

interface FreezeMembershipBottomSheetProps {
  visible: boolean;
  member: Member;
  onClose: () => void;
  onFreeze: (id: number, request: FreezeRequest) => Promise<void>;
  onUnfreeze: (id: number) => Promise<void>;
}

export function FreezeMembershipBottomSheet({
  visible,
  member,
  onClose,
  onFreeze,
  onUnfreeze,
}: FreezeMembershipBottomSheetProps) {
  const [freezeStartDate, setFreezeStartDate] = useState('');
  const [freezeEndDate, setFreezeEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleFreeze = useCallback(async () => {
    try {
      setSubmitting(true);
      await onFreeze(member.id, {
        freezeStartDate,
        freezeEndDate,
        reason: reason || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [freezeStartDate, freezeEndDate, reason, member.id, onFreeze, onClose]);

  const handleUnfreeze = useCallback(async () => {
    try {
      setSubmitting(true);
      await onUnfreeze(member.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [member.id, onUnfreeze, onClose]);

  return (
    <AppBottomSheet
      visible={visible}
      title={member.isFrozen ? 'Unfreeze Membership' : 'Freeze Membership'}
      subtitle={member.name}
      onClose={onClose}
    >
      <View style={styles.container}>
        {member.isFrozen ? (
          <Button
            label="Unfreeze Membership"
            onPress={handleUnfreeze}
            loading={submitting}
            size="lg"
          />
        ) : (
          <>
            <Input
              label="Freeze Start Date"
              value={freezeStartDate}
              onChangeText={setFreezeStartDate}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="Freeze Until"
              value={freezeEndDate}
              onChangeText={setFreezeEndDate}
              placeholder="YYYY-MM-DD"
            />
            <Input
              label="Reason"
              value={reason}
              onChangeText={setReason}
              placeholder="Optional reason"
            />
            <Button
              label="Freeze Membership"
              onPress={handleFreeze}
              loading={submitting}
              size="lg"
            />
          </>
        )}
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
});