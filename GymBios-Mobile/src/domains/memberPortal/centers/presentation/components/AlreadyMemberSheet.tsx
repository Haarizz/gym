import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GymMembership } from '@/domains/gymSwitcher/gymMembershipsApi';
import { openMembershipAt } from '@/domains/gymSwitcher/openMembership';
import { MembershipNoticeSheet } from './MembershipNoticeSheet';

export type ExistingMembership = Pick<GymMembership, 'tenantSlug' | 'branchId' | 'gymName' | 'branchName'>
  & Partial<Pick<GymMembership, 'status'>>;

interface AlreadyMemberSheetProps {
  visible: boolean;
  /** The center the member tried to buy at. */
  centerName: string;
  centerBranchId: number;
  membership: ExistingMembership | null;
  /** The server refused a purchase that may already have been paid for — say it's refunded. */
  afterRefusedPayment?: boolean;
  onClose: () => void;
}

/**
 * The member already holds a membership at this gym. A second one isn't bought here:
 * at the same branch they renew or change plan from Subscriptions; at another branch of
 * the same gym it isn't available yet (pending the branch decision in
 * docs/mobile-multi-membership-switcher-plan.md).
 */
export function AlreadyMemberSheet({
  visible,
  centerName,
  centerBranchId,
  membership,
  afterRefusedPayment,
  onClose,
}: AlreadyMemberSheetProps) {
  const { t } = useTranslation();
  const [opening, setOpening] = useState(false);
  if (!membership) return null;

  // A cancelled member rejoins at the desk on their old record — no second membership here.
  const cancelled = membership.status === 'CANCELLED';
  const otherBranch = !cancelled && membership.branchId != null && membership.branchId !== centerBranchId;
  const gym = membership.gymName;
  let body = cancelled
    ? t('centers.membership.cancelledBody', { gym })
    : otherBranch
    ? t('centers.membership.otherBranchBody', {
        gym,
        branch: membership.branchName || gym,
        center: centerName,
      })
    : t('centers.membership.alreadyBody', { gym });
  if (afterRefusedPayment) body += `\n\n${t('centers.membership.refunded')}`;

  const open = async () => {
    setOpening(true);
    try {
      await openMembershipAt(membership);
      onClose();
    } finally {
      setOpening(false);
    }
  };

  return (
    <MembershipNoticeSheet
      visible={visible}
      icon="user-check"
      title={cancelled ? t('centers.membership.cancelledTitle')
        : otherBranch ? t('centers.membership.otherBranchTitle') : t('centers.membership.alreadyTitle')}
      body={body}
      primaryLabel={t('centers.membership.openSubscription')}
      onPrimary={open}
      primaryBusy={opening}
      secondaryLabel={t('centers.membership.notNow')}
      onClose={onClose}
    />
  );
}
