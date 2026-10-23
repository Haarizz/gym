import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatDate } from '@/core/i18n';
import { Spacing } from '@/core/theme';
import { Button, Typography } from '@/shared/components';
import { toast } from '@/shared/components/Toasts/toastStore';

import { useAccountMutations, type LinkRequest } from '../accountApi';

/**
 * One gym asking to link its member record to this account. Accepting links it and
 * switches the app to that gym; declining tells the gym no. Nothing is linked without
 * the accept here.
 */
export function LinkRequestRow({ request, onDone }: { request: LinkRequest; onDone?: () => void }) {
  const { t } = useTranslation();
  const { acceptLink, declineLink } = useAccountMutations();
  const gym = request.gymName ?? request.tenantSlug;
  const busy = acceptLink.isPending || declineLink.isPending;

  return (
    <View style={styles.row}>
      <Typography style={styles.gym}>{gym}</Typography>
      <Typography variant="caption" color="textSecondary">
        {request.memberName
          ? t('account.linkRequestFor', { name: request.memberName })
          : t('account.linkRequestGeneric')}
        {request.expiresAt ? ` · ${t('account.linkRequestExpires', { date: formatDate(request.expiresAt, 'PP') })}` : ''}
      </Typography>
      <View style={styles.actions}>
        <Button
          label={t('account.accept')}
          size="md"
          loading={acceptLink.isPending}
          disabled={busy}
          style={styles.action}
          onPress={() => acceptLink.mutate(request, {
            onSuccess: () => {
              toast.success(t('account.linked', { gym }));
              onDone?.();
            },
          })}
        />
        <Button
          label={t('account.decline')}
          size="md"
          variant="outline"
          loading={declineLink.isPending}
          disabled={busy}
          style={styles.action}
          onPress={() => declineLink.mutate(request, {
            onSuccess: () => {
              toast.success(t('account.declined', { gym }));
              onDone?.();
            },
          })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  gym: {
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
