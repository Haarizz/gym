import { useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { FormSection } from '@/shared/components/FormSection';
import { Typography } from '@/shared/components/Typography';
import { RELATIONSHIPS } from '@/domains/members/constants';
import type {
  DraftFamilyMember,
  MemberWizardData,
} from '@/domains/members/hooks/useMemberWizard';

interface FamilyStepProps {
  data: MemberWizardData;
  updateField: (field: keyof MemberWizardData, value: any) => void;
  addFamilyMember: (member: DraftFamilyMember) => void;
  removeFamilyMember: (index: number) => void;
}

export function FamilyStep({
  data,
  updateField,
  addFamilyMember,
  removeFamilyMember,
}: FamilyStepProps) {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Modal form state
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberRelationship, setMemberRelationship] = useState('SPOUSE');

  const isFamily = data.membershipType.toUpperCase() === 'FAMILY';

  const handleOpenModal = useCallback(() => {
    setMemberName('');
    setMemberEmail('');
    setMemberPhone('');
    setMemberRelationship('SPOUSE');
    setModalVisible(true);
  }, []);

  const handleAddMember = useCallback(() => {
    if (!memberName.trim()) return;
    addFamilyMember({
      name: memberName.trim(),
      email: memberEmail.trim(),
      phone: memberPhone.trim(),
      relationship: memberRelationship,
    });
    setModalVisible(false);
  }, [memberName, memberEmail, memberPhone, memberRelationship, addFamilyMember]);

  if (!isFamily) {
    return (
      <View style={styles.container}>
        <FormSection title="Family Configuration">
          <View style={styles.disabledContainer}>
            <Feather name="users" size={32} color={theme.textSecondary} />
            <Typography
              variant="body"
              color="textSecondary"
              style={styles.disabledText}
            >
              This member is not enrolled under a Family membership.
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Select "Family" as the Membership Type in Step 2 to configure
              family members.
            </Typography>
          </View>
        </FormSection>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FormSection title="Family Configuration">
        <View style={styles.switchRow}>
          <Typography variant="bodySmallBold">Is Family Head</Typography>
          <Switch
            value={data.isFamilyHead}
            onValueChange={(v) => updateField('isFamilyHead', v)}
            trackColor={{ false: theme.muted, true: theme.primary }}
            thumbColor={theme.backgroundElement}
          />
        </View>

        {!data.isFamilyHead ? (
          <Dropdown
            label="Relationship to Family Head"
            placeholder="Select relationship"
            value={data.relationshipToHead}
            options={RELATIONSHIPS}
            onChange={(v) => updateField('relationshipToHead', v)}
          />
        ) : null}

        {data.familyMembers.length > 0 ? (
          <View style={styles.memberList}>
            <Typography variant="bodySmallBold">Family Members</Typography>
            {data.familyMembers.map(
              (member: DraftFamilyMember, index: number) => (
                <View key={index} style={styles.memberCard}>
                  <View style={styles.memberInfo}>
                    <Typography variant="bodySmallBold">{member.name}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {member.relationship}
                      {member.phone ? ` • ${member.phone}` : ''}
                    </Typography>
                  </View>
                  <Button
                    label="Remove"
                    variant="ghost"
                    onPress={() => removeFamilyMember(index)}
                  />
                </View>
              ),
            )}
          </View>
        ) : null}

        <Button
          label="Add Family Member"
          variant="secondary"
          onPress={handleOpenModal}
        />
      </FormSection>

      <AppBottomSheet
        visible={modalVisible}
        title="Add Family Member"
        subtitle="Add a relative to this family membership"
        onClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBody}>
          <Input
            label="Full Name *"
            value={memberName}
            onChangeText={setMemberName}
            placeholder="Enter family member's name"
          />
          <Dropdown
            label="Relationship *"
            value={memberRelationship}
            options={RELATIONSHIPS}
            onChange={setMemberRelationship}
          />
          <Input
            label="Phone"
            value={memberPhone}
            onChangeText={setMemberPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
          <Input
            label="Email"
            value={memberEmail}
            onChangeText={setMemberEmail}
            placeholder="Enter email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            label="Add Member"
            onPress={handleAddMember}
            disabled={!memberName.trim()}
            size="lg"
          />
        </View>
      </AppBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  disabledContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    gap: Spacing.two,
  },
  disabledText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  memberList: {
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  memberCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    backgroundColor: '#f8fafc',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  modalBody: {
    gap: Spacing.three,
  },
});
