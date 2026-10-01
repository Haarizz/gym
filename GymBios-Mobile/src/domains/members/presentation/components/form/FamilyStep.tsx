import { useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/core/hooks';
import { Radius, Spacing } from '@/core/theme';
import { AppBottomSheet } from '@/shared/components/AppBottomSheet';
import { Button } from '@/shared/components/Button';
import { Dropdown } from '@/shared/components/Dropdown';
import { Input } from '@/shared/components/Input';
import { Typography } from '@/shared/components/Typography';
import { RELATIONSHIPS } from '@/domains/members/constants';
import type {
  DraftFamilyMember,
  MemberWizardData,
} from '@/domains/members/hooks/useMemberWizard';

import { FormCard } from './FormCard';

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

  const isFamily = data.membershipType?.toUpperCase() === 'FAMILY';

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
        <FormCard icon="users" title="Family">
          <View style={styles.disabledContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSelected }]}>
              <Feather name="users" size={24} color={theme.textSecondary} />
            </View>
            <Typography
              variant="body"
              color="textSecondary"
              style={styles.disabledText}
            >
              Not a family membership
            </Typography>
            <Typography variant="caption" color="textSecondary" style={styles.centered}>
              Nothing to set up here. Choose &quot;Family&quot; as the membership type
              in the previous step to link relatives.
            </Typography>
          </View>
        </FormCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FormCard icon="users" title="Family" description="Link this member to a family membership">
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Typography variant="bodySmallBold">Family head</Typography>
            <Typography variant="caption" color="textSecondary">
              The head pays for and manages the family plan
            </Typography>
          </View>
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
      </FormCard>

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
    paddingHorizontal: Spacing.three,
    gap: Spacing.md,
  },
  disabledContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.two,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
  switchText: {
    flex: 1,
    paddingRight: Spacing.md,
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
