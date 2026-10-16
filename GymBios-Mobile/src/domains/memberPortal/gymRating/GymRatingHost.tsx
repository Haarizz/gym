import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/shared/components/Toasts/toastStore';
import { useAuthStore } from '@/domains/auth';
import { useMemberTenantAccess } from '@/domains/discovery/hooks/useMembershipApprovalStatus';
import { RatingSheet } from '../ratings/RatingSheet';
import { GYM_RATING_TAGS, gymRatingApi, useGymRatingSheet, type MyGymRating } from './gymRating';

export const myGymRatingKey = ['myGymRating'] as const;

/**
 * Mounted once in the member area. Opens the gym rate sheet when the gym has asked the
 * member to rate it — on launch and whenever the app comes back to the foreground — and
 * whenever something calls openGymRatingSheet() (notification, push tap, profile hub).
 * Closing a requested sheet tells the backend, so it doesn't open by itself again.
 */
export function GymRatingHost() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isMember = useAuthStore((s) => s.appRole) === 'member';
  const hasTenantAccess = useMemberTenantAccess();
  const enabled = isMember && hasTenantAccess;

  const { data, refetch } = useQuery({
    queryKey: myGymRatingKey,
    queryFn: () => gymRatingApi.get(),
    enabled,
    retry: false,
  });

  const open = useGymRatingSheet((s) => s.open);
  const show = useGymRatingSheet((s) => s.show);
  const hide = useGymRatingSheet((s) => s.hide);

  const setData = (next: MyGymRating) => queryClient.setQueryData(myGymRatingKey, next);
  const rate = useMutation({ mutationFn: gymRatingApi.rate, onSuccess: setData });
  const dismiss = useMutation({ mutationFn: gymRatingApi.dismissPrompt, onSuccess: setData });

  // "The next time they open the app": re-check on every return to the foreground.
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [enabled, refetch]);

  // Open by itself once per pending request; closing it marks the request dismissed.
  const prompted = useRef(false);
  useEffect(() => {
    if (!data?.pendingRequest) {
      prompted.current = false;
    } else if (!prompted.current) {
      prompted.current = true;
      show();
    }
  }, [data?.pendingRequest, show]);

  const close = () => {
    hide();
    if (data?.pendingRequest && !dismiss.isPending) dismiss.mutate();
  };

  const mine = data?.myReview ?? null;

  return (
    <RatingSheet
      visible={open && !!data}
      title={t('gymRating.title', { name: data?.branchName ?? t('gymRating.gymFallback') })}
      subtitle={t('gymRating.subtitle')}
      tagOptions={GYM_RATING_TAGS}
      tagLabel={(tag) => t(`gymRating.tags.${tag}`)}
      initial={mine ? { rating: mine.rating, tags: mine.tags, comment: mine.comment ?? '', anonymous: mine.anonymous } : null}
      formKey={open && data ? `${data.branchId}:${mine?.updatedAt ?? ''}` : null}
      submitting={rate.isPending}
      onClose={close}
      onSubmit={(values) =>
        rate.mutate(values, {
          onSuccess: () => {
            toast.success(t('gymRating.posted'));
            hide();
          },
          onError: (err: any) => toast.error(err?.message || t('team.rate.failed')),
        })
      }
    />
  );
}
