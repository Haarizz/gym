import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Spacing } from '@/core/theme';
import { Button } from '@/shared/components/Button';
import { ScreenLayout } from '@/shared/layouts/ScreenLayout';
import { Typography } from '@/shared/components/Typography';
import { showDeleteMemberDialog } from '../components/DeleteMemberDialog';
import { CredentialsBottomSheet } from '../components/bottomSheets/CredentialsBottomSheet';
import { FamilyMemberBottomSheet } from '../components/bottomSheets/FamilyMemberBottomSheet';
import { FreezeMembershipBottomSheet } from '../components/bottomSheets/FreezeMembershipBottomSheet';
import { RenewMembershipBottomSheet } from '../components/bottomSheets/RenewMembershipBottomSheet';
import { AppAccessSection } from '../components/sections/AppAccessSection';
import { EmergencyContactSection } from '../components/sections/EmergencyContactSection';
import { FamilySection } from '../components/sections/FamilySection';
import { MedicalSection } from '../components/sections/MedicalSection';
import { MemberHeader } from '../components/sections/MemberHeader';
import { MembershipSection } from '../components/sections/MembershipSection';
import { PaymentSection } from '../components/sections/PaymentSection';
import { QuickActionsSection } from '../components/sections/QuickActionsSection';
import { useMembers } from '../../hooks/useMembers';
import { useMemberActions } from '../../hooks/useMemberActions';
import { useMemberFamily } from '../../hooks/useMemberFamily';
import type { Member } from '../../domain/Member';
import type { AddFamilyMemberRequest } from '../../application/family/MemberFamilyRepository';
import type {
  RenewalRequest,
  MinorRenewalRequest,
  FamilyRenewalRequest,
} from '../../application/membership/MemberMembershipRepository';
import type { FreezeRequest } from '../../application/freeze/MemberFreezeRepository';
import type { SetCredentialsRequest } from '../../application/access/MemberAccessRepository';

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
  const { selectedMember, loadMember } = useMembers();
  const {
    submitting,
    deleteMember,
    renewMember,
    renewMinor,
    renewFamily,
    freezeMember,
    unfreezeMember,
    setCredentials,
    toggleAccess,
  } = useMemberActions();

  const { family, loadingFamily, addFamilyMember: addFamilyMemberHook } =
    useMemberFamily(memberId);

  const [renewVisible, setRenewVisible] = useState(false);
  const [freezeVisible, setFreezeVisible] = useState(false);
  const [familyMemberVisible, setFamilyMemberVisible] = useState(false);
  const [credentialsVisible, setCredentialsVisible] = useState(false);

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

  const handleRenew = useCallback(
    async (
      id: number,
      request: RenewalRequest | MinorRenewalRequest | FamilyRenewalRequest,
    ) => {
      await renewMember(id, request);
      loadMember(id);
    },
    [renewMember, loadMember],
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
      await toggleAccess(selectedMember.id, enabled);
      loadMember(selectedMember.id);
    },
    [selectedMember, toggleAccess, loadMember],
  );

  if (!selectedMember) {
    return (
      <ScreenLayout>
        <View style={styles.loadingContainer}>
          <Typography variant="body" color="textSecondary">
            Loading...
          </Typography>
        </View>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MemberHeader member={selectedMember} />

        <MembershipSection member={selectedMember} />

        <PaymentSection member={selectedMember} />

        <MedicalSection member={selectedMember} />

        <EmergencyContactSection member={selectedMember} />

        <FamilySection
          member={selectedMember}
          family={family}
          onAddFamilyMember={() => setFamilyMemberVisible(true)}
          onSelectMember={onSelectFamilyMember}
        />

        <AppAccessSection
          member={selectedMember}
          onGrantAccess={() => setCredentialsVisible(true)}
          onDisableAccess={() => handleToggleAccess(false)}
          onResetCredentials={() => setCredentialsVisible(true)}
        />

        <QuickActionsSection
          onEdit={() => onEdit(selectedMember)}
          onRenew={() => setRenewVisible(true)}
          onFreeze={() => setFreezeVisible(true)}
          onDelete={handleDelete}
          isFrozen={selectedMember.isFrozen}
        />

        <Button label="Back" variant="secondary" onPress={onBack} size="lg" />
      </ScrollView>

      <RenewMembershipBottomSheet
        visible={renewVisible}
        member={selectedMember}
        onClose={() => setRenewVisible(false)}
        onRenew={handleRenew}
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

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});