import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { router, type Href } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';

import { BrandColors, Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Typography } from '@/shared/components';

import { useMyGymMemberships, type GymMembership } from '../gymMembershipsApi';
import { useGymSwitch } from '../useGymSwitch';
import { GymMembershipList } from './GymMembershipList';

// Let the sheet's modal finish closing before the screen underneath changes.
const SHEET_DISMISS_DELAY_MS = 300;

const CENTERS_HREF = '/(member)/centers' as Href;

interface GymSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

/** Lists the member's gyms; picking another one switches the app to it and opens its home. */
export function GymSwitcherSheet({ visible, onClose }: GymSwitcherSheetProps) {
  const { t } = useTranslation();
  const { data: gyms = [] } = useMyGymMemberships();
  const { activeTenant, pendingTenant, select } = useGymSwitch();

  const handleSelect = (gym: GymMembership) => {
    onClose();
    if (gym.tenantSlug === activeTenant) return;
    setTimeout(() => {
      select(gym);
    }, SHEET_DISMISS_DELAY_MS);
  };

  const handleJoinAnother = () => {
    onClose();
    setTimeout(() => router.push(CENTERS_HREF), SHEET_DISMISS_DELAY_MS);
  };

  return (
    <AppBottomSheet
      visible={visible}
      title={t('gymSwitcher.sheetTitle')}
      subtitle={t('gymSwitcher.sheetSubtitle')}
      onClose={onClose}
    >
      <View style={styles.content}>
        <GymMembershipList
          gyms={gyms}
          activeTenant={activeTenant}
          pendingTenant={pendingTenant}
          onSelect={handleSelect}
        />
        <Pressable
          onPress={handleJoinAnother}
          style={({ pressed }) => [styles.joinRow, pressed && styles.joinPressed]}
          accessibilityRole="button"
        >
          <Feather name="plus-circle" size={18} color={BrandColors.teal} />
          <Typography style={styles.joinText}>{t('gymSwitcher.joinAnother')}</Typography>
        </Pressable>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(50,127,116,0.45)',
  },
  joinPressed: {
    opacity: 0.8,
  },
  joinText: {
    color: BrandColors.teal,
    fontWeight: '700',
  },
});
