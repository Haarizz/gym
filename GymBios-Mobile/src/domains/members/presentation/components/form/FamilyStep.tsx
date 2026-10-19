import { useCallback, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
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
        <FormCard icon="users" title={t('members.form.familyStep.title')}>
          <View style={styles.disabledContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSelected }]}>
              <Feather name="users" size={24} color={theme.textSecondary} />
            </View>
            <Typography
              variant="body"
              color="textSecondary"
              style={styles.disabledText}
            >
              {t('members.form.familyStep.notFamilyTitle')}
            </Typography>
            <Typography variant="caption" color="textSecondary" style={styles.centered}>
              {t('members.form.familyStep.notFamilyDesc')}
            </Typography>
          </View>
        </FormCard>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FormCard
        icon="users"
        title={t('members.form.familyStep.title')}
        description={t('members.form.familyStep.description')}
      >
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Typography variant="bodySmallBold">{t('members.form.familyStep.headLabel')}</Typography>
            <Typography variant="caption" color="textSecondary">
              {t('members.form.familyStep.headSub')}
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
            label={t('members.form.familyStep.relationLabel')}
            placeholder={t('members.form.familyStep.relationPlaceholder')}
            value={data.relationshipToHead}
            options={RELATIONSHIPS}
            onChange={(v) => updateField('relationshipToHead', v)}
          />
        ) : null}

        {data.familyMembers.length > 0 ? (
          <View style={styles.memberList}>
            <Typography variant="bodySmallBold">{t('members.form.familyStep.membersListTitle')}</Typography>
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
                    label={t('members.form.familyStep.removeBtn')}
                    variant="ghost"
                    onPress={() => removeFamilyMember(index)}
                  />
                </View>
              ),
            )}
          </View>
        ) : null}

        <Button
          label={t('members.form.familyStep.addMemberBtn')}
          variant="secondary"
          onPress={handleOpenModal}
        />
      </FormCard>

      <AppBottomSheet
        visible={modalVisible}
        title={t('members.form.familyStep.sheetTitle')}
        subtitle={t('members.form.familyStep.sheetSubtitle')}
        onClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBody}>
          <Input
            label={t('members.form.familyStep.nameReq')}
            value={memberName}
            onChangeText={setMemberName}
            placeholder={t('members.form.familyStep.namePlaceholder')}
          />
          <Dropdown
            label={t('members.form.familyStep.relationReq')}
            value={memberRelationship}
            options={RELATIONSHIPS}
            onChange={setMemberRelationship}
          />
          <Input
            label={t('members.form.familyStep.phoneLabel')}
            value={memberPhone}
            onChangeText={setMemberPhone}
            placeholder={t('members.form.familyStep.phonePlaceholder')}
            keyboardType="phone-pad"
          />
          <Input
            label={t('members.form.familyStep.emailLabel')}
            value={memberEmail}
            onChangeText={setMemberEmail}
            placeholder={t('members.form.familyStep.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            label={t('members.form.familyStep.addBtn')}
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
