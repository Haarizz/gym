import { useTranslation } from 'react-i18next';
import { toast } from '@/shared/components/Toasts/toastStore';
import { RatingSheet } from '../../../ratings/RatingSheet';
import { tagsForRole, type TeamMember } from '../../domain/TeamMember';
import { useRateStaff, useStaffProfile } from '../../hooks/useTeam';

interface RateStaffSheetProps {
  /** The person being rated; null hides the sheet. */
  member: TeamMember | null;
  onClose: () => void;
}

/** Rate a staff member. Opens prefilled with the member's earlier rating — rating again replaces it. */
export function RateStaffSheet({ member, onClose }: RateStaffSheetProps) {
  const { t } = useTranslation();
  const staffId = member?.id ?? NaN;
  const { data: profile } = useStaffProfile(staffId);
  const rateStaff = useRateStaff(staffId);

  const myReview = profile?.staff.id === member?.id ? profile?.myReview : null;

  return (
    <RatingSheet
      visible={!!member}
      title={t('team.rate.title', { name: member?.name.split(' ')[0] ?? '' })}
      subtitle={member ? [member.role, member.department].filter(Boolean).join(' · ') : ''}
      tagOptions={tagsForRole(member?.role)}
      tagLabel={tag => t(`team.tags.${tag}`)}
      initial={myReview ? { rating: myReview.rating, tags: myReview.tags, comment: myReview.comment ?? '', anonymous: myReview.anonymous } : null}
      formKey={member ? `${member.id}:${myReview?.id ?? ''}:${myReview?.updatedAt ?? ''}` : null}
      submitting={rateStaff.isPending}
      onClose={onClose}
      onSubmit={values =>
        rateStaff.mutate(values, {
          onSuccess: () => {
            toast.success(t('team.rate.posted'));
            onClose();
          },
          onError: (err: any) => toast.error(err?.message || t('team.rate.failed')),
        })
      }
    />
  );
}
