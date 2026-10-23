import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout, useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';
import type { MembershipPlan } from '@/domains/membershipPlans';
import { PaymentBottomSheet, type PaymentResult } from '@/shared/payment';
import { showDeleteMemberDialog } from '../components/DeleteMemberDialog';
import { CredentialsBottomSheet } from '../components/bottomSheets/CredentialsBottomSheet';
import { LinkAccountBottomSheet } from '../components/bottomSheets/LinkAccountBottomSheet';
import { useMemberAppAccount } from '../../hooks/useMemberAppAccount';
import { SuspendMembershipBottomSheet } from '../components/bottomSheets/SuspendMembershipBottomSheet';
import { FamilyMemberBottomSheet } from '../components/bottomSheets/FamilyMemberBottomSheet';
import { FreezeMembershipBottomSheet } from '../components/bottomSheets/FreezeMembershipBottomSheet';
import {
  RenewMembershipBottomSheet,
  planPrice,
} from '../components/bottomSheets/RenewMembershipBottomSheet';
import { AppAccessSection } from '../components/sections/AppAccessSection';
import { ContactSection } from '../components/sections/ContactSection';
import { FamilySection } from '../components/sections/FamilySection';
import { MedicalSection } from '../components/sections/MedicalSection';
import { MemberHeader } from '../components/sections/MemberHeader';
import { MembershipSection } from '../components/sections/MembershipSection';
import { useMembers } from '../../hooks/useMembers';
import { useMemberActions } from '../../hooks/useMemberActions';
import { useMemberFamily } from '../../hooks/useMemberFamily';
import type { Member } from '../../domain/Member';
import type { AddFamilyMemberRequest } from '../../application/family/MemberFamilyRepository';
import type { FreezeRequest } from '../../application/freeze/MemberFreezeRepository';
import { toRenewalPayment } from '../utils/renewalPayment';

import { toast } from '@/shared/components/Toasts/toastStore';

interface MemberDetailsScreenProps {
  memberId: number;
  onBack: () => void;
  onEdit: (member: Member) => void;
  onSelectFamilyMember: (memberId: number) => void;
  onDeleted: () => void;
}

export function MemberDetailsScreen({
  memberId,
  onBack,
  onEdit,
  onSelectFamilyMember,
  onDeleted,
}: MemberDetailsScreenProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const tabBarInset = useTabBarBottomInset();
  const { selectedMember, loadMember } = useMembers();
  const {
    submitting,
    deleteMember,
    renewMember,
    renewMinor,
    freezeMember,
    unfreezeMember,
    getFreezeAllowance,
    setMembershipSuspended,
  } = useMemberActions();

  // Only family memberships have a family group; asking for anyone else's just 404s.
  const isFamilyMember =
    selectedMember?.membershipType?.toUpperCase() === 'FAMILY' || !!selectedMember?.familyHeadId;
  const { family, addFamilyMember: addFamilyMemberHook } =
    useMemberFamily(memberId, isFamilyMember);
  const { account, createAccount, requestLink, cancelLink } = useMemberAppAccount(memberId);

  const [renewVisible, setRenewVisible] = useState(false);
  const [freezeVisible, setFreezeVisible] = useState(false);
  const [familyMemberVisible, setFamilyMemberVisible] = useState(false);
  const [createAccountVisible, setCreateAccountVisible] = useState(false);
  const [linkVisible, setLinkVisible] = useState(false);
  const [suspendVisible, setSuspendVisible] = useState(false);
  // Plan chosen in the renew sheet, awaiting payment in the shared payment sheet.
  const [renewPlan, setRenewPlan] = useState<MembershipPlan | null>(null);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    loadMember(memberId).catch(() => { });
  }, [memberId, loadMember]);


  const handleDelete = useCallback(() => {
    if (!selectedMember) return;
    showDeleteMemberDialog({
      memberName: selectedMember.name,
      onConfirm: async () => {
        try {
          await deleteMember(selectedMember.id);
          onDeleted();
        } catch {
          toast.error(t('members.details.deleteErrorMsg'), {
            title: t('members.details.deleteErrorTitle')
          });
        }
      },
    });
  }, [selectedMember, deleteMember, onDeleted, t]);

  const handleContinueToPayment = useCallback((plan: MembershipPlan) => {
    setRenewPlan(plan);
    setRenewVisible(false);
    // Let the renew sheet finish its close animation before the next modal mounts —
    // presenting a Modal while another is dismissing is dropped on iOS.
    setTimeout(() => setPaymentVisible(true), 300);
  }, []);

  const handleRenewalPayment = useCallback(
    async (result: PaymentResult) => {
      if (!selectedMember || !renewPlan) return;
      const payment = toRenewalPayment(result);
      const fee = planPrice(renewPlan);
      try {
        setRenewing(true);
        // Members billed to their family head carry no balance of their own, so they renew
        // through the guardian-billed endpoint (same routing as the web admin's renewal).
        const billedToGuardian =
          selectedMember.isMinor ||
          selectedMember.billedToHead ||
          selectedMember.familyRole?.toUpperCase() === 'MINOR';
        if (billedToGuardian) {
          await renewMinor(selectedMember.id, {
            ...payment,
            planName: renewPlan.name,
            fee,
            paidAmount: payment.amountReceived,
          });
        } else {
          await renewMember(selectedMember.id, {
            ...payment,
            planName: renewPlan.name,
            membershipFee: fee,
            membershipType: renewPlan.planType || undefined,
            membershipStatus: 'active',
          });
        }
        setPaymentVisible(false);
        setRenewPlan(null);
        toast.success(t('members.details.renewedMsg', { name: selectedMember.name }), { title: t('members.details.renewedTitle') });
        loadMember(selectedMember.id).catch(() => {});
      } catch {
        // The API client already surfaced the server's message as a toast.
      } finally {
        setRenewing(false);
      }
    },
    [selectedMember, renewPlan, renewMember, renewMinor, loadMember, t],
  );

  const handleFreeze = useCallback(
    async (id: number, request: FreezeRequest) => {
      await freezeMember(id, request);
      loadMember(id);
    },
    [freezeMember, loadMember],
  );

  const handleUnfreeze = useCallback(
    async (id: number) => {
      await unfreezeMember(id);
      loadMember(id);
    },
    [unfreezeMember, loadMember],
  );

  const handleAddFamilyMember = useCallback(
    async (headId: number, request: AddFamilyMemberRequest) => {
      await addFamilyMemberHook(headId, request);
    },
    [addFamilyMemberHook],
  );

  // The member's own GymBios account (replaces an old gym-only login, if any).
  const handleCreateAccount = useCallback(
    async (username: string, password: string) => {
      if (!selectedMember) return;
      await createAccount(username, password);
      toast.success(t('members.details.accountCreatedToast'));
      loadMember(selectedMember.id).catch(() => {});
    },
    [selectedMember, createAccount, loadMember, t],
  );

  const handleRequestLink = useCallback(
    async (identifier: string) => {
      await requestLink(identifier);
      toast.success(t('members.details.linkRequestedToast'));
    },
    [requestLink, t],
  );

  const handleCancelLink = useCallback(async () => {
    try {
      await cancelLink();
      toast.success(t('members.details.linkCancelledToast'));
    } catch {
      // Toasted by the API client.
    }
  }, [cancelLink, t]);

  const handleSetSuspended = useCallback(
    async (suspended: boolean, reason?: string) => {
      if (!selectedMember) return;
      try {
        await setMembershipSuspended(selectedMember.id, suspended, reason);
        toast.success(suspended ? t('members.details.membershipSuspendedToast') : t('members.details.membershipResumedToast'));
        loadMember(selectedMember.id).catch(() => {});
      } catch {
        // Toasted by the API client.
      }
    },
    [selectedMember, setMembershipSuspended, loadMember, t],
  );

  const header = (
    <AppHeader
      title={t('members.details.title')}
      colors={[theme.primary, theme.primary]}
      onBack={onBack}
    />
  );

  if (!selectedMember) {
    return (
      <ScreenLayout edges={TAB_SCREEN_EDGES}>
        {header}
        <View style={styles.loadingContainer}>
          <Typography variant="body" color="textSecondary">
            {t('members.details.loading')}
          </Typography>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout edges={TAB_SCREEN_EDGES}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarInset + Spacing.four }]}
        showsVerticalScrollIndicator={false}
      >
        <MemberHeader
          member={selectedMember}
          onEdit={() => onEdit(selectedMember)}
          onRenew={() => setRenewVisible(true)}
          onFreeze={() => setFreezeVisible(true)}
          onDelete={handleDelete}
        />

        <MembershipSection member={selectedMember} />

        <ContactSection member={selectedMember} />

        <FamilySection
          member={selectedMember}
          family={family}
          onAddFamilyMember={() => setFamilyMemberVisible(true)}
          onSelectMember={onSelectFamilyMember}
        />

        <AppAccessSection
          member={selectedMember}
          account={account}
          onCreateAccount={() => setCreateAccountVisible(true)}
          onLinkAccount={() => setLinkVisible(true)}
          onCancelLink={handleCancelLink}
          onSetSuspended={(suspended) => (suspended ? setSuspendVisible(true) : handleSetSuspended(false))}
          busy={submitting}
        />

        <MedicalSection member={selectedMember} />
      </ScrollView>

      <RenewMembershipBottomSheet
        visible={renewVisible}
        member={selectedMember}
        onClose={() => setRenewVisible(false)}
        onContinue={handleContinueToPayment}
      />

      <PaymentBottomSheet
        visible={paymentVisible}
        amount={renewPlan ? planPrice(renewPlan) : 0}
        title={renewPlan ? `Renewal · ${renewPlan.name}` : 'Renewal'}
        subtitle={`Member: ${selectedMember.name}`}
        // The plan's offer is already in its price; reward passes aren't supported here yet.
        allowDiscount={false}
        isProcessing={renewing}
        onClose={() => {
          if (!renewing) setPaymentVisible(false);
        }}
        onComplete={handleRenewalPayment}
      />

      <FreezeMembershipBottomSheet
        visible={freezeVisible}
        member={selectedMember}
        onClose={() => setFreezeVisible(false)}
        onFreeze={handleFreeze}
        onUnfreeze={handleUnfreeze}
        loadAllowance={getFreezeAllowance}
      />

      <FamilyMemberBottomSheet
        visible={familyMemberVisible}
        headId={selectedMember.id}
        onClose={() => setFamilyMemberVisible(false)}
        onAdd={handleAddFamilyMember}
      />

      <CredentialsBottomSheet
        visible={createAccountVisible}
        memberEmail={selectedMember.email && !selectedMember.email.includes('@family.local') ? selectedMember.email : undefined}
        onClose={() => setCreateAccountVisible(false)}
        onSubmit={handleCreateAccount}
      />

      <LinkAccountBottomSheet
        visible={linkVisible}
        onClose={() => setLinkVisible(false)}
        onSubmit={handleRequestLink}
      />

      <SuspendMembershipBottomSheet
        visible={suspendVisible}
        memberName={selectedMember.name}
        onClose={() => setSuspendVisible(false)}
        onSuspend={(reason) => handleSetSuspended(true, reason)}
      />
    </ScreenLayout>
  );
}

// RoleTabsLayout already pads the top inset; the floating tab bar is cleared via padding.
const TAB_SCREEN_EDGES = ['left', 'right'] as const;

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});