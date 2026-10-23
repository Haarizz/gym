import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Typography } from '@/shared/components';

import { useLinkRequests } from '../accountApi';
import { LinkRequestRow } from './LinkRequestRow';

/**
 * Mounted in the member layout: when a gym has asked to link a membership to this
 * account, ask right away instead of waiting for the person to find it in Account.
 * Dismissing hides it for this session; the requests stay in Account until they expire.
 */
export function PendingLinkRequestsSheet() {
  const { t } = useTranslation();
  const { data: requests } = useLinkRequests();
  const [dismissed, setDismissed] = useState(false);
  const visible = !dismissed && (requests?.length ?? 0) > 0;

  return (
    <AppBottomSheet
      visible={visible}
      title={t('account.linkRequestsTitle')}
      subtitle={t('account.linkRequestsHint')}
      onClose={() => setDismissed(true)}
    >
      <View style={styles.list}>
        {requests?.map((request) => (
          <LinkRequestRow key={request.id} request={request} />
        ))}
        <Typography variant="caption" color="textSecondary">{t('account.decideLater')}</Typography>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.three,
  },
});
