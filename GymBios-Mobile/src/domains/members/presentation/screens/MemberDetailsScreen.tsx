import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '@/core/hooks';
import { Spacing } from '@/core/theme';
import { AppHeader } from '@/shared/components/AppHeader';
import { ScreenLayout, useTabBarBottomInset } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';
import type { MembershipPlan } from '@/domains/membershipPlans';
import { PaymentBottomSheet, type PaymentResult } from '@/shared/payment';
import { showDeleteMemberDialog } from '../components/DeleteMemberDialog';
import { CredentialsBottomSheet } from '../components/bottomSheets/CredentialsBottomSheet';
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
import type { SetCredentialsRequest } from '../../application/access/MemberAccessRepository';
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
    setCredentials,
    toggleAccess,
  } = useMemberActions();

  // Only family memberships have a family group; asking for anyone else's just 404s.
  const isFamilyMember =
    selectedMember?.membershipType?.toUpperCase() === 'FAMILY' || !!selectedMember?.familyHeadId;
  const { family, addFamilyMember: addFamilyMemberHook } =
    useMemberFamily(memberId, isFamilyMember);

  const [renewVisible, setRenewVisible] = useState(false);
  const [freezeVisible, setFreezeVisible] = useState(false);
  const [familyMemberVisible, setFamilyMemberVisible] = useState(false);
  const [credentialsVisible, setCredentialsVisible] = useState(false);
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
          toast.error('Failed to delete member.', {
            title: 'Error'
          });
        }
      },
    });
  }, [selectedMember, deleteMember, onDeleted]);

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
        toast.success(`${selectedMember.name}'s membership was renewed.`, { title: 'Renewed' });
        loadMember(selectedMember.id).catch(() => {});
      } catch {
        // The API client already surfaced the server's message as a toast.
      } finally {
        setRenewing(false);
      }
    },
    [selectedMember, renewPlan, renewMember, renewMinor, loadMember],
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

  const handleSetCredentials = useCallback(
    async (id: number, request: SetCredentialsRequest) => {
      await setCredentials(id, request);
      loadMember(id);
    },
    [setCredentials, loadMember],
  );

  const handleToggleAccess = useCallback(
    async (enabled: boolean) => {
      if (!selectedMember) return;
      try {
        await toggleAccess(selectedMember.id, enabled);
        toast.success(enabled ? 'App access restored.' : 'App access blocked.');
        loadMember(selectedMember.id).catch(() => {});
      } catch {
        // Toasted by the API client.
      }
    },
    [selectedMember, toggleAccess, loadMember],
  );

  const header = (
    <AppHeader
      title="Member Details"
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
            Loading...
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
          onSetCredentials={() => setCredentialsVisible(true)}
          onToggleAccess={handleToggleAccess}
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
      />

      <FamilyMemberBottomSheet
        visible={familyMemberVisible}
        headId={selectedMember.id}
        onClose={() => setFamilyMemberVisible(false)}
        onAdd={handleAddFamilyMember}
      />

      <CredentialsBottomSheet
        visible={credentialsVisible}
        memberId={selectedMember.id}
        existingUsername={selectedMember.appUsername}
        onClose={() => setCredentialsVisible(false)}
        onSetCredentials={handleSetCredentials}
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