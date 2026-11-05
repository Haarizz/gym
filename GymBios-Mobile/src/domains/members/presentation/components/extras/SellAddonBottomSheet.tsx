import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { ExtrasList, ExtrasPicker } from './ExtrasPicker';
import type { RegistrationExtra } from './extrasApi';

/**
 * Staff/admin: pick one add-on or facility access to sell to an existing member; payment is
 * taken next in the shared payment sheet (MemberDetailsScreen). Quick add lives in the New
 * Member wizard — a sheet can't reliably open another sheet on top of itself.
 */
export function SellAddonBottomSheet({ visible, memberName, onClose, onContinue }: {
  visible: boolean;
  memberName: string;
  onClose: () => void;
  onContinue: (item: RegistrationExtra) => void;
}) {
  const { t } = useTranslation();
  const [item, setItem] = useState<RegistrationExtra | null>(null);
  useEffect(() => { if (visible) setItem(null); }, [visible]);

  return (
    <AppBottomSheet
      visible={visible}
      title={t('members.extras.sellTitle')}
      subtitle={t('members.memberSubtitle', { name: memberName })}
      onClose={onClose}
      footer={
        <Button title={t('members.extras.sellBtn')} size="lg" disabled={!item} onPress={() => item && onContinue(item)} />
      }
    >
      <View style={styles.body}>
        <ExtrasPicker quickAdd={false} onPick={setItem} />
        <ExtrasList extras={item ? [item] : []} onRemove={() => setItem(null)} />
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.md },
});
