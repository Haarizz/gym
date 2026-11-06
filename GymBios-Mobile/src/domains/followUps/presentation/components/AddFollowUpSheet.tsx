import Feather from '@expo/vector-icons/Feather';
import { format } from 'date-fns';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/core/hooks';
import { localizeOptions, translateValue } from '@/core/i18n/format';
import { BrandColors, Radius, Spacing } from '@/core/theme';
import { useStaff } from '@/domains/hr/presentation/hooks/useStaff';
import { useLeads } from '@/domains/leads/hooks/useLeads';
import { Button } from '@/shared/components/Button';
import { DatePicker } from '@/shared/components/DatePicker';
import { Dropdown } from '@/shared/components/Dropdown';
import { FormSheet, FormSheetSection } from '@/shared/components/FormSheet';
import { Input } from '@/shared/components/Input';
import { TimePicker } from '@/shared/components/TimePicker';
import { TrafficLightSelector } from '@/shared/components/TrafficLightSelector';
import { Typography } from '@/shared/components/Typography';
import type { FollowUp } from '../../domain/FollowUp';
import type { FollowUpRequest } from '../../domain/FollowUpRequest';

interface AddFollowUpSheetProps {
  visible: boolean;
  editingFollowUp?: FollowUp | null;
  onClose: () => void;
  onSubmit: (request: FollowUpRequest) => void;
  submitting?: boolean;
}

type FeatherName = ComponentProps<typeof Feather>['name'];

const TYPE_OPTIONS: { label: string; value: string; icon: FeatherName }[] = [
  { label: 'Call', value: 'call', icon: 'phone' },
  { label: 'Email', value: 'email', icon: 'mail' },
  { label: 'SMS', value: 'sms', icon: 'message-square' },
  { label: 'WhatsApp', value: 'whatsapp', icon: 'message-circle' },
  { label: 'In-App', value: 'in-app', icon: 'smartphone' },
  { label: 'Meeting', value: 'meeting', icon: 'users' },
  { label: 'Visit', value: 'visit', icon: 'map-pin' },
];

const DURATIONS = ['15', '30', '45', '60'];

type Priority = 'low' | 'medium' | 'high';

function formFromFollowUp(followUp?: FollowUp | null) {
  if (!followUp) {
    return {
      leadId: '',
      type: 'call',
      subject: '',
      priority: 'medium' as Priority,
      dueDate: new Date() as Date | null,
      scheduledTime: '',
      assignedStaff: '',
      estimatedDuration: '15',
      notes: '',
    };
  }
  return {
    leadId: String(followUp.leadId),
    type: followUp.type === 'in_app' ? 'in-app' : followUp.type,
    subject: followUp.subject || '',
    priority: ((followUp.priority as Priority) || 'medium') as Priority,
    dueDate: followUp.dueDate ? new Date(followUp.dueDate) : new Date(),
    scheduledTime: followUp.scheduledTime || '',
    assignedStaff: followUp.assignedStaff || '',
    estimatedDuration: followUp.estimatedDuration ? String(followUp.estimatedDuration) : '15',
    notes: followUp.notes || '',
  };
}

export function AddFollowUpSheet({
  visible,
  editingFollowUp,
  onClose,
  onSubmit,
  submitting = false,
}: AddFollowUpSheetProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isEdit = !!editingFollowUp;

  const { data: leadsData } = useLeads({ size: 100 });
  const { staff } = useStaff();

  const leadOptions = useMemo(
    () =>
      (leadsData?.leads ?? []).map(l => ({
        label: `${l.firstName} ${l.lastName}`.trim() + (l.phone ? ` (${l.phone})` : ''),
        value: String(l.id),
      })),
    [leadsData],
  );

  const staffOptions = useMemo(() => {
    const list = (staff || []).map(s => ({
      label: s.name ? `${s.name}${s.role ? ` (${translateValue('role', s.role)})` : ''}` : s.email,
      value: s.name || s.email,
    }));
    return [{ label: t('common.unassigned'), value: '' }, ...list];
  }, [staff, t]);

  const typeOptions = useMemo(() => {
    const labels = localizeOptions(TYPE_OPTIONS, 'channel');
    return TYPE_OPTIONS.map((opt, i) => ({ ...opt, label: labels[i]?.label ?? opt.label }));
  }, []);

  const [form, setForm] = useState(() => formFromFollowUp(editingFollowUp));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset whenever the sheet opens (or switches follow-up), so it never shows stale values.
  // Done during render rather than in an effect to avoid a flash of the old form.
  const openKey = visible ? String(editingFollowUp?.id ?? 'new') : null;
  const [lastOpenKey, setLastOpenKey] = useState(openKey);
  if (openKey !== lastOpenKey) {
    setLastOpenKey(openKey);
    if (openKey) {
      setForm(formFromFollowUp(editingFollowUp));
      setErrors({});
    }
  }

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  // Keep a non-standard saved duration selectable when editing.
  const durationOptions = useMemo(
    () =>
      form.estimatedDuration && !DURATIONS.includes(form.estimatedDuration)
        ? [...DURATIONS, form.estimatedDuration].sort((a, b) => Number(a) - Number(b))
        : DURATIONS,
    [form.estimatedDuration],
  );

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (!form.leadId) nextErrors.leadId = t('followUps.msg.selectMemberOrLead');
    if (!form.subject.trim()) nextErrors.subject = t('followUps.msg.subjectRequired');
    if (!form.dueDate) nextErrors.dueDate = t('followUps.msg.dueDateRequired');
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !form.dueDate) return;

    onSubmit({
      leadId: Number(form.leadId),
      type: form.type,
      subject: form.subject.trim(),
      priority: form.priority,
      // Local calendar date — toISOString() would shift it back a day in timezones ahead of UTC.
      dueDate: `${format(form.dueDate, 'yyyy-MM-dd')}T00:00:00`,
      scheduledTime: form.scheduledTime.trim() || undefined,
      assignedStaff: form.assignedStaff || undefined,
      estimatedDuration: form.estimatedDuration ? parseInt(form.estimatedDuration, 10) : 15,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <FormSheet
      visible={visible}
      title={isEdit ? t('followUps.form.editTitle') : t('followUps.form.addTitle')}
      subtitle={t('followUps.form.subtitle')}
      icon={isEdit ? 'edit-2' : 'calendar'}
      closeLabel={t('followUps.cancel')}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="outline"
            label={t('followUps.cancel')}
            onPress={onClose}
            disabled={submitting}
            style={styles.flex}
          />
          <Button
            label={isEdit ? t('common.saveChanges') : t('followUps.form.create')}
            onPress={handleSubmit}
            loading={submitting}
            style={styles.primaryButton}
          />
        </>
      }
    >
      {/* Who */}
      <FormSheetSection label={t('followUps.form.whoSection')} />
      <Dropdown
        label={t('followUps.memberLead')}
        required
        placeholder={t('followUps.selectLead')}
        value={form.leadId}
        options={leadOptions}
        onChange={v => update('leadId', v)}
        error={errors.leadId}
      />
      <Dropdown
        label={t('followUps.assignedStaff')}
        placeholder={t('followUps.selectStaff')}
        value={form.assignedStaff}
        options={staffOptions}
        onChange={v => update('assignedStaff', v)}
      />

      {/* What */}
      <FormSheetSection label={t('followUps.form.detailsSection')} />
      <Typography variant="bodySmallBold" style={[styles.fieldLabel, { color: theme.text }]}>
        {t('followUps.followUpType')}
      </Typography>
      <View style={styles.chips}>
        {typeOptions.map(opt => {
          const active = form.type === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => update('type', opt.value)}
              style={[
                styles.chip,
                {
                  borderColor: active ? BrandColors.teal : theme.border,
                  backgroundColor: active ? `${BrandColors.teal}1f` : theme.backgroundElement,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Feather name={opt.icon} size={14} color={active ? BrandColors.teal : theme.textSecondary} />
              <Typography
                variant="caption"
                style={{ color: active ? BrandColors.teal : theme.textSecondary, fontWeight: active ? '700' : '500' }}
              >
                {opt.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      <Input
        label={t('followUps.subjectRequired')}
        placeholder={t('followUps.subjectPlaceholder')}
        value={form.subject}
        onChangeText={v => update('subject', v)}
        error={errors.subject}
      />

      <TrafficLightSelector
        label={t('followUps.priority')}
        value={form.priority}
        onChange={v => update('priority', v)}
      />

      {/* When */}
      <FormSheetSection label={t('followUps.form.scheduleSection')} />
      <View style={styles.row}>
        <DatePicker
          label={t('followUps.dueDate')}
          required
          value={form.dueDate}
          onChange={d => update('dueDate', d)}
          error={errors.dueDate}
          style={styles.flex}
        />
        <TimePicker
          label={t('followUps.scheduledTime')}
          value={form.scheduledTime}
          onChange={v => update('scheduledTime', v)}
        />
      </View>

      <Typography variant="bodySmallBold" style={[styles.fieldLabel, { color: theme.text }]}>
        {t('followUps.durationMins')}
      </Typography>
      <View style={styles.chips}>
        {durationOptions.map(d => {
          const active = form.estimatedDuration === d;
          return (
            <Pressable
              key={d}
              onPress={() => update('estimatedDuration', d)}
              style={[
                styles.chip,
                styles.durationChip,
                {
                  borderColor: active ? BrandColors.teal : theme.border,
                  backgroundColor: active ? `${BrandColors.teal}1f` : theme.backgroundElement,
                },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
            >
              <Typography
                variant="caption"
                style={{ color: active ? BrandColors.teal : theme.textSecondary, fontWeight: active ? '700' : '500' }}
              >
                {t('followUps.form.minutes', { count: Number(d) })}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      {/* Notes */}
      <FormSheetSection label={t('followUps.form.notesSection')} />
      <Input
        placeholder={t('followUps.notesPlaceholder')}
        value={form.notes}
        onChangeText={v => update('notes', v)}
        multiline
        numberOfLines={3}
        style={styles.notes}
      />
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  primaryButton: {
    flex: 2,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  fieldLabel: {
    marginBottom: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.three,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  durationChip: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  notes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
